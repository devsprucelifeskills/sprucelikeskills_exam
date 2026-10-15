import express from "express";
import { Course, Batch, Event } from "../model/authDbModels.js";
import Exam from "../model/exam.model.js";
import ExamResult from "../model/examResult.model.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import mongoose from "mongoose";

import multer from "multer";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

// Multer setup for file upload (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to ensure user is admin or trainer
const isManager = (req, res, next) => {
    if (req.user && (req.user.role === "admin" || req.user.role === "trainer")) {
        next();
    } else {
        res.status(403).json({ success: false, message: "Access denied. Managers only." });
    }
};

// Deterministic PRNG (Mulberry32) for reproducible question sampling per student
const getDeterministicRng = (seedStr) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < seedStr.length; i++) {
        h = Math.imul(h ^ seedStr.charCodeAt(i), 0x01000193);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
        h = Math.imul(h ^ (h >>> 15), 0xcaf649a9);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
};

/**
 * Deterministically samples and shuffles questions for a specific student.
 * If isMockExam is true and questionsPerStudent is set (> 0 and < pool size),
 * it returns exactly `questionsPerStudent` questions randomly selected from the pool.
 * If questionsPerStudent is 0 or >= pool size, all questions are returned shuffled.
 */
const getStudentAssignedQuestions = (exam, studentId) => {
    const totalQuestions = exam.questions.length;
    const indices = Array.from({ length: totalQuestions }, (_, i) => i);
    const rng = getDeterministicRng(`${studentId}_${exam._id}`);

    // Fisher-Yates shuffle of indices using student+exam deterministic seed
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    let selectedIndices = indices;
    if ((exam.isMockExam || exam.is_mock) && exam.questionsPerStudent > 0 && exam.questionsPerStudent < totalQuestions) {
        selectedIndices = indices.slice(0, exam.questionsPerStudent);
    }

    return selectedIndices.map(origIdx => {
        const q = exam.questions[origIdx];
        return {
            id: origIdx, // keeps track of the original index in exam.questions for evaluation
            text: q.text,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            marks: q.marks,
            image: q.image
        };
    });
};

// 0. Fetch All Exams for Admin (supports filtering by ?type=mock or ?type=actual)
router.get("/admin/all", isAuthenticated, isManager, async (req, res) => {
    try {
        const { type } = req.query;
        const query = { createdBy: req.user.id };

        if (type === "mock") {
            query.$or = [{ isMockExam: true }, { is_mock: true }];
        } else if (type === "actual") {
            query.isMockExam = { $ne: true };
            query.is_mock = { $ne: true };
        }

        const exams = await Exam.find(query).sort({ createdAt: -1 });
        res.json({ success: true, exams });
    } catch (err) {
        console.error("Error fetching all exams:", err);
        res.status(500).json({ success: false, message: "Failed to fetch exams" });
    }
});

// 0. Upload Image to Cloudinary
router.post("/admin/upload-image", isAuthenticated, isManager, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file uploaded" });
        }

        // Convert buffer to base64
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = "data:" + req.file.mimetype + ";base64," + b64;

        const result = await cloudinary.uploader.upload(dataURI, {
            folder: "spruce_exam_images",
        });

        res.json({ success: true, imageUrl: result.secure_url });
    } catch (err) {
        console.error("Error uploading to Cloudinary:", err);
        res.status(500).json({ success: false, message: "Failed to upload image" });
    }
});

