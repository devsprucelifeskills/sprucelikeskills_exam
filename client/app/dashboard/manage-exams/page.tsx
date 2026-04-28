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

  useEffect(() => {
    const init = async () => {
      try {
        const userRes = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
        if (userRes.data.success && (userRes.data.user.role === "admin" || userRes.data.user.role === "trainer")) {
          setUser(userRes.data.user);
          const examsRes = await axios.get(`${API_URL}/api/exam/admin/all`, { withCredentials: true });
          if (examsRes.data.success) {
            setExams(examsRes.data.exams);
          }
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
        
        <main className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full pb-20">
          <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
            <div>
              <h1 className="text-4xl font-black text-zinc-900 tracking-tight">Manage Exams</h1>
              <p className="text-zinc-500 mt-2 font-medium">Create, edit and analyze your assessments.</p>
            </div>
            <Link 
              href="/dashboard/create-exam"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              CREATE NEW EXAM
            </Link>
          </header>

          {exams.length === 0 ? (
            <div className="bg-white rounded-[40px] p-20 text-center border border-zinc-100 shadow-xl shadow-zinc-200/50 animate-in zoom-in-95 duration-700">
              <div className="text-7xl mb-6">✍️</div>
              <h3 className="text-2xl font-black text-zinc-900 mb-2">No Exams Created</h3>
              <p className="text-zinc-500 font-medium mb-8 max-w-sm mx-auto">Get started by creating your first assessment for your students.</p>
              <Link href="/dashboard/create-exam" className="inline-flex items-center gap-2 text-blue-600 font-black hover:gap-3 transition-all">
                Create your first exam <span className="text-xl">→</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {exams.map((exam) => (
                <div key={exam._id} className="group bg-white rounded-[32px] p-8 shadow-sm border border-zinc-100 hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-black text-zinc-900">{exam.title}</h3>
                      <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${exam.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-zinc-100 text-zinc-400'}`}>
                        {exam.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-zinc-400">
                      <div className="flex items-center gap-2"><span className="text-lg">📅</span> {new Date(exam.startTime).toLocaleDateString()}</div>
                      <div className="flex items-center gap-2"><span className="text-lg">⏱️</span> {exam.duration}m</div>
                      <div className="flex items-center gap-2"><span className="text-lg">❓</span> {exam.questions.length} Qs</div>
                      <div className="flex items-center gap-2"><span className="text-lg">🎯</span> {exam.totalMarks} Marks</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Link 
                      href={`/dashboard/exams/edit/${exam._id}`}
                      className="flex-1 sm:flex-none px-6 py-3 bg-zinc-50 text-zinc-600 rounded-xl text-xs font-black hover:bg-zinc-900 hover:text-white transition-all duration-300 text-center"
                    >
                      EDIT
                    </Link>
                    <Link 
                      href={`/dashboard/results/${exam._id}`}
                      className="flex-1 sm:flex-none px-6 py-3 bg-blue-50 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition-all duration-300 text-center"
                    >
                      RESULTS
                    </Link>
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


