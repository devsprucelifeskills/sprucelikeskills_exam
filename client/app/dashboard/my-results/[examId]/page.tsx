"use client";

import { useState, useEffect, use } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

interface QuestionResult {
  questionIndex: number;
  text: string;
  options: string[];
  correctOptionIndex: number;
  marks: number;
  image?: string;
  studentSelectedOptionIndex: number | null;
  isCorrect: boolean;
}

export default function ExamResultDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(true);
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect" | "unanswered">("all");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
        if (!userRes.data.success) {
          router.push("/");
          return;
        }
        setUser(userRes.data.user);

        const res = await axios.get(`${API_URL}/api/exam/my-results/${examId}`, { withCredentials: true });
        if (res.data.success) {
          setExam(res.data.exam);
          setResult(res.data.result);
          setShowResult(res.data.showResult);
        } else {
          setErrorMsg(res.data.message || "Unable to fetch exam result");
        }
      } catch (err: any) {
        console.error("Error fetching exam result detail:", err);
        setErrorMsg(err.response?.data?.message || "Failed to load exam result details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [examId, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50">
        <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-500 font-bold text-sm tracking-wide">Loading detailed exam breakdown...</p>
      </div>
    );
  }

  // When results are pending/hidden by instructor
  if (!showResult || !result?.questions) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans flex flex-col">
        <Navbar user={user} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar role={user.role} />
          <main className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full">
            <Link
              href="/dashboard/my-results"
              className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-blue-600 transition-colors mb-6"
            >
              ← Back to My Results
            </Link>

            <div className="bg-white rounded-3xl p-10 md:p-14 text-center border border-zinc-200/80 shadow-sm">
              <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-inner border border-amber-100">
                🔒
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight mb-3">
                Results Not Yet Released
              </h2>
              <p className="text-zinc-500 text-sm md:text-base max-w-md mx-auto leading-relaxed mb-6">
                Your instructor has not yet published the question-by-question breakdown and correct answers for{" "}
                <span className="font-bold text-zinc-800">{exam?.title || "this exam"}</span>.
              </p>

              {result && (
                <div className="inline-block bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4 mb-8 text-left">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Score Logged</p>
                      <p className="text-xl font-black text-zinc-900">
                        {result.score} <span className="text-xs text-zinc-400">/ {exam?.totalMarks}</span>
                      </p>
                    </div>
                    <div className="h-8 w-px bg-zinc-200" />
                    <div>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</p>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider mt-0.5 ${
                        result.isPassed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      }`}>
                        {result.isPassed ? "PASSED" : "FAILED"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Link
                  href="/dashboard/my-results"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-all shadow-md"
                >
                  Return to Results List
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const questions: QuestionResult[] = result.questions || [];
  const totalQuestions = questions.length;
  const correctCount = questions.filter(q => q.isCorrect).length;
  const unansweredCount = questions.filter(q => q.studentSelectedOptionIndex === null || q.studentSelectedOptionIndex === undefined).length;
  const incorrectCount = totalQuestions - correctCount - unansweredCount;

  const percentage = exam?.totalMarks > 0 ? Math.round((result.score / exam.totalMarks) * 100) : 0;

  const filteredQuestions = questions.filter(q => {
    const isUnanswered = q.studentSelectedOptionIndex === null || q.studentSelectedOptionIndex === undefined;
    if (filter === "correct") return q.isCorrect;
    if (filter === "incorrect") return !q.isCorrect && !isUnanswered;
    if (filter === "unanswered") return isUnanswered;
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-50/70 font-sans flex flex-col">
      <Navbar user={user} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={user.role} />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full pb-24">
          {/* Breadcrumb Navigation */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/dashboard/my-results"
              className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-blue-600 transition-colors"
            >
              <span>←</span>
              <span>Back to My Results</span>
            </Link>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
              Performance Review
            </span>
          </div>

          {/* Exam Result Hero Header Card */}
          <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-zinc-200/80 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">
                    {exam?.title}
                  </h1>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      result.isPassed
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {result.isPassed ? "✓ Passed" : "✕ Failed"}
                  </span>
                </div>
                {exam?.description && (
                  <p className="text-zinc-500 text-xs md:text-sm font-medium mb-3 max-w-2xl leading-relaxed">
                    {exam.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs font-bold text-zinc-400">
                  <span>📅 Submitted: {new Date(result.submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  <span>Passing Score: {exam?.passingScore}</span>
                </div>
              </div>

              {/* Large Score Badge */}
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white rounded-3xl p-6 md:p-7 min-w-[200px] text-center shadow-xl shadow-zinc-900/10 flex-shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">
                  Final Score
                </span>
                <div className="text-3xl md:text-4xl font-black tracking-tight text-white mb-1">
                  {result.score}{" "}
                  <span className="text-sm md:text-base font-bold text-zinc-400 font-sans">
                    / {exam?.totalMarks}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-black text-zinc-200">
                  <span>🎯</span>
                  <span>{percentage}% Achieved</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Statistics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-4 md:p-5 border border-zinc-200/80 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">
                Total Questions
              </span>
              <p className="text-2xl font-black text-zinc-900">{totalQuestions}</p>
            </div>
            <div className="bg-emerald-50/60 rounded-2xl p-4 md:p-5 border border-emerald-200/80 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block mb-1">
                Correct
              </span>
              <p className="text-2xl font-black text-emerald-800">{correctCount}</p>
            </div>
            <div className="bg-rose-50/60 rounded-2xl p-4 md:p-5 border border-rose-200/80 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block mb-1">
                Incorrect
              </span>
              <p className="text-2xl font-black text-rose-800">{incorrectCount}</p>
            </div>
            <div className="bg-amber-50/60 rounded-2xl p-4 md:p-5 border border-amber-200/80 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block mb-1">
                Unanswered
              </span>
              <p className="text-2xl font-black text-amber-800">{unansweredCount}</p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filter === "all"
                  ? "bg-zinc-900 text-white shadow-md"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              All Questions ({totalQuestions})
            </button>
            <button
              onClick={() => setFilter("correct")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filter === "correct"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                  : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              ✓ Correct ({correctCount})
            </button>
            <button
              onClick={() => setFilter("incorrect")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filter === "incorrect"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
                  : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
              }`}
            >
              ✕ Incorrect ({incorrectCount})
            </button>
            <button
              onClick={() => setFilter("unanswered")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                filter === "unanswered"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-500/20"
                  : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
              }`}
            >
              — Unanswered ({unansweredCount})
            </button>
          </div>

          {/* Questions Review List */}
          <div className="space-y-6">
            {filteredQuestions.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200/80 shadow-sm">
                <p className="text-zinc-500 font-bold text-sm">No questions in this filter category.</p>
              </div>
            ) : (
              filteredQuestions.map((q, displayIdx) => {
                const isSkipped = q.studentSelectedOptionIndex === null || q.studentSelectedOptionIndex === undefined;
                
                return (
                  <div
                    key={q.questionIndex}
                    className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-200/80 transition-all"
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 font-black text-xs flex items-center justify-center border border-zinc-200">
                          {q.questionIndex + 1}
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
                          Question {q.questionIndex + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-600">
                          {q.marks} {q.marks === 1 ? "Mark" : "Marks"}
                        </span>

                        {q.isCorrect ? (
                          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                            <span>✓</span> Correct
                          </span>
                        ) : isSkipped ? (
                          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                            <span>—</span> Unanswered
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                            <span>✕</span> Incorrect
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Text */}
                    <h3 className="text-base md:text-lg font-bold text-zinc-900 leading-relaxed mb-4">
                      {q.text}
                    </h3>

                    {/* Optional Question Image */}
                    {q.image && (
                      <div className="relative w-full max-w-md h-52 rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-100 mb-6">
                        <img
                          src={q.image}
                          alt={`Question ${q.questionIndex + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}

                    {/* Options List */}
                    <div className="space-y-3 mt-4">
                      {q.options.map((option, optIdx) => {
                        const isStudentChoice = q.studentSelectedOptionIndex === optIdx;
                        const isCorrectOption = q.correctOptionIndex === optIdx;

                        let styleClasses = "border-zinc-200 bg-zinc-50/50 text-zinc-700";
                        let badgeContent = null;

                        if (isCorrectOption) {
                          styleClasses = "border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500/20";
                          badgeContent = (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-black bg-emerald-600 text-white shadow-sm flex items-center gap-1">
                              <span>✓</span>
                              <span>Correct Answer</span>
                            </span>
                          );
                        }

                        if (isStudentChoice && !isCorrectOption) {
                          styleClasses = "border-rose-500 bg-rose-50/70 text-rose-950 ring-1 ring-rose-500/20";
                          badgeContent = (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-black bg-rose-600 text-white shadow-sm flex items-center gap-1">
                              <span>✕</span>
                              <span>Your Choice (Incorrect)</span>
                            </span>
                          );
                        } else if (isStudentChoice && isCorrectOption) {
                          badgeContent = (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-black bg-emerald-700 text-white shadow-sm flex items-center gap-1">
                              <span>✓</span>
                              <span>Your Choice (Correct)</span>
                            </span>
                          );
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${styleClasses}`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                                  isCorrectOption
                                    ? "bg-emerald-600 text-white"
                                    : isStudentChoice
                                    ? "bg-rose-600 text-white"
                                    : "bg-zinc-200 text-zinc-700"
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="font-semibold text-sm leading-snug">{option}</span>
                            </div>

                            {badgeContent && <div className="self-end sm:self-auto">{badgeContent}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
