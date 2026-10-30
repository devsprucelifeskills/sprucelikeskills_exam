"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

export default function ThankYouPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fire confetti for a premium feel
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#2563eb", "#7c3aed"]
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#2563eb", "#7c3aed"]
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-50 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl text-center relative z-10">
        <div className="mb-12 animate-in zoom-in-50 duration-700">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-violet-600 text-white rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/20 rotate-3">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-5xl font-black text-zinc-900 tracking-tight mb-4">
            Exam Submitted Successfully!
          </h1>
          <p className="text-zinc-500 text-xl font-medium max-w-lg mx-auto leading-relaxed">
            Thank you for completing your assessment. Your responses have been safely recorded.
          </p>
        </div>

        <div className="bg-zinc-50 border border-zinc-100 rounded-[40px] p-10 mb-12 animate-in slide-in-from-bottom-8 duration-1000 delay-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-zinc-100 text-2xl">
                📬
              </div>
              <div>
                <h3 className="font-bold text-zinc-900">Confirmation Sent</h3>
                <p className="text-sm text-zinc-500">Your submission has been logged in our system.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-zinc-100 text-2xl">
                ⏳
              </div>
              <div>
                <h3 className="font-bold text-zinc-900">Grading in Progress</h3>
                <p className="text-sm text-zinc-500">Results will be available after the review period.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in duration-1000 delay-500">
          {/* <Link 
            href="/dashboard/my-results" 
            className="px-10 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-zinc-200"
          >
            Check My Results
          </Link> */}
          <Link
            href="/dashboard/exams"
            className="px-10 py-4 bg-white text-zinc-900 border border-zinc-200 rounded-2xl font-bold hover:bg-zinc-50 transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            Available Exams
          </Link>
        </div>

        <p className="mt-12 text-zinc-400 text-sm font-bold uppercase tracking-widest">
          SpruceExam • Assessment Platform
        </p>
      </div>
    </div>
  );
}
