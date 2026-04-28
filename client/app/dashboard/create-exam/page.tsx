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
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [allStudents, setAllStudents] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [allowedStudents, setAllowedStudents] = useState<string[]>([]);
  
  const [questions, setQuestions] = useState<Question[]>([
    { text: "", options: ["", "", "", ""], correctOptionIndex: 0, marks: 1, image: "" }
  ]);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    // Check auth and fetch courses
    const init = async () => {
      try {
        const userRes = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
        if (userRes.data.success && (userRes.data.user.role === "admin" || userRes.data.user.role === "trainer")) {
          setUser(userRes.data.user);
          const courseRes = await axios.get(`${API_URL}/api/exam/courses`, { withCredentials: true });
          if (courseRes.data.success) {
            setCourses(courseRes.data.courses);
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
    // Only if allowedStudents is empty (meaning first selection) or we want to force reset
    setAllowedStudents(studentsList.map(s => s._id));
  }, [selectedBatches, batches]);

  // Dynamically calculate total marks and passing score (40%)
  useEffect(() => {
    const total = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    setTotalMarks(total);
    setPassingScore(Math.ceil(total * 0.4));
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
    if (!title || !selectedCourse || selectedBatches.length === 0 || !startTime) {
      alert("Please fill all basic details, select at least one batch, and provide a start time.");
      setLoading(false);
      return;
    }

    if (allowedStudents.length === 0) {
      alert("Please select at least one student to take the exam.");
      setLoading(false);
      return;
    }

    const hasEmptyQuestions = questions.some(q => !q.text || q.options.some(opt => !opt));
    if (hasEmptyQuestions) {
      alert("Please complete all questions and options.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/exam/create`, {
        title,
        description,
        duration,
        courseId: selectedCourse,
        batchIds: selectedBatches,
        allowedStudents,
        passingScore,
        totalMarks,
        questions,
        startTime
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
            <p className="text-zinc-500  mt-2">Design an MCQ assessment and assign it to a batch.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Assignment */}
            <div className="bg-white  rounded-3xl p-8 shadow-sm border border-zinc-100 ">
              <h2 className="text-xl font-bold mb-6 text-zinc-900 ">1. Assignment</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700  mb-2">Course</label>
                  <select 
                    value={selectedCourse} 
                    onChange={e => { setSelectedCourse(e.target.value); setSelectedBatches([]); }}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200  bg-zinc-50  text-zinc-900  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Select a Course</option>
                    {courses.map(c => (
                      <option key={c._id} value={c._id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700  mb-2">Select Batches</label>
                  {!selectedCourse ? (
                    <div className="p-4 text-sm text-zinc-500 bg-zinc-50  rounded-xl border border-zinc-200 ">
                      Select a course first to view batches.
                    </div>
                  ) : batches.length === 0 ? (
                    <div className="p-4 text-sm text-zinc-500 bg-zinc-50  rounded-xl border border-zinc-200 ">
                      No batches found for this course.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto p-2 border border-zinc-200  rounded-xl bg-zinc-50 ">
                      {batches.map(b => (
                        <label key={b._id} className="flex items-center gap-3 p-2 hover:bg-white  rounded-lg cursor-pointer transition-colors">
                          <input 
                            type="checkbox"
                            checked={selectedBatches.includes(b._id)}
                            onChange={() => toggleBatch(b._id)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-zinc-900  font-medium">{b.name}</span>
                          <span className="ml-auto text-xs text-zinc-500 bg-zinc-200  px-2 py-1 rounded-full">
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
                <div className="mt-8 border-t border-zinc-200  pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-zinc-700 ">
                      Targeted Students ({allowedStudents.length}/{allStudents.length})
                    </label>
                    <button 
                      type="button"
                      onClick={() => setAllowedStudents(allowedStudents.length === allStudents.length ? [] : allStudents.map(s => s._id))}
                      className="text-sm text-blue-600  font-semibold hover:underline"
                    >
                      {allowedStudents.length === allStudents.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2 bg-zinc-50  rounded-xl border border-zinc-200 ">
                    {allStudents.map(student => (
                      <label key={student._id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${allowedStudents.includes(student._id) ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 ' : 'bg-white border-zinc-200   opacity-60 hover:opacity-100'}`}>
                        <input 
                          type="checkbox"
                          checked={allowedStudents.includes(student._id)}
                          onChange={() => toggleStudent(student._id)}
                          className="w-4 h-4 mt-1 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-zinc-900  truncate">{student.name}</p>
                          <p className="text-xs text-zinc-500  truncate">{student.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 mt-3">Uncheck students to prevent them from seeing or taking this exam.</p>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700  mb-2">Start Date & Time</label>
                    <input 
                      type="datetime-local" 
                      value={startTime || ""}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200  bg-zinc-50  text-zinc-900  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
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
                    <label className="block text-sm font-medium text-zinc-700  mb-2">Passing Score (40%)</label>
                    <input 
                      type="number" 
                      value={passingScore || 0}
                      readOnly
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200  bg-zinc-100  text-zinc-500  focus:outline-none cursor-not-allowed font-bold"
                      title="Automatically set to 40% of Total Marks"
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

