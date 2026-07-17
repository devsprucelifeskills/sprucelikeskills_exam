"use client";

import { useState, useEffect, use } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import * as XLSX from "xlsx";

export default function ExamResultsPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reconducting, setReconducting] = useState<string | null>(null);

  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [downloadingJson, setDownloadingJson] = useState(false);

  const getFilteredResults = () => {
    if (!filterStartDate && !filterEndDate) return results;
    return results.filter((r) => {
      const date = new Date(r.createdAt);
      if (filterStartDate) {
        const start = new Date(filterStartDate);
        start.setHours(0, 0, 0, 0);
        if (date < start) return false;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        if (date > end) return false;
      }
      return true;
    });
  };

  const toIST = (date: string | Date) => {
    const d = new Date(date);
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const ist = new Date(d.getTime() + IST_OFFSET_MS);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(ist.getUTCDate())}/${pad(ist.getUTCMonth() + 1)}/${ist.getUTCFullYear()}, ${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())}`;
  };

  const filteredResults = getFilteredResults();

  const exportToExcel = () => {
    if (!filteredResults.length || !exam) return;

    const data = filteredResults.map((r, index) => ({
      "Rank": index + 1,
      "Student Name": r.studentName,
      "Email": r.studentEmail,
      "Score": r.score,
      "Total Marks": exam.totalMarks,
      "Percentage": ((r.score / exam.totalMarks) * 100).toFixed(2) + "%",
      "Status": r.isPassed ? "PASSED" : "FAILED",
      "Started At": r.startedAt ? toIST(r.startedAt) : "N/A",
      "Submitted At": toIST(r.createdAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

    worksheet["!cols"] = [
      { wch: 6 },  // Rank
      { wch: 25 }, // Name
      { wch: 30 }, // Email
      { wch: 8 },  // Score
      { wch: 12 }, // Total
      { wch: 12 }, // Percentage
      { wch: 10 }, // Status
      { wch: 25 }, // Started At
      { wch: 25 }, // Submitted At
    ];

    const suffix = filterStartDate || filterEndDate
      ? `_Filtered_${filterStartDate || "start"}_to_${filterEndDate || "end"}`
      : "";
    XLSX.writeFile(workbook, `${exam.title.replace(/\s+/g, "_")}_Results${suffix}.xlsx`);
  };

  const downloadJson = async () => {
    setDownloadingJson(true);
    try {
      const params = new URLSearchParams();
      if (filterStartDate) params.append("startDate", filterStartDate);
      if (filterEndDate) params.append("endDate", filterEndDate);

      const queryString = params.toString();
      const url = `${API_URL}/api/exam/admin/exam-results/${examId}/json${queryString ? `?${queryString}` : ""}`;

      const res = await axios.get(url, { withCredentials: true });

      const data = res.data;
      data.exam.startTime = data.exam.startTime ? toIST(data.exam.startTime) : null;
      data.exam.endTime = data.exam.endTime ? toIST(data.exam.endTime) : null;
      data.results = data.results.map((r: any) => ({
        ...r,
        startedAt: r.startedAt ? toIST(r.startedAt) : null,
        submittedAt: r.submittedAt ? toIST(r.submittedAt) : null,
      }));

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const suffix = filterStartDate || filterEndDate
        ? `_Filtered_${filterStartDate || "start"}_to_${filterEndDate || "end"}`
        : "";
      link.download = `${exam.title.replace(/\s+/g, "_")}_Results${suffix}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to download JSON");
    } finally {
      setDownloadingJson(false);
    }
  };

  const fetchData = async () => {
    try {
      const userRes = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
      if (!userRes.data.success || !["admin", "trainer"].includes(userRes.data.user.role)) {
        router.push("/dashboard");
        return;
      }
      setUser(userRes.data.user);

      const res = await axios.get(`${API_URL}/api/exam/admin/exam-results/${examId}`, { withCredentials: true });
      if (res.data.success) {
        setExam(res.data.exam);
        setResults(res.data.results);
        setStats(res.data.stats);
      }
    } catch {
      router.push("/dashboard/results");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [examId]);

  const handleReconduct = async (result: any) => {
    const confirmed = window.confirm(
      `Allow "${result.studentName}" to retake this exam? Their current result will be deleted.`
    );
    if (!confirmed) return;

    setReconducting(result._id);
    try {
      const res = await axios.post(
          `${API_URL}/api/exam/admin/reconduct/${examId}/${result.studentId}`,
        {},
        { withCredentials: true }
      );
      if (res.data.success) {
        setResults((prev) => prev.filter((r) => r._id !== result._id));
        setStats((prev: any) => ({
          ...prev,
          totalSubmissions: prev.totalSubmissions - 1,
          passed: result.isPassed ? prev.passed - 1 : prev.passed,
          avgScore: prev.totalSubmissions - 1 === 0
            ? 0
            : Math.round(
                ((prev.avgScore * prev.totalSubmissions - result.score) / (prev.totalSubmissions - 1)) * 100
              ) / 100,
        }));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to reconduct exam.");
    } finally {
      setReconducting(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const passRate = stats?.totalSubmissions > 0
    ? Math.round((stats.passed / stats.totalSubmissions) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <Navbar user={user} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={user.role} />

        <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">

          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-zinc-500  hover:text-zinc-900 dark:hover:text-zinc-100 mb-6 transition-colors"
          >
            ← Back to Results
          </button>

          {/* Exam header */}
          <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold text-zinc-900 ">{exam?.title}</h1>
              {exam?.description && (
                <p className="text-zinc-500  mt-1">{exam.description}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-zinc-500 ">
                <span>⏱ {exam?.duration} min</span>
                <span>🎯 Passing Score: {exam?.passingScore} / {exam?.totalMarks}</span>
                <span>📝 {exam?.questions?.length} questions</span>
                {exam?.startTime && (
                  <span>🚀 Started: {toIST(exam.startTime)}</span>
                )}
              </div>
            </div>

            {results.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Excel
                </button>
                <button
                  onClick={downloadJson}
                  disabled={downloadingJson}
                  className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-60"
                >
                  {downloadingJson ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  Download JSON
                </button>
              </div>
            )}
          </header>

          {/* Date range filter */}
          {results.length > 0 && (
            <div className="bg-zinc-50  rounded-2xl p-4 mb-8 flex flex-wrap items-end gap-4 border border-zinc-100 ">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500  uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200  bg-white  text-zinc-900  text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500  uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200  bg-white  text-zinc-900  text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {(filterStartDate || filterEndDate) && (
                <button
                  onClick={() => { setFilterStartDate(""); setFilterEndDate(""); }}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200  bg-white  text-zinc-600  text-sm font-bold hover:bg-zinc-100  transition-colors"
                >
                  Clear Filters
                </button>
              )}
              <div className="ml-auto text-sm text-zinc-500  font-medium">
                Showing <span className="font-bold text-zinc-900 ">{filteredResults.length}</span> of {results.length} results
              </div>
            </div>
          )}

          {/* Stats cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard label="Total Submissions" value={stats.totalSubmissions} color="blue" icon="📋" />
              <StatCard
                label="Pass Rate"
                value={`${passRate}%`}
                sub={`${stats.passed} / ${stats.totalSubmissions} passed`}
                color="green"
                icon="✅"
              />
              <StatCard label="Average Score" value={stats.avgScore} sub={`out of ${exam?.totalMarks}`} color="violet" icon="📊" />
            </div>
          )}

          {/* Results table */}
          {filteredResults.length === 0 ? (
            <div className="bg-white  rounded-3xl p-12 text-center border border-zinc-100  shadow-sm">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-zinc-900  mb-2">
                {results.length === 0 ? "No Submissions Yet" : "No Results Match Filter"}
              </h3>
              <p className="text-zinc-500 ">
                {results.length === 0
                  ? "No students have submitted this exam."
                  : "Try adjusting the date range filters."}
              </p>
            </div>
          ) : (
            <div className="bg-white  rounded-3xl shadow-sm border border-zinc-100  overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50  text-zinc-500  text-xs uppercase tracking-wider">
                      <th className="p-4 font-semibold border-b border-zinc-200 ">#</th>
                      <th className="p-4 font-semibold border-b border-zinc-200 ">Student</th>
                      <th className="p-4 font-semibold border-b border-zinc-200 ">Started At</th>
                      <th className="p-4 font-semibold border-b border-zinc-200 ">Submitted At</th>
                      <th className="p-4 font-semibold border-b border-zinc-200  text-center">Score</th>
                      <th className="p-4 font-semibold border-b border-zinc-200  text-center">Status</th>
                      <th className="p-4 font-semibold border-b border-zinc-200  text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredResults.map((result, idx) => (
                      <tr key={result._id} className="hover:bg-zinc-50/50  transition-colors">
                        <td className="p-4 text-zinc-400 0 text-sm">{idx + 1}</td>
                        <td className="p-4">
                          <p className="font-bold text-zinc-900 ">{result.studentName}</p>
                          <p className="text-sm text-zinc-500 ">{result.studentEmail}</p>
                        </td>
                        <td className="p-4 text-zinc-600  text-sm">
                          {result.startedAt
                            ? toIST(result.startedAt)
                            : <span className="text-zinc-400 italic">N/A</span>
                          }
                        </td>
                        <td className="p-4 text-zinc-600  text-sm">
                          {toIST(result.createdAt)}
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-mono font-bold text-zinc-900  text-lg">
                            {result.score}
                          </span>
                          <span className="text-zinc-400 text-sm"> / {exam?.totalMarks}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                            result.isPassed
                              ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                          }`}>
                            {result.isPassed ? "PASSED" : "FAILED"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleReconduct(result)}
                            disabled={reconducting === result._id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {reconducting === result._id ? (
                              <>
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>🔄 Reconduct</>
                            )}
                          </button>
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

function StatCard({
  label, value, sub, color, icon
}: {
  label: string; value: string | number; sub?: string; color: "blue" | "green" | "violet"; icon: string;
}) {
  const colors = {
    blue: "from-blue-50 to-blue-100/50   border-blue-100 /50",
    green: "from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/10 border-green-100 dark:border-green-800/50",
    violet: "from-violet-50 to-violet-100/50 dark:from-violet-900/20 dark:to-violet-900/10 border-violet-100 dark:border-violet-800/50",
  };
  const textColors = {
    blue: "text-blue-700 dark:text-blue-300",
    green: "text-green-700 dark:text-green-300",
    violet: "text-violet-700 dark:text-violet-300",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-3xl font-black ${textColors[color]}`}>{value}</div>
      <div className="text-sm font-semibold text-zinc-600  mt-1">{label}</div>
      {sub && <div className="text-xs text-zinc-400 0 mt-0.5">{sub}</div>}
    </div>
  );
}
