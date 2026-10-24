"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

interface Course {
  _id: string;
  title: string;
}

interface AssignedExam {
  _id: string;
  title: string;
  isActive: boolean;
  createdBy: string;
}

interface EventItem {
  _id: string;
  title: string;
  assignedExams: AssignedExam[];
}

interface Batch {
  _id: string;
  name: string;
  students: { _id: string; name: string; email: string }[];
}

interface Question {
  text: string;
  options: string[];
  correctOptionIndex: number;
  marks: number;
  image?: string;
}

export default function CreateExam() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [user, setUser] = useState<any>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [startTime, setStartTime] = useState("");
  const [passingScore, setPassingScore] = useState<number>(40);
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [allStudents, setAllStudents] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [allowedStudents, setAllowedStudents] = useState<string[]>([]);
  
  const [questions, setQuestions] = useState<Question[]>([
    { text: "", options: ["", "", "", ""], correctOptionIndex: 0, marks: 1, image: "" }
  ]);
  const [examCategory, setExamCategory] = useState<"actual" | "mock" | "event">("actual");
  const [parsing, setParsing] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [enableAntiCheating, setEnableAntiCheating] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [isInterviewPrep, setIsInterviewPrep] = useState(false);
  const [questionsPerStudent, setQuestionsPerStudent] = useState<number>(0);

  const handleCategoryChange = (category: "actual" | "mock" | "event") => {
    setExamCategory(category);
    if (category === "actual") {
      setIsMock(false);
      setSelectedEvent("");
    } else if (category === "mock") {
      setIsMock(true);
      setSelectedEvent("");
      setSelectedBatches([]);
      setAllStudents([]);
      setAllowedStudents([]);
      setIsPublic(false);
    } else if (category === "event") {
      setIsMock(false);
      setSelectedCourse("");
      setSelectedBatches([]);
      setAllStudents([]);
      setAllowedStudents([]);
      setIsPublic(false);
    }
  };

  useEffect(() => {
    // Check auth, fetch courses and events
    const init = async () => {
      try {
        const userRes = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
        if (userRes.data.success && (userRes.data.user.role === "admin" || userRes.data.user.role === "trainer")) {
          setUser(userRes.data.user);
          
          // Fetch courses
          const courseRes = await axios.get(`${API_URL}/api/exam/courses`, { withCredentials: true });
          if (courseRes.data.success) {
            setCourses(courseRes.data.courses);
          }

          // Fetch events with tests
          const eventRes = await axios.get(`${API_URL}/api/exam/events`, { withCredentials: true });
          if (eventRes.data.success) {
            setEvents(eventRes.data.events);
          }
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error(err);
        router.push("/dashboard");
      }
    };
    init();
  }, [router]);


  useEffect(() => {
    // Fetch batches when course changes
    const fetchBatches = async () => {
      if (!selectedCourse) {
        setBatches([]);
        return;
      }
      try {
        const res = await axios.get(`${API_URL}/api/exam/batches/${selectedCourse}`, { withCredentials: true });
        if (res.data.success) {
          setBatches(res.data.batches);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchBatches();
  }, [selectedCourse]);

  // Update available students when batches change
  useEffect(() => {
    if (selectedBatches.length === 0) {
      setAllStudents([]);
      setAllowedStudents([]);
      return;
    }

    const uniqueStudentsMap = new Map();
    selectedBatches.forEach(batchId => {
      const batch = batches.find(b => b._id === batchId);
      if (batch && batch.students) {
        batch.students.forEach(student => {
          uniqueStudentsMap.set(student._id, student);
        });
      }
    });

    const studentsList = Array.from(uniqueStudentsMap.values());
    setAllStudents(studentsList);
    
    // Auto-select all by default when batch selection changes
    setAllowedStudents(studentsList.map(s => s._id));
  }, [selectedBatches, batches]);

  // Dynamically calculate total marks and adjust default passing score
  useEffect(() => {
    const total = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    setTotalMarks(total);
    setPassingScore(prev => {
      if (total === 0) return 0;
      if (prev > total) return Math.ceil(total * 0.4);
      if (prev === 40 && total !== 100) return Math.ceil(total * 0.4);
      return prev;
    });
  }, [questions]);

  const toggleBatch = (batchId: string) => {
    setSelectedBatches(prev => 
      prev.includes(batchId) 
        ? prev.filter(id => id !== batchId)
        : [...prev, batchId]
    );
  };

  const toggleStudent = (studentId: string) => {
    setAllowedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: "", options: ["", "", "", ""], correctOptionIndex: 0, marks: 1, image: "" }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const handleQuestionChange = (index: number, field: string, value: any, optionIndex?: number) => {
    const updated = [...questions];
    if (field === "text") {
      updated[index].text = value;
    } else if (field === "correctOptionIndex") {
      updated[index].correctOptionIndex = value;
    } else if (field === "option" && optionIndex !== undefined) {
      updated[index].options[optionIndex] = value;
    } else if (field === "marks") {
      updated[index].marks = value;
    } else if (field === "image") {
      updated[index].image = value;
    }
    setQuestions(updated);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("pdf", file);

    setParsing(true);
    try {
      const res = await axios.post(`${API_URL}/api/exam/admin/parse-pdf`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data.success) {
        // Map parsed questions to our format (ensuring 4 options for consistency if needed)
        const parsed = res.data.questions.map((q: any) => ({
          text: q.text,
          options: q.options.length >= 4 ? q.options.slice(0, 4) : [...q.options, ...Array(4 - q.options.length).fill("")],
          correctOptionIndex: q.correctOptionIndex,
          marks: 1,
          image: ""
        }));
        setQuestions(parsed);
        alert(`Successfully parsed ${parsed.length} questions from PDF!`);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to parse PDF. Ensure it follows a standard MCQ format.");
    } finally {
      setParsing(false);
      // Reset input
      e.target.value = "";
    }
  };


  const handleImageUpload = async (qIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await axios.post(`${API_URL}/api/exam/admin/upload-image`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data.success) {
        handleQuestionChange(qIndex, "image", res.data.imageUrl);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to upload image");
    } finally {
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!title.trim()) {
      alert("Please fill in the exam title.");
      setLoading(false);
      return;
    }

    if (examCategory === "event" && !selectedEvent) {
      alert("Please select a platform event to link this exam to.");
      setLoading(false);
      return;
    }

    if (examCategory === "actual" && !isPublic) {
      if (!selectedCourse) {
        alert("Please select a course for this exam.");
        setLoading(false);
        return;
      }
      if (selectedBatches.length === 0) {
        alert("Please select at least one batch.");
        setLoading(false);
        return;
      }
      if (allowedStudents.length === 0) {
        alert("Please select at least one student to take the exam.");
        setLoading(false);
        return;
      }
    }

    if (examCategory !== "mock" && !startTime) {
      alert("Please provide an exam start time.");
      setLoading(false);
      return;
    }

    const hasEmptyQuestions = questions.some(q => !q.text.trim() || q.options.some(opt => !opt.trim()));
    if (hasEmptyQuestions) {
      alert("Please complete all questions and options.");
      setLoading(false);
      return;
    }

    try {
      const isMockMode = examCategory === "mock";
      const isEventMode = examCategory === "event";

      const res = await axios.post(`${API_URL}/api/exam/create`, {
        title,
        description,
        duration,
        eventId: isEventMode ? selectedEvent : null,
        courseId: isMockMode ? (selectedCourse || null) : (isEventMode || isPublic ? null : selectedCourse),
        batchIds: (!isMockMode && !isEventMode && !isPublic) ? selectedBatches : [],
        allowedStudents: (!isMockMode && !isEventMode && !isPublic) ? allowedStudents : [],
        passingScore,
        totalMarks,
        questions,
        startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
        isPublic: isMockMode ? true : (isEventMode ? false : isPublic),
        isMockExam: isMockMode,
        is_mock: isMockMode,
        isInterviewPrep: isMockMode ? isInterviewPrep : false,
        questionsPerStudent: isMockMode ? questionsPerStudent : 0,
        enableAntiCheating
      }, { withCredentials: true });

      if (res.data.success) {
        alert("Exam created successfully!");
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to create exam");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <Navbar user={user} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={user.role} />
        
        <main className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
          <header className="mb-8">
            <h1 className="text-3xl font-extrabold text-zinc-900 ">Create New Exam</h1>
            <p className="text-zinc-500  mt-2">Design an MCQ assessment and assign it to a batch or event.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Assignment */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-zinc-100">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">1. Assessment Classification &amp; Assignment</h2>
                  <p className="text-xs text-zinc-500 mt-1">Select the exam type to reveal its dedicated configuration options.</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  examCategory === "actual" 
                    ? "bg-blue-100 text-blue-700 border border-blue-200" 
                    : examCategory === "mock" 
                    ? "bg-purple-100 text-purple-700 border border-purple-200" 
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}>
                  {examCategory === "actual" ? "🎯 Actual Exam" : examCategory === "mock" ? "🧪 Mock Exam" : "🎫 Event Exam"}
                </span>
              </div>

              {/* Main Category Dropdown */}
              <div className="mb-6 p-5 rounded-2xl bg-zinc-50 border border-zinc-200/90 shadow-inner">
                <label htmlFor="examCategorySelect" className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-2">
                  Choose Exam Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="examCategorySelect"
                    value={examCategory}
                    onChange={(e) => handleCategoryChange(e.target.value as "actual" | "mock" | "event")}
                    className="w-full px-4 py-3.5 pr-10 rounded-xl border-2 border-zinc-200 bg-white text-zinc-900 font-semibold text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer shadow-sm"
                  >
                    <option value="actual">🎯 Actual Exam — Scheduled course &amp; batch assessment</option>
                    <option value="mock">🧪 Mock Exam — Practice test &amp; question pool sampling</option>
                    <option value="event">🎫 Event Exam — Gated for main platform event participants</option>
                  </select>
                </div>

                <div className="mt-3 flex items-start gap-2 text-xs text-zinc-600">
                  <span className="text-sm">ℹ️</span>
                  <p>
                    {examCategory === "actual" && "Scheduled assessment assigned to specific course batches and targeted students, or published as an open public test."}
                    {examCategory === "mock" && "Practice test with optional course association and deterministic question pool sampling. Bypasses batch rosters."}
                    {examCategory === "event" && "Linked to a main platform event (e.g. Hackathon or Contest). Accessible exclusively to enrolled students via SSO."}
                  </p>
                </div>
              </div>

              {/* ────────────────────────────────────────── */}
              {/* CATEGORY 1: ACTUAL EXAM OPTIONS           */}
              {/* ────────────────────────────────────────── */}
              {examCategory === "actual" && (
                <div className="space-y-6">
                  {/* Public Test Toggle */}
                  <div className="p-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-zinc-900">Make this a Public Test</p>
                      <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                        Public tests are visible to <span className="font-semibold text-blue-600">all logged-in students</span> in the Available Exams tab without requiring batch assignment.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPublic(prev => !prev)}
                      className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        isPublic ? 'bg-blue-600' : 'bg-zinc-300'
                      }`}
                      aria-pressed={isPublic}
                      aria-label="Toggle public test"
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                          isPublic ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Course / Batch / Student selector — shown when NOT public */}
                  {!isPublic ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-2">
                            Course <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={selectedCourse}
                            onChange={e => { setSelectedCourse(e.target.value); setSelectedBatches([]); }}
                            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          >
                            <option value="">Select a Course</option>
                            {courses.map(c => (
                              <option key={c._id} value={c._id}>{c.title}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-2">
                            Select Batches <span className="text-red-500">*</span>
                          </label>
                          {!selectedCourse ? (
                            <div className="p-4 text-sm text-zinc-500 bg-zinc-50 rounded-xl border border-zinc-200">
                              Select a course first to view batches.
                            </div>
                          ) : batches.length === 0 ? (
                            <div className="p-4 text-sm text-zinc-500 bg-zinc-50 rounded-xl border border-zinc-200">
                              No batches found for this course.
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto p-2 border border-zinc-200 rounded-xl bg-zinc-50">
                              {batches.map(b => (
                                <label key={b._id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={selectedBatches.includes(b._id)}
                                    onChange={() => toggleBatch(b._id)}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-zinc-900 font-medium">{b.name}</span>
                                  <span className="ml-auto text-xs text-zinc-500 bg-zinc-200 px-2 py-1 rounded-full">
                                    {b.students?.length || 0} students
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Targeted Students List */}
                      {allStudents.length > 0 && (
                        <div className="mt-8 border-t border-zinc-200 pt-6">
                          <div className="flex justify-between items-center mb-4">
                            <label className="block text-sm font-medium text-zinc-700">
                              Targeted Students ({allowedStudents.length}/{allStudents.length})
                            </label>
                            <button
                              type="button"
                              onClick={() => setAllowedStudents(allowedStudents.length === allStudents.length ? [] : allStudents.map(s => s._id))}
                              className="text-sm text-blue-600 font-semibold hover:underline"
                            >
                              {allowedStudents.length === allStudents.length ? "Deselect All" : "Select All"}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2 bg-zinc-50 rounded-xl border border-zinc-200">
                            {allStudents.map(student => (
                              <label key={student._id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${allowedStudents.includes(student._id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-zinc-200 opacity-60 hover:opacity-100'}`}>
                                <input
                                  type="checkbox"
                                  checked={allowedStudents.includes(student._id)}
                                  onChange={() => toggleStudent(student._id)}
                                  className="w-4 h-4 mt-1 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <div className="overflow-hidden">
                                  <p className="text-sm font-bold text-zinc-900 truncate">{student.name}</p>
                                  <p className="text-xs text-zinc-500 truncate">{student.email}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                          <p className="text-xs text-zinc-500 mt-3">Uncheck students to prevent them from seeing or taking this exam.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center gap-3">
                      <span className="text-xl">🌐</span>
                      <p className="text-xs text-blue-900 font-medium leading-relaxed">
                        Public Test Mode is active. All platform students can view and attempt this assessment. Course, batch, and individual student selections are bypassed.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ────────────────────────────────────────── */}
              {/* CATEGORY 2: MOCK EXAM OPTIONS              */}
              {/* ────────────────────────────────────────── */}
              {examCategory === "mock" && (
                <div className="space-y-6">
                  <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-start gap-3">
                    <span className="text-xl">🧪</span>
                    <div>
                      <p className="text-sm font-bold text-purple-900">Mock Assessment Mode Active (is_mock)</p>
                      <p className="text-xs text-purple-700 mt-1 leading-relaxed">
                        This practice test will <strong>NOT</strong> appear in students' Available Exams list. Students access it via course mock test cards and single-backend SSO links. Batch and student roster assignments are bypassed.
                      </p>
                    </div>
                  </div>

                  {/* Course Association for Mock Exam */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">
                      Associate with Course <span className="text-zinc-400 font-normal">(Optional — for course-specific practice / interview prep)</span>
                    </label>
                    <select
                      value={selectedCourse}
                      onChange={e => setSelectedCourse(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    >
                      <option value="">General / All Courses (Not tied to a specific course)</option>
                      {courses.map(c => (
                        <option key={c._id} value={c._id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Question Pool Sampling & Interview Prep Checkboxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50">
                      <label className="block text-xs font-bold text-zinc-800 mb-1">
                        Questions Sampled Per Student
                      </label>
                      <p className="text-[11px] text-zinc-500 mb-2">
                        Randomly samples this many questions from your pool per student using deterministic PRNG. Enter 0 to deliver all questions.
                      </p>
                      <input
                        type="number"
                        min="0"
                        value={questionsPerStudent}
                        onChange={e => setQuestionsPerStudent(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="0 (deliver all pool questions)"
                      />
                    </div>

                    <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="interviewPrepCheck"
                        checked={isInterviewPrep}
                        onChange={e => setIsInterviewPrep(e.target.checked)}
                        className="w-5 h-5 mt-0.5 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="interviewPrepCheck" className="cursor-pointer">
                        <span className="block text-xs font-bold text-zinc-800">Flag as Interview Preparation</span>
                        <span className="block text-[11px] text-zinc-500 mt-0.5">
                          Marks this mock test specifically for the Interview Preparation tab on the main platform.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────── */}
              {/* CATEGORY 3: EVENT EXAM OPTIONS             */}
              {/* ────────────────────────────────────────── */}
              {examCategory === "event" && (
                <div className="space-y-6">
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3">
                    <span className="text-xl">🎫</span>
                    <div>
                      <p className="text-sm font-bold text-amber-900">Event-Gated Exam Mode Active</p>
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        This exam is linked directly to a main platform event. Only students enrolled in that specific event can access it via SSO auto-login. Course, batch, and student roster selections are not needed.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">
                      Select Main Platform Event <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedEvent}
                      onChange={e => setSelectedEvent(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select an Event</option>
                      {events.map(ev => (
                        <option key={ev._id} value={ev._id}>
                          {ev.title} {ev.assignedExams && ev.assignedExams.length > 0 ? `(${ev.assignedExams.length} existing exam linked)` : ""}
                        </option>
                      ))}
                    </select>

                    {selectedEvent ? (
                      <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                        <span className="text-amber-600 text-sm">✅</span>
                        <p className="text-xs text-amber-800 font-semibold">
                          Event Linked. Only participants enrolled in this event will be granted access.
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 mt-1">
                        Select an event that has testing enabled to link this exam.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Exam Details */}
            <div className="bg-white  rounded-3xl p-8 shadow-sm border border-zinc-100 ">
              <h2 className="text-xl font-bold mb-6 text-zinc-900 ">2. Exam Details</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700  mb-2">Exam Title</label>
                  <input 
                    type="text" 
                    value={title || ""}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200  bg-zinc-50  text-zinc-900  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="e.g. Midterm Assessment"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700  mb-2">Description (Optional)</label>
                  <textarea 
                    value={description || ""}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200  bg-zinc-50  text-zinc-900  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none h-24 resize-none"
                    placeholder="Instructions for students..."
                  />
                </div>

                {/* Anti-Cheating Toggle */}
                <div className="p-4 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/60 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🛡️</span>
                      <p className="text-sm font-bold text-zinc-900">Enable Anti-Cheating Mode</p>
                    </div>
                    <p className="text-xs text-zinc-600 mt-1 max-w-md leading-relaxed">
                      Enforces mandatory fullscreen, disables text selection & right-click, and detects tab switching with automatic submission on violations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnableAntiCheating(prev => !prev)}
                    className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                      enableAntiCheating ? 'bg-amber-600' : 'bg-zinc-300'
                    }`}
                    aria-pressed={enableAntiCheating}
                    aria-label="Toggle anti-cheating mode"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                        enableAntiCheating ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">
                      Start Date &amp; Time {examCategory === "mock" ? (
                        <span className="text-xs font-normal text-purple-600">(Optional for Mock — defaults to instant access)</span>
                      ) : (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    <input 
                      type="datetime-local" 
                      value={startTime || ""}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required={examCategory !== "mock"}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700  mb-2">Duration (mins)</label>
                    <input 
                      type="number" 
                      value={duration || 0}
                      onChange={e => setDuration(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200  bg-zinc-50  text-zinc-900  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      min={1}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700  mb-2">Total Marks (Auto)</label>
                    <input 
                      type="number" 
                      value={totalMarks || 0}
                      readOnly
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200  bg-zinc-100  text-zinc-500  focus:outline-none cursor-not-allowed font-bold"
                      title="Calculated automatically based on question marks"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700  mb-2">
                      Passing Score {totalMarks > 0 && (
                        <span className="text-xs font-normal text-zinc-500">
                          ({passingScore}/{totalMarks} = {Math.round((passingScore / totalMarks) * 100)}%)
                        </span>
                      )}
                    </label>
                    <input 
                      type="number" 
                      value={passingScore || 0}
                      onChange={e => setPassingScore(Number(e.target.value))}
                      min={0}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200  bg-white  text-zinc-900  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Questions */}
            <div className="bg-white  rounded-3xl p-8 shadow-sm border border-zinc-100 ">
              <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h2 className="text-xl font-bold text-zinc-900 ">3. Questions</h2>
                <div className="flex items-center gap-3">
                  <label className={`cursor-pointer px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600  font-bold rounded-lg border-2 border-dashed border-blue-200  hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all text-sm flex items-center gap-2 ${parsing ? 'opacity-50 pointer-events-none' : ''}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    {parsing ? "Parsing..." : "Import from PDF"}
                    <input type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" disabled={parsing} />
                  </label>
                  <button type="button" onClick={addQuestion} className="px-4 py-2 bg-zinc-100  text-zinc-900  font-medium rounded-lg hover:bg-zinc-200  transition-colors text-sm">
                    + Add Question
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {questions.map((q, qIndex) => (
                  <div key={qIndex} className="p-6 border border-zinc-200  rounded-2xl bg-zinc-50/50 ">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-zinc-900 ">Question {qIndex + 1}</h3>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Marks:</label>
                          <input 
                            type="number"
                            min={1}
                            value={q.marks}
                            onChange={e => handleQuestionChange(qIndex, "marks", Number(e.target.value))}
                            className="w-16 px-2 py-1 text-sm font-bold text-center rounded-lg border border-zinc-200  bg-white  text-blue-600  focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        {questions.length > 1 && (
                          <button type="button" onClick={() => removeQuestion(qIndex)} className="text-red-500 hover:text-red-600 font-medium text-sm">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <input 
                      type="text"
                      value={q.text}
                      onChange={e => handleQuestionChange(qIndex, "text", e.target.value)}
                      placeholder="Enter question text here..."
                      className="w-full px-4 py-3 mb-4 rounded-xl border border-zinc-200  bg-white  text-zinc-900  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
                    />

                    {/* Question Image */}
                    <div className="mb-6">
                      <div className="flex items-center gap-4 mb-2">
                        <label className="text-sm font-medium text-zinc-700 ">Question Image (Optional)</label>
                        <label className="cursor-pointer text-xs font-bold text-blue-600  hover:underline">
                          {q.image ? "Change Image" : "Add Image"}
                          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(qIndex, e)} className="hidden" />
                        </label>
                        {q.image && (
                          <button type="button" onClick={() => handleQuestionChange(qIndex, "image", "")} className="text-xs font-bold text-red-500 hover:underline">
                            Remove
                          </button>
                        )}
                      </div>
                      {q.image && (
                        <div className="relative w-full max-w-xs h-40 rounded-xl overflow-hidden border border-zinc-200  bg-zinc-100 ">
                          <img src={q.image} alt={`Question ${qIndex + 1}`} className="w-full h-full object-contain" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-3">
                          <input 
                            type="radio" 
                            name={`correct-${qIndex}`}
                            checked={q.correctOptionIndex === oIndex}
                            onChange={() => handleQuestionChange(qIndex, "correctOptionIndex", oIndex)}
                            className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                            required
                          />
                          <input 
                            type="text"
                            value={opt}
                            onChange={e => handleQuestionChange(qIndex, "option", e.target.value, oIndex)}
                            placeholder={`Option ${oIndex + 1}`}
                            className="flex-1 px-4 py-2 rounded-xl border border-zinc-200  bg-white  text-zinc-900  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-70 flex items-center gap-2"
              >
                {loading ? "Creating..." : "Publish Exam"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

