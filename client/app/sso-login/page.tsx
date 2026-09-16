"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { API_URL } from "@/lib/api";

function SSOLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticket = searchParams.get("ticket");

  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleSSO = async () => {
      if (!ticket) {
        setStatus("error");
        setErrorMessage("No SSO ticket provided in request.");
        return;
      }

      try {
        const res = await axios.post(
          `${API_URL}/api/auth/sso-login`,
          { ticket },
          { withCredentials: true }
        );

        if (res.data.success) {
          setStatus("success");

          // Save user and token state in localStorage
          if (res.data.user) {
            localStorage.setItem("user", JSON.stringify(res.data.user));
          }
          if (res.data.token) {
            localStorage.setItem("token", res.data.token);
          }

          // Determine redirect URL
          const eventId = res.data.event?.id || res.data.event?._id;
          const targetUrl = eventId
            ? `/dashboard/exams?eventId=${eventId}`
            : `/dashboard/exams`;

          // Small delay for smooth UX transition
          setTimeout(() => {
            router.push(targetUrl);
          }, 800);
        } else {
          setStatus("error");
          setErrorMessage(res.data.message || "SSO ticket authentication failed.");
        }
      } catch (err: any) {
        console.error("SSO Login Error:", err);
        setStatus("error");
        setErrorMessage(
          err.response?.data?.message || "SSO ticket expired or invalid."
        );
      }
    };

    handleSSO();
  }, [ticket, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-zinc-100 text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center py-6">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
            </div>
            <h2 className="text-xl font-extrabold text-zinc-900 mb-2">
              Authenticating with Spruce Platform
            </h2>
            <p className="text-sm text-zinc-500 font-medium">
              Verifying your single sign-on ticket...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mb-6 animate-bounce">
              ✓
            </div>
            <h2 className="text-xl font-extrabold text-zinc-900 mb-2">
              Authentication Successful!
            </h2>
            <p className="text-sm text-zinc-500 font-medium">
              Redirecting you to your exam session...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mb-6">
              ⚠️
            </div>
            <h2 className="text-xl font-extrabold text-zinc-900 mb-2">
              Authentication Failed
            </h2>
            <p className="text-sm text-red-500 font-medium mb-6">
              {errorMessage}
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-sm transition-all shadow-lg"
            >
              Return to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SSOLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <SSOLoginContent />
    </Suspense>
  );
}
