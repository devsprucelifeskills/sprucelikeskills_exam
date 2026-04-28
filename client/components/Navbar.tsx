"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { useSidebar } from "@/context/SidebarContext";

interface NavbarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const { toggleSidebar } = useSidebar();

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
      router.push("/");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <nav className="bg-white border-b border-zinc-100 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2 md:gap-4">
        {/* Hamburger Menu - Only Mobile */}
        <button
          onClick={toggleSidebar}
          className="p-2 -ml-1 text-zinc-500 hover:bg-zinc-50 rounded-lg md:hidden transition-colors"
          aria-label="Toggle Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Image
          src="/spruceLogo.svg"
          alt="Spruce Logo"
          width={130}
          height={40}
          className="h-7 md:h-9 w-auto"
          priority
        />
        <div className="h-6 w-px bg-zinc-100 hidden md:block mx-2" />
        <span className="hidden md:block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
          Examination Platform
        </span>
      </div>

      <div className="flex items-center gap-3 md:gap-8">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end text-right hidden sm:flex">
            <span className="text-sm font-black text-zinc-900 leading-tight">{user.name}</span>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{user.role}</span>
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 text-white flex items-center justify-center font-black text-[10px] md:text-sm shadow-lg shadow-blue-200">
            {getInitials(user.name)}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="group flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg md:rounded-xl border border-zinc-100 text-[10px] md:text-xs font-black text-zinc-500 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all duration-300"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden md:inline">LOGOUT</span>
        </button>
      </div>
    </nav>
  );
}