// 0. Parse PDF for Questions
router.post("/admin/parse-pdf", isAuthenticated, isManager, upload.single("pdf"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No PDF file uploaded" });
        }

        const data = await pdf(req.file.buffer);
        const text = data.text;

        // More robust parsing logic
        // We look for patterns like "1. Question?" or "Q1. Question?"
        // Then options like "A) Option" or "a. Option"
        // Then answers like "Answer: A" or "Correct: B"

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const questions = [];
        let currentQuestion = null;

        const questionRegex = /^(?:\d+[\.\)]|Q\d+[\.\)])\s*(.+)/i;
        const optionRegex = /^([A-D])[\.\)]\s*(.+)/i;
        const answerRegex = /^(?:Answer|Correct|Correct Answer|Ans)[:\s]+([A-D])/i;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            const qMatch = line.match(questionRegex);
            if (qMatch) {
                if (currentQuestion && currentQuestion.text && currentQuestion.options.length >= 2) {
                    questions.push(currentQuestion);
                }
                currentQuestion = {
                    text: qMatch[1],
                    options: [],
                    correctOptionIndex: 0
                };
                continue;
            }

            const oMatch = line.match(optionRegex);
            if (oMatch && currentQuestion) {
                currentQuestion.options.push(oMatch[2]);
                continue;
            }

            const aMatch = line.match(answerRegex);
            if (aMatch && currentQuestion) {
                const letter = aMatch[1].toUpperCase();
                currentQuestion.correctOptionIndex = letter.charCodeAt(0) - 65; // A=0, B=1, etc.
                continue;
            }

            // If it's a continuing line of a question
            if (currentQuestion && !oMatch && !aMatch && currentQuestion.options.length === 0) {
                currentQuestion.text += " " + line;
            }
        }

        // Push last question
        if (currentQuestion && currentQuestion.text && currentQuestion.options.length >= 2) {
            questions.push(currentQuestion);
        }

        if (questions.length === 0) {
            return res.status(400).json({ success: false, message: "No questions could be parsed. Ensure the PDF follows a standard format (1. Question, A) Option, Answer: A)" });
        }

        res.json({ success: true, questions });
    } catch (err) {
        console.error("Error parsing PDF:", err);
        res.status(500).json({ success: false, message: "Failed to parse PDF" });
    }
});

// ─────────────────────────────────────────────
// MANAGER ROUTES (must come BEFORE /:id wildcard)
// ─────────────────────────────────────────────

// 1. Fetch Courses for dropdown
router.get("/courses", isAuthenticated, isManager, async (req, res) => {
    try {
        const courses = await Course.find({}, "title _id").lean();
        res.json({ success: true, courses });
    } catch (err) {
        console.error("Error fetching courses:", err);
        res.status(500).json({ success: false, message: "Failed to fetch courses" });
    }
});

// 1b. Fetch Events (hasTest: true) for dropdown
router.get("/events", isAuthenticated, isManager, async (req, res) => {
    try {
        const events = await Event.find({ hasTest: true }, "title _id").lean();
        res.json({ success: true, events });
    } catch (err) {
        console.error("Error fetching events:", err);
        res.status(500).json({ success: false, message: "Failed to fetch events" });
    }
});

// Helper to validate MongoDB ObjectIds
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// 2. Fetch Batches for a specific course
router.get("/batches/:courseId", isAuthenticated, isManager, async (req, res) => {
    try {
        const { courseId } = req.params;
        if (!isValidObjectId(courseId)) {
            return res.status(400).json({ success: false, message: "Invalid Course ID" });
        }

        const batches = await Batch.find({ courseId }, "name _id students")
            .populate("students", "name email")
            .lean();
        res.json({ success: true, batches });
    } catch (err) {
        console.error("Error fetching batches:", err);
        res.status(500).json({ success: false, message: "Failed to fetch batches" });
    }
});

