"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { API_URL } from "@/lib/api";
import Image from "next/image";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleAuth = async () => {
      const error = searchParams.get("error");
      if (error) {
        setStatus("error");
        setErrorMessage(error);
        setTimeout(() => {
          router.replace(`/?error=${encodeURIComponent(error)}`);
        }, 1500);
        return;
      }

      const token = searchParams.get("token");
      if (!token) {
        setStatus("error");
        setErrorMessage("No authentication token provided.");
        setTimeout(() => {
          router.replace("/?error=No%20authentication%20token%20provided");
        }, 1500);
        return;
      }

      try {
        // Save token into localStorage so all subsequent Axios requests attach Authorization header
        localStorage.setItem("token", token);

        const res = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        if (res.data.success) {
          setStatus("success");
          const user = res.data.user;
          if (user) {
            localStorage.setItem("user", JSON.stringify(user));
          }

          // Redirect to appropriate dashboard based on user role
          const target = user?.role === "admin" || user?.role === "trainer"
            ? "/dashboard"
            : "/dashboard/exams";

          router.replace(target);
        } else {
          setStatus("error");
          setErrorMessage(res.data.message || "Failed to verify session.");
          setTimeout(() => {
            router.replace("/?error=Session%20verification%20failed");
          }, 1500);
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setStatus("error");
        setErrorMessage(err.response?.data?.message || "Authentication failed.");
        setTimeout(() => {
          router.replace("/?error=Authentication%20failed");
        }, 1500);
      }
    };

    handleAuth();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-zinc-100 text-center">
        <div className="flex justify-center mb-6">
          <Image src="/spruceLogo.png" alt="Spruce Logo" width={140} height={45} className="h-10 w-auto" priority />
        </div>

        {status === "loading" && (
          <div className="flex flex-col items-center py-4">
            <div className="relative w-14 h-14 mb-5">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
            </div>
            <h2 className="text-xl font-extrabold text-zinc-900 mb-2">Authenticating</h2>
            <p className="text-sm text-zinc-500 font-medium">Securing your session with Spruce...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center py-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mb-5 animate-bounce">
              ✓
            </div>
            <h2 className="text-xl font-extrabold text-zinc-900 mb-2">Authenticated!</h2>
            <p className="text-sm text-zinc-500 font-medium">Redirecting to your dashboard...</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center py-4">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-2xl mb-5">
              ⚠️
            </div>
            <h2 className="text-xl font-extrabold text-zinc-900 mb-2">Authentication Failed</h2>
            <p className="text-sm text-rose-500 font-medium mb-4">{errorMessage}</p>
            <p className="text-xs text-zinc-400 font-medium">Returning to login page...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
