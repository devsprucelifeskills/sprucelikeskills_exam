"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default function AdminResults() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");

  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const userRes = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
        if (userRes.data.success && (userRes.data.user.role === "admin" || userRes.data.user.role === "trainer")) {
          setUser(userRes.data.user);
          const coursesRes = await axios.get(`${API_URL}/api/exam/courses`, { withCredentials: true });
          if (coursesRes.data.success) setCourses(coursesRes.data.courses);
        } else {
          router.push("/dashboard");
        }
      } catch {
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const handleCourseChange = async (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedBatchId("");
    setBatches([]);
    setExams([]);
    setError(null);
    if (!courseId) return;

    setLoadingBatches(true);
    try {
      const res = await axios.get(`${API_URL}/api/exam/batches/${courseId}`, { withCredentials: true });
      if (res.data.success) setBatches(res.data.batches);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load batches.");
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleBatchChange = async (batchId: string) => {
    setSelectedBatchId(batchId);
    setExams([]);
    setError(null);
    if (!batchId) return;

    setLoadingExams(true);
    try {
      const res = await axios.get(`${API_URL}/api/exam/admin/exams-by-batch/${batchId}`, { withCredentials: true });
      if (res.data.success) setExams(res.data.exams);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load exams.");
    } finally {
      setLoadingExams(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedBatch = batches.find(b => b._id === selectedBatchId);

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <Navbar user={user} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={user.role} />

        <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-extrabold text-zinc-900 ">Results</h1>
            <p className="text-zinc-500  mt-1">
              Select a course and batch to browse exam results.
            </p>
          </header>

          {/* Filter Row */}
          <div className="bg-white  rounded-2xl border border-zinc-100  shadow-sm p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Course Dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 0 mb-2">
                  Course
                </label>
                <div className="relative">
                  <select
                    id="course-select"
                    value={selectedCourseId}
                    onChange={e => handleCourseChange(e.target.value)}
                    className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border border-zinc-200  bg-zinc-50  text-zinc-900  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all cursor-pointer"
                  >
                    <option value="">— Select a Course —</option>
                    {courses.map(c => (
                      <option key={c._id} value={c._id}>{c.title}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    {loadingBatches ? (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              {/* Batch Dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 0 mb-2">
                  Batch
                </label>
                <div className="relative">
                  <select
                    id="batch-select"
                    value={selectedBatchId}
                    onChange={e => handleBatchChange(e.target.value)}
                    disabled={!selectedCourseId || loadingBatches || batches.length === 0}
                    className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border border-zinc-200  bg-zinc-50  text-zinc-900  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!selectedCourseId
                        ? "— Select a course first —"
                        : loadingBatches
                        ? "Loading batches..."
                        : batches.length === 0
                        ? "— No batches found —"
                        : "— Select a Batch —"}
                    </option>
                    {batches.map(b => (
                      <option key={b._id} value={b._id}>
                        {b.name} ({b.students?.length ?? 0} students)
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    {loadingExams ? (
                      <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Selected info chips */}
            {(selectedCourseId || selectedBatchId) && (
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-zinc-100 ">
                <span className="text-xs text-zinc-400 0">Filtering by:</span>
                {selectedCourseId && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700  text-xs font-semibold border border-blue-100 ">
                    📚 {courses.find(c => c._id === selectedCourseId)?.title}
                  </span>
                )}
                {selectedBatchId && selectedBatch && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 text-xs font-semibold border border-violet-100 dark:border-violet-800">
                    👥 {selectedBatch.name}
                  </span>
                )}
                <button
                  onClick={() => { setSelectedCourseId(""); setSelectedBatchId(""); setBatches([]); setExams([]); setError(null); }}
                  className="ml-auto text-xs text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors font-medium"
                >
                  ✕ Clear
                </button>
              </div>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Exam Cards */}
          {selectedBatchId && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 0 mb-4">
                Exams
              </h2>

              {loadingExams ? (
                <div className="flex items-center gap-2 text-zinc-400 0 text-sm">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Loading exams...
                </div>
              ) : exams.length === 0 ? (
                <div className="bg-white  rounded-2xl border border-zinc-100  p-10 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="font-semibold text-zinc-700 ">No exams found for this batch</p>
                  <p className="text-sm text-zinc-400 0 mt-1">Try selecting a different batch or course.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {exams.map((exam) => (
                    <button
                      key={exam._id}
                      onClick={() => router.push(`/dashboard/results/${exam._id}`)}
                      className="text-left bg-white  border border-zinc-100  rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-bold text-zinc-900  group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                          {exam.title}
                        </h3>
                        <span className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                          exam.isActive
                            ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-zinc-100 text-zinc-500  "
                        }`}>
                          {exam.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {exam.description && (
                        <p className="text-sm text-zinc-500  mb-3 line-clamp-2">{exam.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-zinc-400 0">
                        <span>⏱ {exam.duration} min</span>
                        <span>🎯 Pass: {exam.passingScore}/{exam.totalMarks}</span>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs text-zinc-400 0">
                          {new Date(exam.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs font-semibold text-blue-600  group-hover:underline">
                          View Results →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Initial empty state */}
          {!selectedCourseId && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-6xl mb-4">🎓</div>
              <h3 className="text-xl font-bold text-zinc-700  mb-2">Select a Course to Begin</h3>
              <p className="text-zinc-400 0 text-sm">Choose a course and batch from the dropdowns above to view exam results.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