// 3. Create a new Exam
router.post("/create", isAuthenticated, isManager, async (req, res) => {
    const {
        title, description, duration, courseId, batchIds,
        allowedStudents, passingScore, totalMarks, questions, startTime, isPublic, enableAntiCheating, eventId,
        isMockExam, is_mock, isInterviewPrep, questionsPerStudent
    } = req.body;

    try {
        if (!title || !questions || questions.length === 0) {
            return res.status(400).json({ success: false, message: "Missing required fields or questions" });
        }

        const isMock = !!(is_mock !== undefined ? is_mock : isMockExam);

        // Event-gated exam or Mock Exam: no specific batch/student required
        // Non-public + non-event + non-mock: course, batch and at least one student are required
        if (!isPublic && !eventId && !isMock) {
            if (!courseId || !batchIds || batchIds.length === 0 || !allowedStudents || allowedStudents.length === 0) {
                return res.status(400).json({ success: false, message: "Please select a course, at least one batch, and at least one student." });
            }
        }

        const start = startTime ? new Date(startTime) : new Date();
        const end = new Date(start.getTime() + (duration || 60) * 60000);

        const newExam = await Exam.create({
            title,
            description,
            duration: duration || 60,
            startTime: start,
            endTime: end,
            eventId: eventId || null,
            courseId: (isPublic || eventId) && !isMock ? undefined : courseId,
            batchIds: (isPublic || eventId || isMock) ? (batchIds || []) : batchIds,
            allowedStudents: (isPublic || eventId || isMock) ? (allowedStudents || []) : allowedStudents,
            passingScore,
            totalMarks,
            questions,
            isPublic: isMock ? true : !!isPublic,
            isMockExam: isMock,
            is_mock: isMock,
            isInterviewPrep: isMock ? !!isInterviewPrep : false,
            questionsPerStudent: isMock ? (Math.max(0, Number(questionsPerStudent)) || 0) : 0,
            enableAntiCheating: !!enableAntiCheating,
            createdBy: req.user.id
        });

        res.status(201).json({ success: true, message: "Exam created successfully", exam: newExam });
    } catch (err) {
        console.error("Error creating exam:", err);
        res.status(500).json({ success: false, message: "Failed to create exam" });
    }
});


// 4. Update an Exam
router.put("/admin/:id", isAuthenticated, isManager, async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid Exam ID" });
        }

        const {
            title, description, duration, courseId, batchIds,
            allowedStudents, passingScore, totalMarks, questions, startTime, isPublic, enableAntiCheating, eventId,
            isMockExam, is_mock, isInterviewPrep, questionsPerStudent
        } = req.body;

        const isMock = !!(is_mock !== undefined ? is_mock : isMockExam);
        const start = startTime ? new Date(startTime) : new Date();
        const end = new Date(start.getTime() + (duration || 60) * 60000);

        const updatedExam = await Exam.findByIdAndUpdate(id, {
            title,
            description,
            duration: duration || 60,
            startTime: start,
            endTime: end,
            eventId: eventId || null,
            courseId: (isPublic && !isMock) ? undefined : courseId,
            batchIds: (isPublic || isMock) ? [] : (batchIds || []),
            allowedStudents: (isPublic || isMock) ? [] : (allowedStudents || []),
            passingScore,
            totalMarks,
            questions,
            isPublic: isMock ? true : !!isPublic,
            isMockExam: isMock,
            is_mock: isMock,
            isInterviewPrep: isMock ? !!isInterviewPrep : false,
            questionsPerStudent: isMock ? (Math.max(0, Number(questionsPerStudent)) || 0) : 0,
            enableAntiCheating: !!enableAntiCheating
        }, { new: true });


        if (!updatedExam) {
            return res.status(404).json({ success: false, message: "Exam not found" });
        }

        res.json({ success: true, message: "Exam updated successfully", exam: updatedExam });
    } catch (err) {
        console.error("Error updating exam:", err);
        res.status(500).json({ success: false, message: "Failed to update exam" });
    }
});


// 4. Admin/Trainer View All Results
router.get("/admin/results", isAuthenticated, isManager, async (req, res) => {
    try {
        const results = await ExamResult.find({})
            .populate("examId", "title")
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, results });
    } catch (err) {
        console.error("Error fetching admin results:", err);
        res.status(500).json({ success: false, message: "Failed to fetch results" });
    }
});

