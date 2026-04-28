import express from "express";
import { Course, Batch } from "../model/authDbModels.js";
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

// 0. Fetch All Exams for Admin
router.get("/admin/all", isAuthenticated, isManager, async (req, res) => {
    try {
        const exams = await Exam.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
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
        allowedStudents, passingScore, totalMarks, questions, startTime 
    } = req.body;

    try {
        if (!title || !courseId || !batchIds || batchIds.length === 0 || !allowedStudents || !questions || questions.length === 0) {
            return res.status(400).json({ success: false, message: "Missing required fields or questions" });
        }

        const start = new Date(startTime);
        const end = new Date(start.getTime() + duration * 60000);

        const newExam = await Exam.create({
            title,
            description,
            duration,
            startTime: start,
            endTime: end,
            courseId,
            batchIds,
            allowedStudents,
            passingScore,
            totalMarks,
            questions,
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
            allowedStudents, passingScore, totalMarks, questions, startTime 
        } = req.body;

        const start = new Date(startTime);
        const end = new Date(start.getTime() + duration * 60000);

        const updatedExam = await Exam.findByIdAndUpdate(id, {
            title,
            description,
            duration,
            startTime: start,
            endTime: end,
            courseId,
            batchIds,
            allowedStudents,
            passingScore,
            totalMarks,
            questions
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

// 6. Admin — Get all student results for a specific exam
router.get("/admin/exam-results/:examId", isAuthenticated, isManager, async (req, res) => {
    try {
        const { examId } = req.params;
        if (!isValidObjectId(examId)) {
            return res.status(400).json({ success: false, message: "Invalid Exam ID" });
        }

        const exam = await Exam.findById(examId)
            .select("title description duration passingScore totalMarks questions")
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

// 8. Fetch available exams for the logged-in student
router.get("/available", isAuthenticated, async (req, res) => {
    try {
        const studentBatches = await Batch.find({ students: req.user.id }, "_id courseId name").lean();
        const batchIds = studentBatches.map(b => b._id);

        if (batchIds.length === 0) {
            return res.json({ success: true, exams: [] });
        }

        const exams = await Exam.find({ allowedStudents: req.user.id, isActive: true })
            .select("title description duration passingScore totalMarks batchIds createdAt")
            .lean();

        const attemptRecords = await ExamResult.find({
            studentId: req.user.id,
            examId: { $in: exams.map(e => e._id) }
        }).lean();

        const attemptedExamIds = new Set(attemptRecords.map(r => r.examId.toString()));

        const examsWithContext = exams.map(exam => {
            const batch = studentBatches.find(b => exam.batchIds.map(id => id.toString()).includes(b._id.toString()));
            return {
                ...exam,
                batchName: batch ? batch.name : "Multiple/Unknown Batches",
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

// 10. Submit Exam
router.post("/:id/submit", isAuthenticated, async (req, res) => {
    try {
        const { answers } = req.body;

        const exam = await Exam.findById(req.params.id);
        if (!exam || !exam.isActive) {
            return res.status(404).json({ success: false, message: "Exam not found" });
        }

        const previousAttempt = await ExamResult.findOne({ studentId: req.user.id, examId: exam._id });
        if (previousAttempt) {
            return res.status(400).json({ success: false, message: "You have already submitted this exam" });
        }

        let score = 0;
        const marksPerQuestion = exam.totalMarks / exam.questions.length;
        const processedAnswers = [];

        exam.questions.forEach((q, index) => {
            const studentAnswer = answers.find(a => a.questionIndex === index);
            if (studentAnswer && studentAnswer.selectedOptionIndex === q.correctOptionIndex) {
                score += marksPerQuestion;
            }
            processedAnswers.push({
                questionIndex: index,
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

        if (!isAdminOrTrainer && !isCreator && !isAllowedStudent) {
            return res.status(403).json({ success: false, message: "You are not authorized to take this exam" });
        }

        const now = new Date();
        const hasStarted = now >= new Date(exam.startTime);

        if (!hasStarted && !isAdminOrTrainer) {
            return res.json({
                success: true,
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
            return res.json({ success: true, exam });
        }

        const sanitizedQuestions = exam.questions.map((q, index) => ({
            id: index,
            text: q.text,
            options: q.options,
            image: q.image,
            marks: q.marks
        }));

        // Randomize questions based on student ID as seed for consistency
        const seed = req.user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const seededRandom = (s) => {
            const x = Math.sin(s) * 10000;
            return x - Math.floor(x);
        };

        const shuffledQuestions = [...sanitizedQuestions];
        for (let i = shuffledQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(seed + i) * (i + 1));
            [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
        }

        res.json({
            success: true,
            exam: {
                _id: exam._id,
                title: exam.title,
                description: exam.description,
                duration: exam.duration,
                startTime: exam.startTime,
                endTime: exam.endTime,
                questions: shuffledQuestions
            }
        });
    } catch (err) {
        console.error("Error fetching exam details:", err);
        res.status(500).json({ success: false, message: "Failed to fetch exam details" });
    }
});

export default router;
