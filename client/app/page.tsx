"use client";

import Image from "next/image";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { API_URL } from "@/lib/api";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(errorParam);
    }
  }, [searchParams]);

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password }, { withCredentials: true });
      if (res.data.success) {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl p-10 space-y-8 border border-zinc-100 transition-all duration-300 hover:shadow-zinc-200">
      <div className="flex flex-col items-center text-center space-y-2">
        <Image 
          src="/spruceLogo.svg" 
          alt="Spruce Logo" 
          width={180} 
          height={80} 
          className="mb-4 h-auto"
          priority
        />
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Welcome Back
        </h1>
        <p className="text-zinc-500">
          Please sign in with your corporate account
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-600 text-sm font-medium animate-shake">
          {error}
        </div>
      )}

      <form onSubmit={handleLocalLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            placeholder="you@company.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            placeholder="••••••••"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center py-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-zinc-200"></div>
        <span className="flex-shrink-0 mx-4 text-sm text-zinc-400">Or continue with</span>
        <div className="flex-grow border-t border-zinc-200"></div>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-semibold hover:bg-zinc-50 transition-all duration-200 active:scale-[0.98]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </button>
      </div>

      <div className="pt-6 border-t border-zinc-100">
        <p className="text-center text-xs text-zinc-400">
          By signing in, you agree to our <br />
          <span className="font-medium hover:text-zinc-600 cursor-pointer">Terms of Service</span> and <span className="font-medium hover:text-zinc-600 cursor-pointer">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 font-sans">
      <Suspense fallback={
        <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl p-10 flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-zinc-500 animate-pulse text-sm font-medium">Loading session...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}

