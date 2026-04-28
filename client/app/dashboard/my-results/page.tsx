"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default function MyResults() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const userRes = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
        if (userRes.data.success) {
          setUser(userRes.data.user);
          
          const resultsRes = await axios.get(`${API_URL}/api/exam/my-results/all`, { withCredentials: true });
          if (resultsRes.data.success) {
            setResults(resultsRes.data.results);
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
        
        <main className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
          <header className="mb-8">
            <h1 className="text-3xl font-extrabold text-zinc-900 ">My Results</h1>
            <p className="text-zinc-500  mt-2">View your past exam performances and scores.</p>
          </header>

          {results.length === 0 ? (
            <div className="bg-white  rounded-3xl p-12 text-center border border-zinc-100  shadow-sm">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-zinc-900  mb-2">No Results Found</h3>
              <p className="text-zinc-500 ">You haven't completed any exams yet.</p>
            </div>
          ) : (
            <div className="bg-white  rounded-3xl shadow-sm border border-zinc-100  overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50  text-zinc-500  text-sm uppercase tracking-wider">
                      <th className="p-4 font-semibold border-b border-zinc-200 ">Exam Title</th>
                      <th className="p-4 font-semibold border-b border-zinc-200 ">Date Taken</th>
                      <th className="p-4 font-semibold border-b border-zinc-200 ">Score</th>
                      <th className="p-4 font-semibold border-b border-zinc-200 ">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {results.map((result) => (
                      <tr key={result._id} className="hover:bg-zinc-50/50  transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-zinc-900 ">{result.examId?.title || "Deleted Exam"}</p>
                          <p className="text-xs text-zinc-500 ">Passing Score: {result.examId?.passingScore}</p>
                        </td>
                        <td className="p-4 text-zinc-600 ">
                          {new Date(result.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4 font-mono font-bold text-zinc-900 ">
                          {result.score} <span className="text-zinc-400 text-xs font-sans">/ {result.examId?.totalMarks}</span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                            result.isPassed 
                              ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" 
                              : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                          }`}>
                            {result.isPassed ? "PASSED" : "FAILED"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

