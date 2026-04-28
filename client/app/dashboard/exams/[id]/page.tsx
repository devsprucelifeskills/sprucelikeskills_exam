"use client";

import { useState, useEffect, use } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Answer {
  questionIndex: number;
  selectedOptionIndex: number;
}

export default function TakeExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [phase, setPhase] = useState<"waiting" | "instructions" | "exam" | "ended">("waiting");
  const [now, setNow] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [reviewIndices, setReviewIndices] = useState<number[]>([]);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/exam/${id}`, { withCredentials: true });
        if (res.data.success) {
          setExam(res.data.exam);
          
          // --- HYDRATION: Load saved progress from LocalStorage ---
          const savedAnswers = localStorage.getItem(`exam_progress_${id}`);
          const savedReview = localStorage.getItem(`exam_review_${id}`);
          
          if (savedAnswers) {
            try {
              setAnswers(JSON.parse(savedAnswers));
            } catch (e) {
              console.error("Failed to parse saved answers", e);
            }
          }
          if (savedReview) {
            try {
              setReviewIndices(JSON.parse(savedReview));
            } catch (e) {
              console.error("Failed to parse saved review indices", e);
            }
          }
          // ------------------------------------------------------

          // Initial phase check
          const startTime = new Date(res.data.exam.startTime).getTime();
          const endTime = new Date(res.data.exam.endTime).getTime();
          const currentTime = new Date().getTime();

          if (currentTime < startTime) {
            setPhase("waiting");
          } else if (currentTime > endTime) {
            setPhase("ended");
          } else {
            setPhase("instructions");
          }
        }
      } catch (err: any) {
        alert(err.response?.data?.message || "Failed to load exam");
        router.push("/dashboard/exams");
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [id, router]);

  useEffect(() => {
    if (!exam || result) return;
    const timer = setInterval(() => {
      const currentTime = new Date();
      setNow(currentTime);

      const startTime = new Date(exam.startTime).getTime();
      const endTime = new Date(exam.endTime).getTime();
      const nowTime = currentTime.getTime();

      if (nowTime < startTime) {
        setPhase("waiting");
      } else if (nowTime >= startTime && nowTime <= endTime) {
        if (phase === "waiting") {
          setPhase("instructions");
        }
        
        const secondsLeft = Math.floor((endTime - nowTime) / 1000);
        setTimeLeft(secondsLeft);

        if (secondsLeft <= 0) {
          clearInterval(timer);
          submitExam(true);
        }
      } else if (nowTime > endTime) {
        setPhase("ended");
        if (phase === "exam") submitExam(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [exam, result, phase]);

  const handleOptionSelect = (questionIndex: number, optionIndex: number) => {
    setAnswers(prev => {
      const existing = prev.findIndex(a => a.questionIndex === questionIndex);
      let updated;
      if (existing !== -1) {
        updated = [...prev];
        updated[existing].selectedOptionIndex = optionIndex;
      } else {
        updated = [...prev, { questionIndex, selectedOptionIndex: optionIndex }];
      }
      localStorage.setItem(`exam_progress_${id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const toggleReview = (index: number) => {
    setReviewIndices(prev => {
      const updated = prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index];
      localStorage.setItem(`exam_review_${id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    }
  };

  const startExamWithFullscreen = () => {
    enterFullscreen();
    setPhase("exam");
  };

  const submitExam = async (isAutoSubmit = false) => {
    if (!isAutoSubmit && answers.length < (exam?.questions?.length || 0)) {
      const ok = window.confirm("You have unanswered questions. Submit anyway?");
      if (!ok) return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/exam/${id}/submit`, { answers }, { withCredentials: true });
      if (res.data.success) {
        localStorage.removeItem(`exam_progress_${id}`);
        localStorage.removeItem(`exam_review_${id}`);
        if (document.fullscreenElement) {
           document.exitFullscreen().catch(e => console.error(e));
        }
        router.push("/dashboard/exams/thank-you");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to submit exam");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !exam) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-bold animate-pulse">Loading secure environment...</p>
      </div>
    );
  }

  if (phase === "waiting") {
    const startTime = new Date(exam.startTime);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
          <div className="p-12 text-center">
            <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
               <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Exam hasn't started yet</h1>
            <p className="text-slate-500 mb-8 text-lg font-medium leading-relaxed">This exam is scheduled to start on <br/><span className="text-blue-600 font-bold">{startTime.toLocaleString()}</span></p>
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
               <span className="text-sm font-bold text-slate-600">Waiting for start time...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
          <div className="p-12 text-center">
            <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
               <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Exam has ended</h1>
            <p className="text-slate-500 mb-8 text-lg font-medium">The submission window for this exam is now closed.</p>
            <button onClick={() => router.push("/dashboard/exams")} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all">Back to Exams</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "instructions") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-4xl bg-white rounded-[48px] shadow-2xl shadow-blue-900/5 border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-700">
          <div className="bg-gradient-to-br from-zinc-900 to-slate-800 p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Secure Examination Environment
              </div>
              <h1 className="text-4xl font-black mb-4 tracking-tight leading-tight">Assessment Instructions</h1>
              <p className="text-slate-300 text-lg font-medium max-w-xl">
                Please review the following guidelines carefully. Your session will be monitored for integrity and quality assurance.
              </p>
            </div>
          </div>

          <div className="p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <InstructionItem 
                icon="🛡️" 
                title="Integrity Mode" 
                desc="The exam runs in mandatory full-screen. Exiting or switching tabs will be logged as a violation." 
              />
              <InstructionItem 
                icon="⏱️" 
                title="Strict Timing" 
                desc={`You have ${exam.duration} minutes. The system will automatically submit your work when time expires.`} 
              />
              <InstructionItem 
                icon="💾" 
                title="Auto-Save" 
                desc="Your progress is saved locally in real-time. You can resume instantly if your browser crashes." 
              />
              <InstructionItem 
                icon="🎯" 
                title="Marking Scheme" 
                desc={`Total ${exam.totalMarks} marks. Each question carries a specific weightage shown on the screen.`} 
              />
              <InstructionItem 
                icon="🎨" 
                title="Navigation" 
                desc="Use the question palette on the right to jump between questions or mark them for review." 
              />
              <InstructionItem 
                icon="🚫" 
                title="No Retakes" 
                desc="Once submitted, you cannot re-enter the exam. Ensure all answers are final before clicking submit." 
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 mb-12 flex items-start gap-4">
               <div className="text-2xl mt-1">💡</div>
               <div>
                 <h4 className="font-bold text-blue-900 mb-1 text-sm">Pro Tip</h4>
                 <p className="text-blue-700 text-xs leading-relaxed font-medium">
                   Use the "Mark for Review" feature for difficult questions. You can quickly revisit them using the violet-colored markers in the question palette.
                 </p>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => router.push("/dashboard/exams")} 
                className="flex-1 py-4 px-8 rounded-2xl border-2 border-slate-100 text-slate-500 font-bold hover:bg-slate-50 transition-all active:scale-95"
              >
                Return to Dashboard
              </button>
              <button 
                onClick={startExamWithFullscreen} 
                className="flex-[2] py-4 px-8 rounded-2xl bg-blue-600 text-white font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/25 active:scale-95 hover:scale-[1.02]"
              >
                I Understand, Start Exam
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

function InstructionItem({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm border border-slate-100">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
        <p className="text-slate-500 text-xs leading-relaxed font-medium">{desc}</p>
      </div>
    </div>
  );
}

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalCount = exam?.questions?.length || 0;
  const answeredCount = answers.length;
  const reviewCount = reviewIndices.length;
  const isWarning = timeLeft !== null && timeLeft < 300;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Fullscreen Enforcement Overlay */}
      {phase === "exam" && !isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-zinc-900/95 backdrop-blur-xl flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-[40px] p-12 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-amber-200/50">
              <svg className="w-10 h-10 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            </div>
            <h2 className="text-3xl font-black text-zinc-900 mb-4 tracking-tight">Fullscreen Required</h2>
            <p className="text-zinc-500 mb-10 leading-relaxed font-medium">To maintain exam integrity, you must be in fullscreen mode to continue. All attempts to exit are logged.</p>
            <button onClick={enterFullscreen} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/30 hover:bg-blue-700 hover:scale-[1.02] transition-all active:scale-95">Return to Fullscreen</button>
          </div>
        </div>
      )}

      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Image src="/spruceLogo.svg" alt="Spruce Logo" width={100} height={32} className="h-8 w-auto" />
            <div>
              <h1 className="font-bold text-slate-800 text-sm leading-tight">{exam.title}</h1>
              <p className="text-xs text-slate-400">{totalCount} Questions</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-600">{answeredCount} Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              <span className="text-xs font-semibold text-slate-600">{reviewCount} Review</span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${totalCount > 0 ? (answeredCount / totalCount) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm ${isWarning ? "bg-red-50 text-red-600 border border-red-200 animate-pulse" : "bg-slate-50 text-slate-700 border border-slate-200"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {formatTime(timeLeft)}
            </div>
            <button onClick={() => submitExam(false)} disabled={submitting} className="px-5 py-2 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-md disabled:opacity-60">{submitting ? "Submitting..." : "Submit Exam"}</button>
          </div>
        </div>
      </header>

      <div className="flex pt-[65px] min-h-screen">
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-2xl mx-auto">
            {exam?.questions?.map((q: any, qIndex: number) => {
              if (activeQuestion !== qIndex) return null;
              const studentAnswer = answers.find(a => a.questionIndex === q.id);
              const isReviewed = reviewIndices.includes(q.id);
              return (
                <div key={q.id} className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <span className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-blue-200">{qIndex + 1}</span>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Question {qIndex + 1} of {totalCount}</p>
                          <p className="text-xs font-bold text-blue-600 mt-0.5">{q.marks} Mark{q.marks > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      {isReviewed && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-600 rounded-full text-xs font-bold border border-violet-100">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg> Marked for Review
                        </div>
                      )}
                    </div>
                    <div className="mb-10">
                      <h2 className="text-2xl font-bold text-slate-800 leading-tight mb-4">{q.text}</h2>
                      {q.image && <div className="mt-4 rounded-2xl overflow-hidden border border-slate-100"><Image src={q.image} alt="Question" width={600} height={300} className="w-full object-contain bg-slate-50" /></div>}
                    </div>
                    <div className="space-y-4">
                      {q.options.map((option: string, oIndex: number) => {
                        const isSelected = studentAnswer?.selectedOptionIndex === oIndex;
                        return (
                          <button key={oIndex} onClick={() => handleOptionSelect(q.id, oIndex)} className={`w-full group flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 ${isSelected ? "border-blue-600 bg-blue-50 shadow-md" : "border-slate-100 hover:border-blue-200 hover:bg-slate-50"}`}>
                            <div className="flex items-center gap-4">
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"}`}>{String.fromCharCode(65 + oIndex)}</span>
                              <span className={`font-bold transition-colors ${isSelected ? "text-blue-900" : "text-slate-600"}`}>{option}</span>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "border-blue-600 bg-blue-600" : "border-slate-200"}`}>{isSelected && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in-50" />}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="px-8 py-6 bg-slate-50 flex items-center justify-between">
                    <button onClick={() => toggleReview(q.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${isReviewed ? "bg-violet-600 text-white shadow-lg shadow-violet-200" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>{isReviewed ? "Unmark Review" : "Mark for Review"}</button>
                    <div className="flex gap-3">
                      <button onClick={() => setActiveQuestion(prev => Math.max(0, prev - 1))} disabled={activeQuestion === 0} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-30"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                      <button onClick={() => setActiveQuestion(prev => Math.min(totalCount - 1, prev + 1))} disabled={activeQuestion === totalCount - 1} className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 disabled:opacity-30">Next Question <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
        <aside className="w-80 bg-slate-50 border-l border-slate-200 p-6 overflow-y-auto hidden lg:block">
          <div className="mb-8">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Question Palette</h3>
            <div className="grid grid-cols-4 gap-2.5">
              {exam?.questions?.map((q: any, idx: number) => {
                const isAnswered = answers.some(a => a.questionIndex === q.id);
                const isReviewed = reviewIndices.includes(q.id);
                const isActive = activeQuestion === idx;
                let bgColor = "bg-white text-slate-400 border-slate-100 hover:border-blue-400 hover:text-blue-600";
                if (isActive) bgColor = "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 ring-2 ring-blue-100 ring-offset-2";
                else if (isReviewed) bgColor = "bg-violet-600 text-white border-violet-600 shadow-md";
                else if (isAnswered) bgColor = "bg-emerald-500 text-white border-emerald-500 shadow-md";
                return (
                  <button key={idx} onClick={() => setActiveQuestion(idx)} className={`w-full aspect-square rounded-xl flex items-center justify-center font-black text-xs border-2 transition-all duration-300 ${bgColor}`}>{idx + 1}</button>
                );
              })}
            </div>
          </div>
          <div className="space-y-4 pt-8 border-t border-slate-200">
            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-md bg-emerald-500 shadow-sm" /><span className="text-xs font-bold text-slate-600">Answered</span></div>
            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-md bg-violet-600 shadow-sm" /><span className="text-xs font-bold text-slate-600">Marked for Review</span></div>
            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-md bg-white border-2 border-slate-100 shadow-sm" /><span className="text-xs font-bold text-slate-600">Not Answered</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
