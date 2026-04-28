"use client";

import { useState, useEffect, use } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

interface Question {
  text: string;
  options: string[];
  correctOptionIndex: number;
  correctAnswerIndex?: number;
  marks: number;
  image?: string;
}

export default function EditExam({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Exam States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [startTime, setStartTime] = useState("");
  const [passingScore, setPassingScore] = useState<number>(40);
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [allowedStudents, setAllowedStudents] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Data States
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
        if (!userRes.data.success || (userRes.data.user.role !== "admin" && userRes.data.user.role !== "trainer")) {
          router.push("/dashboard");
          return;
        }
        setUser(userRes.data.user);

        // Fetch Exam Data
        const examRes = await axios.get(`${API_URL}/api/exam/${id}`, { withCredentials: true });
        if (examRes.data.success) {
          const e = examRes.data.exam;
          setTitle(e.title);
          setDescription(e.description || "");
          setDuration(e.duration);
          // Format Date for datetime-local
          if (e.startTime) {
            const date = new Date(e.startTime);
            if (!isNaN(date.getTime())) {
              const formattedDate = date.toISOString().slice(0, 16);
              setStartTime(formattedDate);
            }
          }
          setPassingScore(e.passingScore);
          setTotalMarks(e.totalMarks);
          setSelectedCourse(e.courseId);
          setSelectedBatches(e.batchIds || []);
          setAllowedStudents(e.allowedStudents || []);
          setQuestions(e.questions);
        }

        // Fetch Courses
        const coursesRes = await axios.get(`${API_URL}/api/exam/courses`, { withCredentials: true });
        if (coursesRes.data.success) setCourses(coursesRes.data.courses);

      } catch (err) {
        console.error(err);
        router.push("/dashboard/manage-exams");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  useEffect(() => {
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

  useEffect(() => {
    if (!selectedBatches.length) {
      setAllStudents([]);
      return;
    }
    const studentsList: any[] = [];
    selectedBatches.forEach(bId => {
      const batch = batches.find(b => b._id === bId);
      if (batch && batch.students) {
        batch.students.forEach((s: any) => {
          if (!studentsList.find(existing => existing._id === s._id)) {
            studentsList.push(s);
          }
        });
      }
    });
    setAllStudents(studentsList);
  }, [selectedBatches, batches]);

  // Dynamically calculate total marks and passing score (40%)
  useEffect(() => {
    const total = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    setTotalMarks(total);
    setPassingScore(Math.ceil(total * 0.4));
  }, [questions]);

  const toggleBatch = (batchId: string) => {
    setSelectedBatches(prev => 
      prev.includes(batchId) ? prev.filter(id => id !== batchId) : [...prev, batchId]
    );
  };

  const toggleStudent = (studentId: string) => {
    setAllowedStudents(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: "", options: ["", "", "", ""], correctOptionIndex: 0, marks: 1, image: "" }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof Question, value: any, optionIndex?: number) => {
    const updated = [...questions];
    if (field === "options" && typeof optionIndex === "number") {
      updated[index].options[optionIndex] = value;
    } else if (field === "marks") {
      updated[index].marks = value;
    } else if (field === "image") {
      updated[index].image = value;
    } else if (field === "text") {
        updated[index].text = value;
    } else if (field === "correctOptionIndex") {
        updated[index].correctOptionIndex = value;
    }
    setQuestions(updated);
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
    setSaving(true);

    if (!title || !selectedCourse || selectedBatches.length === 0 || !startTime) {
      alert("Please fill all basic details, select at least one batch, and provide a start time.");
      setSaving(false);
      return;
    }

    try {
      const res = await axios.put(`${API_URL}/api/exam/admin/${id}`, {
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
        alert("Exam updated successfully!");
        router.push("/dashboard/manage-exams");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to update exam");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <Navbar user={user} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={user.role} />
        
        <main className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full pb-20">
          <header className="mb-10">
            <div className="flex items-center gap-4 mb-4">
               <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white  border border-zinc-200  flex items-center justify-center text-zinc-600  hover:bg-zinc-50 transition-colors">←</button>
               <h1 className="text-3xl font-extrabold text-zinc-900 ">Edit Exam</h1>
            </div>
            <p className="text-zinc-500 ">Modify the assessment details and questions below.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Target Audience */}
            <div className="bg-white  rounded-3xl p-8 shadow-sm border border-zinc-100 ">
              <h2 className="text-xl font-bold mb-6 text-zinc-900 ">1. Target Audience</h2>
              
              <div className="mb-8">
                <label className="block text-sm font-medium text-zinc-700  mb-2">Select Course</label>
                <select 
                  value={selectedCourse}
                  onChange={e => setSelectedCourse(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200  bg-zinc-50  text-zinc-900  focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Choose a course...</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>{course.title}</option>
                  ))}
                </select>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-zinc-700  mb-4">Select Batches</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {batches.map(batch => (
                    <label key={batch._id} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${selectedBatches.includes(batch._id) ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 ' : 'bg-zinc-50 border-zinc-100   opacity-60 hover:opacity-100'}`}>
                      <input 
                        type="checkbox"
                        checked={selectedBatches.includes(batch._id)}
                        onChange={() => toggleBatch(batch._id)}
                        className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500"
                      />
                      <span className={`font-bold text-sm ${selectedBatches.includes(batch._id) ? 'text-blue-700 ' : 'text-zinc-700 '}`}>{batch.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {allStudents.length > 0 && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-medium text-zinc-700 ">Select Students ({allowedStudents.length}/{allStudents.length})</label>
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
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200  bg-zinc-50  text-zinc-900  focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Midterm Assessment"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700  mb-2">Description (Optional)</label>
                  <textarea 
                    value={description || ""}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200  bg-zinc-50  text-zinc-900  focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
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
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200  bg-zinc-50  text-zinc-900  focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700  mb-2">Duration (mins)</label>
                    <input 
                      type="number" 
                      value={duration || 0}
                      onChange={e => setDuration(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200  bg-zinc-50  text-zinc-900  focus:ring-2 focus:ring-blue-500 outline-none"
                      min={1}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700  mb-2">Total Marks</label>
                    <input 
                      type="number" 
                      value={totalMarks || 0}
                      readOnly
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200  bg-zinc-100  text-zinc-500  focus:outline-none cursor-not-allowed font-bold"
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
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-extrabold text-zinc-900 ">3. Questions ({questions.length})</h2>
                <button 
                  type="button" 
                  onClick={addQuestion}
                  className="px-6 py-2.5 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl font-bold hover:scale-105 transition-all text-sm shadow-xl shadow-zinc-200 dark:shadow-none"
                >
                  + Add Question
                </button>
              </div>

              {questions.map((q, qIndex) => (
                <div key={qIndex} className="bg-white  rounded-3xl p-8 shadow-sm border border-zinc-100  group animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                       <span className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">{qIndex + 1}</span>
                       <div className="flex items-center gap-3">
                          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Marks:</label>
                          <input 
                            type="number"
                            value={q.marks}
                            onChange={e => handleQuestionChange(qIndex, "marks", Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-zinc-50  border border-zinc-200  rounded-lg text-sm font-bold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            min={1}
                          />
                       </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeQuestion(qIndex)}
                      className="text-zinc-300 hover:text-red-500 transition-colors p-2"
                      title="Remove Question"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>

                  <div className="mb-6">
                    <input 
                      type="text"
                      value={q.text}
                      onChange={e => handleQuestionChange(qIndex, "text", e.target.value)}
                      placeholder="Enter question text here..."
                      className="w-full px-4 py-3 mb-4 rounded-xl border border-zinc-200  bg-white  text-zinc-900  focus:ring-2 focus:ring-blue-500 outline-none"
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
                    <div className="space-y-4">
                      {q.options.map((opt, oIndex) => {
                        const isCorrect = (
                          (q.correctOptionIndex !== undefined && Number(q.correctOptionIndex) === oIndex) ||
                          (q.correctAnswerIndex !== undefined && Number(q.correctAnswerIndex) === oIndex)
                        );
                        
                        return (
                          <div key={oIndex} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-transparent hover:bg-white hover:border-zinc-200'}`}>
                            <input 
                              type="radio"
                              name={`correct-${qIndex}`}
                              checked={isCorrect}
                              onChange={() => handleQuestionChange(qIndex, "correctOptionIndex", oIndex)}
                              className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 border-zinc-300"
                            />
                            <input 
                              type="text"
                              value={opt || ""}
                              onChange={e => handleQuestionChange(qIndex, "options", e.target.value, oIndex)}
                              placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                              className="flex-1 bg-transparent text-zinc-800 font-medium focus:outline-none"
                              required
                            />
                            {isCorrect && (
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-white px-2 py-1 rounded-lg border border-emerald-100 shadow-sm">
                                Correct Answer
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-50">
               <button 
                type="submit" 
                disabled={saving}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/40 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating Exam...
                  </>
                ) : "Save All Changes"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

