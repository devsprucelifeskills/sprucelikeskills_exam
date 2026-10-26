"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default function ManageExams() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [filterType, setFilterType] = useState<"all" | "actual" | "mock">("all");

  const fetchExams = async () => {
    const examsRes = await axios.get(`${API_URL}/api/exam/admin/all`, { withCredentials: true });
    if (examsRes.data.success) {
      setExams(examsRes.data.exams);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const userRes = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
        if (userRes.data.success && (userRes.data.user.role === "admin" || userRes.data.user.role === "trainer")) {
          setUser(userRes.data.user);
          await fetchExams();
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error(err);
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const handleToggleActive = async (examId: string) => {
    try {
      const res = await axios.patch(`${API_URL}/api/exam/admin/toggle-active/${examId}`, {}, { withCredentials: true });
      if (res.data.success) {
        setExams((prev) =>
          prev.map((e) => (e._id === examId ? { ...e, isActive: !e.isActive } : e))
        );
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update exam status");
    }
  };

  const handleToggleShowResult = async (examId: string) => {
    try {
      const res = await axios.patch(`${API_URL}/api/exam/admin/toggle-show-result/${examId}`, {}, { withCredentials: true });
      if (res.data.success) {
        setExams((prev) =>
          prev.map((e) => (e._id === examId ? { ...e, showResult: !e.showResult } : e))
        );
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update result visibility");
    }
  };

  const handleDelete = async (examId: string) => {
    if (!confirm("Are you sure you want to delete this exam? This action cannot be undone.")) return;
    try {
      const res = await axios.delete(`${API_URL}/api/exam/admin/${examId}`, { withCredentials: true });
      if (res.data.success) {
        setExams((prev) => prev.filter((e) => e._id !== examId));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete exam");
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const actualCount = exams.filter(e => !e.is_mock && !e.isMockExam).length;
  const mockCount = exams.filter(e => e.is_mock || e.isMockExam).length;

  const filteredExams = exams.filter(exam => {
    const isMock = !!(exam.is_mock || exam.isMockExam);
    if (filterType === "mock") return isMock;
    if (filterType === "actual") return !isMock;
    return true;
  });

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <Navbar user={user} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={user.role} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-6xl mx-auto w-full pb-20">
          <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight">Manage Exams</h1>
              <p className="text-zinc-500 mt-2 font-medium text-sm md:text-base">Create, edit and analyze your assessments.</p>
            </div>
            <Link 
              href="/dashboard/create-exam"
              className="inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-xs md:text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              CREATE NEW EXAM
            </Link>
          </header>

          {/* Assessment Filter Tabs */}
          <div className="flex items-center gap-2 mb-8 p-1.5 bg-zinc-100 rounded-2xl w-fit">
            <button
              onClick={() => setFilterType("all")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filterType === "all" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              All Exams ({exams.length})
            </button>
            <button
              onClick={() => setFilterType("actual")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filterType === "actual" ? "bg-white text-blue-600 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <span>🎯 Actual Exams</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-600 font-bold">{actualCount}</span>
            </button>
            <button
              onClick={() => setFilterType("mock")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filterType === "mock" ? "bg-white text-purple-600 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <span>🧪 Mock Tests (is_mock)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-600 font-bold">{mockCount}</span>
            </button>
          </div>

          {filteredExams.length === 0 ? (
            <div className="bg-white rounded-[40px] p-20 text-center border border-zinc-100 shadow-xl shadow-zinc-200/50 animate-in zoom-in-95 duration-700">
              <div className="text-7xl mb-6">{filterType === "mock" ? "🧪" : "✍️"}</div>
              <h3 className="text-2xl font-black text-zinc-900 mb-2">
                {filterType === "mock" ? "No Mock Exams Found" : filterType === "actual" ? "No Actual Exams Found" : "No Exams Created"}
              </h3>
              <p className="text-zinc-500 font-medium mb-8 max-w-sm mx-auto">
                {filterType === "mock"
                  ? "Create your first practice test with is_mock enabled."
                  : "Get started by creating your first assessment for your students."}
              </p>
              <Link href="/dashboard/create-exam" className="inline-flex items-center gap-2 text-blue-600 font-black hover:gap-3 transition-all">
                Create new exam <span className="text-xl">→</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {filteredExams.map((exam) => (
                <div key={exam._id} className="group bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-sm border border-zinc-100 hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <h3 className="text-lg md:text-xl font-black text-zinc-900">{exam.title}</h3>

                      {/* Mock vs Actual Badge */}
                      {exam.is_mock || exam.isMockExam ? (
                        <span className="px-2.5 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                          🧪 Mock Test
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                          🎯 Actual Exam
                        </span>
                      )}

                      {exam.isInterviewPrep && (
                        <span className="px-2.5 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          💼 Interview Prep
                        </span>
                      )}

                      <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-full uppercase tracking-widest ${exam.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-zinc-100 text-zinc-400'}`}>
                        {exam.isActive ? 'Active' : 'Inactive'}
                      </span>

                      <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider ${exam.showResult ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-zinc-100 text-zinc-500'}`}>
                        {exam.showResult ? '📊 Results Visible' : '🔒 Results Hidden'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-x-6 gap-y-2 text-[10px] md:text-xs font-bold text-zinc-400">
                      <div className="flex items-center gap-2"><span className="text-base md:text-lg">📅</span> {new Date(exam.startTime).toLocaleDateString()}</div>
                      <div className="flex items-center gap-2"><span className="text-base md:text-lg">⏱️</span> {exam.duration}m</div>
                      <div className="flex items-center gap-2"><span className="text-base md:text-lg">❓</span> {exam.questions.length} Qs</div>
                      <div className="flex items-center gap-2"><span className="text-base md:text-lg">🎯</span> {exam.totalMarks} Marks</div>

                      {exam.questionsPerStudent > 0 && (
                        <div className="flex items-center gap-1.5 text-purple-600 font-extrabold">
                          <span>🎲</span> {exam.questionsPerStudent} Qs/Student sampled
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Link 
                      href={`/dashboard/exams/edit/${exam._id}`}
                      className="flex-1 sm:flex-none px-4 md:px-6 py-3 bg-zinc-50 text-zinc-600 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black hover:bg-zinc-900 hover:text-white transition-all duration-300 text-center"
                    >
                      EDIT
                    </Link>
                    <Link 
                      href={`/dashboard/results/${exam._id}`}
                      className="flex-1 sm:flex-none px-4 md:px-6 py-3 bg-blue-50 text-blue-600 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black hover:bg-blue-600 hover:text-white transition-all duration-300 text-center"
                    >
                      RESULTS
                    </Link>
                    <button
                      onClick={() => handleToggleActive(exam._id)}
                      className={`flex-1 sm:flex-none px-4 md:px-6 py-3 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black transition-all duration-300 text-center ${
                        exam.isActive
                          ? 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white'
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white'
                      }`}
                    >
                      {exam.isActive ? 'DEACTIVATE' : 'ACTIVATE'}
                    </button>
                    <button
                      onClick={() => handleToggleShowResult(exam._id)}
                      title={exam.showResult ? "Hide answers from students" : "Publish results and answer breakdown to students"}
                      className={`flex-1 sm:flex-none px-4 md:px-5 py-3 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black transition-all duration-300 text-center ${
                        exam.showResult
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-600 hover:text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-indigo-600 hover:text-white'
                      }`}
                    >
                      {exam.showResult ? 'HIDE RESULTS' : 'PUBLISH RESULTS'}
                    </button>
                    <button
                      onClick={() => handleDelete(exam._id)}
                      className="flex-1 sm:flex-none px-4 md:px-6 py-3 bg-red-50 text-red-600 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black hover:bg-red-500 hover:text-white transition-all duration-300 text-center"
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