// 5. Admin — Get all exams for a specific batch (dual-query: by batchId OR by student results)
router.get("/admin/exams-by-batch/:batchId", isAuthenticated, isManager, async (req, res) => {
    try {
        const { batchId } = req.params;
        if (!isValidObjectId(batchId)) {
            return res.status(400).json({ success: false, message: "Invalid Batch ID" });
        }

        // Primary: exams directly assigned to this batch
        const examsByBatch = await Exam.find({ batchIds: batchId })
            .select("title description duration passingScore totalMarks isActive createdAt")
            .sort({ createdAt: -1 })
            .lean();

        // Secondary: find exams where students from this batch have submitted results
        const batch = await Batch.findById(req.params.batchId).select("students").lean();
        const studentIds = batch?.students || [];

        let examsByResults = [];
        if (studentIds.length > 0) {
            const distinctExamIds = await ExamResult.distinct("examId", { studentId: { $in: studentIds } });
            if (distinctExamIds.length > 0) {
                examsByResults = await Exam.find({ _id: { $in: distinctExamIds } })
                    .select("title description duration passingScore totalMarks isActive createdAt")
                    .lean();
            }
        }

        // Merge and deduplicate
        const allExams = [...examsByBatch];
        const seenIds = new Set(examsByBatch.map(e => e._id.toString()));
        for (const exam of examsByResults) {
            if (!seenIds.has(exam._id.toString())) {
                allExams.push(exam);
            }
        }
        allExams.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json({ success: true, exams: allExams });
    } catch (err) {
        console.error("Error fetching exams by batch:", err);
        res.status(500).json({ success: false, message: "Failed to fetch exams" });
    }
});

// 6. Admin — Download exam results as JSON (with optional date range filter)
router.get("/admin/exam-results/:examId/json", isAuthenticated, isManager, async (req, res) => {
    try {
        const { examId } = req.params;
        const { startDate, endDate } = req.query;

        if (!isValidObjectId(examId)) {
            return res.status(400).json({ success: false, message: "Invalid Exam ID" });
        }

        const exam = await Exam.findById(examId)
            .select("title description duration passingScore totalMarks startTime endTime courseId batchIds createdBy")
            .lean();
        if (!exam) {
            return res.status(404).json({ success: false, message: "Exam not found" });
        }

        const filter = { examId };
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        const results = await ExamResult.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        const responseData = {
            exam: {
                _id: exam._id,
                title: exam.title,
                description: exam.description,
                duration: exam.duration,
                startTime: exam.startTime,
                endTime: exam.endTime,
                passingScore: exam.passingScore,
                totalMarks: exam.totalMarks,
            },
            filter: {
                startDate: startDate || null,
                endDate: endDate || null,
            },
            totalResults: results.length,
            results: results.map(r => ({
                _id: r._id,
                studentName: r.studentName,
                studentEmail: r.studentEmail,
                score: r.score,
                isPassed: r.isPassed,
                startedAt: r.startedAt,
                submittedAt: r.createdAt,
                answers: r.answers,
            })),
        };

        res.setHeader("Content-Disposition", `attachment; filename="${exam.title.replace(/\s+/g, "_")}_Results.json"`);
        res.setHeader("Content-Type", "application/json");
        res.json(responseData);
    } catch (err) {
        console.error("Error downloading JSON results:", err);
        res.status(500).json({ success: false, message: "Failed to download results" });
    }
});

// 7. Admin — Get all student results for a specific exam
router.get("/admin/exam-results/:examId", isAuthenticated, isManager, async (req, res) => {
    try {
        const { examId } = req.params;
        if (!isValidObjectId(examId)) {
            return res.status(400).json({ success: false, message: "Invalid Exam ID" });
        }

        const exam = await Exam.findById(examId)
            .select("title description duration passingScore totalMarks startTime endTime questions")
            .lean();
        if (!exam) {
            return res.status(404).json({ success: false, message: "Exam not found" });
        }

        const results = await ExamResult.find({ examId: req.params.examId })
            .sort({ createdAt: -1 })
            .lean();

        const totalSubmissions = results.length;
        const passed = results.filter(r => r.isPassed).length;
        const avgScore = totalSubmissions > 0
            ? Math.round((results.reduce((sum, r) => sum + r.score, 0) / totalSubmissions) * 100) / 100
            : 0;

        res.json({ success: true, exam, results, stats: { totalSubmissions, passed, avgScore } });
    } catch (err) {
        console.error("Error fetching exam results:", err);
        res.status(500).json({ success: false, message: "Failed to fetch exam results" });
    }
});

