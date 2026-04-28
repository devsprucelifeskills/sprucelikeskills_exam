"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  role: string;
}

interface SidebarLink {
  label: string;
  href: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const isAdminOrTrainer = role === "admin" || role === "trainer";

  const icons = {
    dashboard: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
      </svg>
    ),
    create: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    manage: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    results: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    users: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    available: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    award: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    settings: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  };

  const adminLinks: SidebarLink[] = [
    { label: "Dashboard", href: "/dashboard", icon: icons.dashboard },
    { label: "Create Exam", href: "/dashboard/create-exam", icon: icons.create },
    { label: "Manage Exams", href: "/dashboard/manage-exams", icon: icons.manage },
    { label: "View Results", href: "/dashboard/results", icon: icons.results },
    { label: "Users", href: "#", icon: icons.users },
  ];

  const studentLinks: SidebarLink[] = [
    { label: "Available Exams", href: "/dashboard/exams", icon: icons.available },
    // { label: "My Results", href: "/dashboard/my-results", icon: icons.award },
  ];

  const links: SidebarLink[] = isAdminOrTrainer ? adminLinks : studentLinks;

  return (
    <aside className="w-64 bg-white border-r border-zinc-100 min-h-[calc(100vh-73px)] hidden md:flex flex-col flex-shrink-0">
      <div className="p-6 flex-1">
        <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-6">Main Menu</h2>
        <nav className="space-y-1.5">
          {links.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.label}
                href={link.disabled ? "#" : link.href}
                className={`group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-bold"
                  : link.disabled
                    ? "opacity-50 cursor-not-allowed text-zinc-400"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                onClick={(e) => link.disabled && e.preventDefault()}
              >
                <span className={`transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                  {link.icon}
                </span>
                <span className="text-sm">{link.label}</span>
                {link.disabled && (
                  <span className="ml-auto text-[10px] font-bold bg-zinc-100 text-zinc-400 px-2 py-0.5 rounded-full uppercase">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-6 border-t border-zinc-50">
        <a href="#" className="group flex items-center gap-3 px-4 py-3 rounded-2xl text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-all duration-200">
          <span className="group-hover:rotate-45 transition-transform duration-300">
            {icons.settings}
          </span>
          <span className="text-sm">Settings</span>
        </a>
      </div>
    </aside>
  );
}
