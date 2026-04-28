"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { API_URL } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const userRes = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
        if (userRes.data.success) {
          const userData = userRes.data.user;
          
          // Redirect students to Available Exams page
          if (userData.role !== "admin" && userData.role !== "trainer") {
            router.push("/dashboard/exams");
            return;
          }

          setUser(userData);
          const dataRes = await axios.get(`${API_URL}/api/user/dashboard-data`, { withCredentials: true });
          if (dataRes.data.success) {
            setDashboardData(dataRes.data.data);
          }
        } else {
          router.push("/");
        }
      } catch (err) {
        console.error("Dashboard error", err);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  const isAdminOrTrainer = user.role === "admin" || user.role === "trainer";

  const icons = {
    users: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    exams: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    active: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    plus: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    results: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    shield: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    )
  };

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <Navbar user={user} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={user.role} />
        
        <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full pb-20">
          <header className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold mb-4 border border-blue-100">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              Live Dashboard
            </div>
            <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-2">
              {isAdminOrTrainer ? "Management Portal" : "Student Dashboard"}
            </h1>
            <p className="text-zinc-500 text-lg max-w-2xl">
              {dashboardData?.message || "Welcome back! Here's what's happening today."}
            </p>
          </header>

          {isAdminOrTrainer ? (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <StatsCard title="Total Students" value={dashboardData?.stats?.students || 120} icon={icons.users} color="blue" delay="0" />
                <StatsCard title="Total Exams" value={dashboardData?.stats?.exams || 5} icon={icons.exams} color="purple" delay="100" />
                <StatsCard title="Active Exams" value={dashboardData?.stats?.activeExams || 2} icon={icons.active} color="emerald" delay="200" />
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                <h2 className="text-2xl font-black mb-8 text-zinc-900 flex items-center gap-3">
                  Quick Actions
                  <div className="h-px bg-zinc-100 flex-1" />
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <ActionCard 
                    title="Create Exam" 
                    description="Design a new assessment with multiple choice or subjective questions."
                    buttonText="Create New"
                    icon={icons.plus}
                    primary={true}
                    onClick={() => router.push("/dashboard/create-exam")}
                  />
                  <ActionCard 
                    title="View Results" 
                    description="Analyze student performance, grades, and detailed reports."
                    buttonText="View Analytics"
                    icon={icons.results}
                    onClick={() => router.push("/dashboard/results")}
                  />
                  <ActionCard 
                    title="Cheating Alerts" 
                    description="AI-powered proctoring and anomaly detection during live exams."
                    buttonText="Coming Soon"
                    icon={icons.shield}
                    disabled={true}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[32px] p-10 shadow-xl shadow-zinc-200/50 border border-zinc-100 animate-in zoom-in-95 duration-700">
              <h2 className="text-2xl font-black mb-8 text-zinc-900">Upcoming Exams</h2>
              <div className="space-y-6">
                {dashboardData?.upcomingExams?.length > 0 ? (
                  dashboardData.upcomingExams.map((exam: any) => (
                    <div key={exam.id} className="group flex items-center justify-between p-8 bg-zinc-50 rounded-3xl border border-zinc-100 hover:bg-white hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                          📝
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-zinc-900 mb-1">{exam.name}</h3>
                          <p className="text-zinc-500 font-medium">Date: {exam.date}</p>
                        </div>
                      </div>
                      <button className="px-8 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all duration-300">
                        View Details
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-zinc-400 font-bold text-lg">No upcoming exams found.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon, color, delay }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-200/20",
    purple: "bg-purple-50 text-purple-600 border-purple-100 shadow-purple-200/20",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-200/20",
  };

  return (
    <div 
      className={`bg-white rounded-[32px] p-8 shadow-xl shadow-zinc-200/40 border border-zinc-100 hover:scale-[1.02] transition-all duration-300 animate-in fade-in slide-in-from-bottom-4`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-zinc-500 text-sm font-black uppercase tracking-widest mb-1">{title}</p>
      <p className="text-5xl font-black text-zinc-900 tracking-tighter">{value}</p>
    </div>
  );
}

function ActionCard({ title, description, buttonText, icon, primary, disabled, onClick }: any) {
  return (
    <div className={`group bg-white rounded-[32px] p-8 shadow-xl shadow-zinc-200/40 border ${disabled ? 'border-dashed border-zinc-200 opacity-60' : 'border-zinc-100 hover:shadow-2xl hover:shadow-zinc-300/50 transition-all duration-500'} flex flex-col h-full relative overflow-hidden`}>
      {!disabled && (
        <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full transition-all duration-500 group-hover:scale-[3] opacity-[0.03] ${primary ? 'bg-blue-600' : 'bg-zinc-900'}`} />
      )}
      
      <div className="flex-grow relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${primary ? 'bg-blue-50 text-blue-600' : 'bg-zinc-50 text-zinc-600'} group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
          {disabled && (
            <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full border border-amber-100 uppercase tracking-wider">
              Soon
            </span>
          )}
        </div>
        <h3 className="text-2xl font-black text-zinc-900 mb-3">{title}</h3>
        <p className="text-zinc-500 text-sm leading-relaxed mb-8">{description}</p>
      </div>
      
      <button 
        onClick={onClick}
        disabled={disabled}
        className={`relative z-10 w-full py-4 rounded-2xl font-black text-sm transition-all duration-300 ${
          disabled 
            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
            : primary 
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 active:scale-95' 
              : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-900 hover:text-white active:scale-95'
        }`}
      >
        {buttonText}
      </button>
    </div>
  );
}