// 7. Admin — Reconduct exam for a specific student (delete their result)
router.post("/admin/reconduct/:examId/:studentId", isAuthenticated, isManager, async (req, res) => {
    try {
        const { examId, studentId } = req.params;
        if (!isValidObjectId(examId) || !isValidObjectId(studentId)) {
            return res.status(400).json({ success: false, message: "Invalid ID(s) provided" });
        }

        const deleted = await ExamResult.findOneAndDelete({
            examId,
            studentId
        });
        if (!deleted) {
            return res.status(404).json({ success: false, message: "No result found for this student and exam" });
        }
        res.json({ success: true, message: "Exam result deleted. Student can now retake the exam." });
    } catch (err) {
        console.error("Error reconducting exam:", err);
        res.status(500).json({ success: false, message: "Failed to reconduct exam" });
    }
});

// ─────────────────────────────────────────────
// STUDENT ROUTES
// ─────────────────────────────────────────────

// 8. Fetch available exams for the logged-in student (ACTUAL exams only - mock exams excluded)
router.get("/available", isAuthenticated, async (req, res) => {
    try {
        const { eventId, courseId } = req.query;

        const studentBatches = await Batch.find({ students: req.user.id }, "_id courseId name").lean();
        const batchIds = studentBatches.map(b => b._id);

        // Fetch actual exams the student is directly allowed to take (enrollment-based, excluding mock tests)
        let enrollmentExams = [];
        if (batchIds.length > 0) {
            enrollmentExams = await Exam.find({
                allowedStudents: req.user.id,
                isActive: true,
                isPublic: { $ne: true },
                isMockExam: { $ne: true },
                is_mock: { $ne: true }
            })
                .select("title description duration passingScore totalMarks batchIds createdAt isPublic eventId isMockExam is_mock isInterviewPrep questionsPerStudent courseId")
                .lean();
        }

        // Fetch all active public actual exams (excluding mock tests)
        const publicExams = await Exam.find({
            isPublic: true,
            isActive: true,
            isMockExam: { $ne: true },
            is_mock: { $ne: true }
        })
            .select("title description duration passingScore totalMarks batchIds createdAt isPublic eventId isMockExam is_mock isInterviewPrep questionsPerStudent courseId")
            .lean();

        // Fetch actual exams linked to event if eventId parameter is passed (excluding mock tests)
        let eventExams = [];
        if (eventId && mongoose.Types.ObjectId.isValid(eventId)) {
            eventExams = await Exam.find({
                eventId,
                isActive: true,
                isMockExam: { $ne: true },
                is_mock: { $ne: true }
            })
                .select("title description duration passingScore totalMarks batchIds createdAt isPublic eventId isMockExam is_mock isInterviewPrep questionsPerStudent courseId")
                .lean();
        }

        // NOTE: Mock exams (is_mock: true or isMockExam: true) are intentionally NOT merged into available exams.
        // They are only accessible via course links and SSO practice sessions.

        // Merge and deduplicate by _id
        const seenIds = new Set(enrollmentExams.map(e => e._id.toString()));
        const mergedExams = [...enrollmentExams];
        for (const exam of [...publicExams, ...eventExams]) {
            if (!seenIds.has(exam._id.toString())) {
                mergedExams.push(exam);
                seenIds.add(exam._id.toString());
            }
        }

        // Get attempt records for all merged actual exams
        const attemptRecords = await ExamResult.find({
            studentId: req.user.id,
            examId: { $in: mergedExams.map(e => e._id) }
        }).lean();

        const attemptedExamIds = new Set(attemptRecords.map(r => r.examId.toString()));

        const examsWithContext = mergedExams.map(exam => {
            const batch = studentBatches.find(b => (exam.batchIds || []).map(id => id.toString()).includes(b._id.toString()));
            let batchName = "Multiple/Unknown Batches";
            if (exam.isPublic) {
                batchName = "Public Test";
            } else if (exam.eventId) {
                batchName = "Event Exam";
            } else if (batch) {
                batchName = batch.name;
            }

            return {
                ...exam,
                batchName,
                isAttempted: attemptedExamIds.has(exam._id.toString())
            };
        });

        res.json({ success: true, exams: examsWithContext });
    } catch (err) {
        console.error("Error fetching available exams:", err);
        res.status(500).json({ success: false, message: "Failed to fetch exams" });
    }
});



