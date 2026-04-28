"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default function AvailableExams() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const userRes = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
        if (userRes.data.success) {
          setUser(userRes.data.user);
          const examsRes = await axios.get(`${API_URL}/api/exam/available`, { withCredentials: true });
          if (examsRes.data.success) {
            setExams(examsRes.data.exams);
          }
        } else {
          router.push("/");
        }
      } catch (err) {
        console.error(err);
        router.push("/");
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
          <header className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-wider mb-4 border border-blue-100">
              Active Assessments
            </div>
            <h1 className="text-4xl font-black text-zinc-900 tracking-tight">Available Exams</h1>
            <p className="text-zinc-500 mt-2 font-medium text-lg">Select an assessment to begin your session.</p>
          </header>

          {exams.length === 0 ? (
            <div className="bg-white rounded-[40px] p-20 text-center border border-zinc-100 shadow-xl shadow-zinc-200/50 animate-in zoom-in-95 duration-700">
              <div className="text-7xl mb-6">📭</div>
              <h3 className="text-2xl font-black text-zinc-900 mb-2">No Exams Available</h3>
              <p className="text-zinc-500 font-medium max-w-sm mx-auto">You don't have any pending assessments assigned to your batches right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {exams.map((exam) => (
                <div key={exam._id} className="group bg-white rounded-[32px] p-8 shadow-sm border border-zinc-100 flex flex-col h-full hover:shadow-2xl hover:shadow-zinc-200/50 transition-all duration-500">
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-6">
                      <span className="px-3 py-1 bg-zinc-50 text-zinc-500 text-[10px] font-black rounded-full uppercase tracking-wider border border-zinc-100 truncate max-w-[150px]">
                        {exam.batchName}
                      </span>
                      {exam.isAttempted && (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-wider border border-emerald-100">
                          Completed
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl font-black text-zinc-900 mb-3 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                      {exam.title}
                    </h3>
                    {exam.description && (
                      <p className="text-zinc-500 text-sm mb-6 line-clamp-3 leading-relaxed">{exam.description}</p>
                    )}

                    <div className="flex items-center gap-6 text-xs font-bold text-zinc-400 mb-8">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⏱️</span> {exam.duration}m
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎯</span> {exam.totalMarks} Marks
                      </div>
                    </div>
                  </div>

                  {exam.isAttempted ? (
                    <Link
                      // href="/dashboard/my-results"
                      href="#"
                      className="w-full py-4 rounded-2xl bg-zinc-100 text-zinc-800 font-black text-xs text-center block hover:bg-zinc-900 hover:text-white transition-all duration-300"
                    >
                      completed
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/exams/${exam._id}`}
                      className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-xs text-center block hover:bg-blue-700 transition-all duration-300 shadow-xl shadow-blue-500/20 active:scale-95"
                    >
                      START EXAM
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