// 9. Get My Results (Student)
router.get("/my-results/all", isAuthenticated, async (req, res) => {
    try {
        const results = await ExamResult.find({ studentId: req.user.id })
            .populate("examId", "title passingScore totalMarks duration")
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, results });
    } catch (err) {
        console.error("Error fetching results:", err);
        res.status(500).json({ success: false, message: "Failed to fetch results" });
    }
});

// 9b. Fetch Course Mock Exams / Interview Prep Tests (For Single-Backend & Students)
router.get("/course/:courseId/mock-exams", async (req, res) => {
    try {
        const { courseId } = req.params;
        const query = {
            isActive: true,
            $or: [{ isMockExam: true }, { is_mock: true }]
        };

        if (courseId && courseId !== "all" && isValidObjectId(courseId)) {
            query.$and = [
                { $or: [{ isMockExam: true }, { is_mock: true }] },
                { $or: [{ courseId }, { courseId: null }, { isPublic: true }] }
            ];
            delete query.$or;
        }

        const exams = await Exam.find(query)
            .select("title description duration passingScore totalMarks questionsPerStudent questions isPublic isMockExam is_mock isInterviewPrep createdAt startTime endTime enableAntiCheating")
            .sort({ createdAt: -1 })
            .lean();

        const formatted = exams.map(e => ({
            _id: e._id,
            title: e.title,
            description: e.description,
            duration: e.duration,
            passingScore: e.passingScore,
            totalMarks: e.totalMarks,
            totalQuestionsInPool: e.questions?.length || 0,
            questionsPerStudent: e.questionsPerStudent > 0 ? e.questionsPerStudent : (e.questions?.length || 0),
            isInterviewPrep: !!e.isInterviewPrep,
            isMockExam: true,
            is_mock: true,
            isPublic: !!e.isPublic,
            enableAntiCheating: !!e.enableAntiCheating,
            startTime: e.startTime,
            endTime: e.endTime,
            createdAt: e.createdAt
        }));

        res.json({ success: true, exams: formatted });
    } catch (err) {
        console.error("Error fetching course mock exams:", err);
        res.status(500).json({ success: false, message: "Failed to fetch mock exams" });
    }
});

// 10. Submit Exam
router.post("/:id/submit", isAuthenticated, async (req, res) => {
    try {
        const { answers, startedAt } = req.body;

        const exam = await Exam.findById(req.params.id);
        if (!exam || !exam.isActive) {
            return res.status(404).json({ success: false, message: "Exam not found" });
        }

        const previousAttempt = await ExamResult.findOne({ studentId: req.user.id, examId: exam._id });
        if (previousAttempt) {
            return res.status(400).json({ success: false, message: "You have already submitted this exam" });
        }

        // Determine student's assigned questions (either sampled subset or full exam)
        const assignedQuestions = getStudentAssignedQuestions(exam, req.user.id);
        const totalAssigned = assignedQuestions.length || 1;
        const marksPerQuestion = exam.totalMarks / totalAssigned;

        let score = 0;
        const processedAnswers = [];

        assignedQuestions.forEach((q) => {
            const studentAnswer = answers.find(a => a.questionIndex === q.id);
            if (studentAnswer && studentAnswer.selectedOptionIndex === q.correctOptionIndex) {
                score += marksPerQuestion;
            }
            processedAnswers.push({
                questionIndex: q.id,
                selectedOptionIndex: studentAnswer ? studentAnswer.selectedOptionIndex : null
            });
        });

        score = Math.round(score * 100) / 100;
        const isPassed = score >= exam.passingScore;

        await ExamResult.create({
            examId: exam._id,
            studentId: req.user.id,
            studentName: req.user.name,
            studentEmail: req.user.email,
            score,
            isPassed,
            startedAt: startedAt ? new Date(startedAt) : null,
            answers: processedAnswers
        });

        res.json({ success: true, message: "Exam submitted successfully", result: { score, isPassed, totalMarks: exam.totalMarks } });
    } catch (err) {
        console.error("Error submitting exam:", err);
        res.status(500).json({ success: false, message: "Failed to submit exam" });
    }
});

// 11. Fetch specific exam questions — MUST be last (wildcard /:id)
router.get("/:id", isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid Exam ID" });
        }

        const exam = await Exam.findById(id).lean();
        if (!exam || !exam.isActive) {
            return res.status(404).json({ success: false, message: "Exam not found or inactive" });
        }

        const isAdminOrTrainer = req.user.role === "admin" || req.user.role === "trainer";
        const isCreator = exam.createdBy && exam.createdBy.toString() === req.user.id;
        const isAllowedStudent = exam.allowedStudents && exam.allowedStudents.map(id => id.toString()).includes(req.user.id);
        const isPublicExam = !!exam.isPublic;
        const isEventExam = !!exam.eventId;
        const isMockExam = !!(exam.isMockExam || exam.is_mock);

        if (!isAdminOrTrainer && !isCreator && !isAllowedStudent && !isPublicExam && !isEventExam && !isMockExam) {
            return res.status(403).json({ success: false, message: "You are not authorized to take this exam" });
        }

        const now = new Date();
        const hasStarted = now >= new Date(exam.startTime);

        if (!hasStarted && !isAdminOrTrainer) {
            return res.json({
                success: true,
                serverTime: now, // lets the frontend sync its countdown to the server's clock
                exam: {
                    _id: exam._id,
                    title: exam.title,
                    description: exam.description,
                    startTime: exam.startTime,
                    endTime: exam.endTime,
                    isLocked: true
                }
            });
        }

        const previousAttempt = await ExamResult.findOne({ studentId: req.user.id, examId: exam._id });
        if (previousAttempt && !isAdminOrTrainer) {
            return res.status(400).json({ success: false, message: "You have already attempted this exam" });
        }

        if (isAdminOrTrainer) {
            return res.json({
                success: true,
                serverTime: now, // lets the frontend sync its countdown to the server's clock
                exam
            });
        }

        // For student: sample deterministic questions based on student ID seed
        const assignedQuestions = getStudentAssignedQuestions(exam, req.user.id);
        const marksPerQuestion = exam.totalMarks / (assignedQuestions.length || 1);

        const sanitizedQuestions = assignedQuestions.map((q) => ({
            id: q.id, // original index in exam.questions for evaluation
            text: q.text,
            options: q.options,
            image: q.image,
            marks: Math.round(marksPerQuestion * 10) / 10
        }));

        res.json({
            success: true,
            serverTime: now, // lets the frontend sync its countdown to the server's clock
            exam: {
                _id: exam._id,
                title: exam.title,
                description: exam.description,
                duration: exam.duration,
                startTime: exam.startTime,
                endTime: exam.endTime,
                enableAntiCheating: exam.enableAntiCheating,
                isMockExam: !!exam.isMockExam,
                isInterviewPrep: !!exam.isInterviewPrep,
                totalQuestionsInPool: exam.questions.length,
                questionsPerStudent: sanitizedQuestions.length,
                questions: sanitizedQuestions
            }
        });
    } catch (err) {
        console.error("Error fetching exam details:", err);
        res.status(500).json({ success: false, message: "Failed to fetch exam details" });
    }
});

export default router;
