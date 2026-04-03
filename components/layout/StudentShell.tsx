"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, CalendarDays, LogOut, OrbitIcon } from "lucide-react";

type StudentShellUser = {
  name: string;
  email: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const navItems: NavItem[] = [
  { href: "/student/blogs", label: "Blogs", icon: BookOpen },
  { href: "/student/calender", label: "Calender", icon: CalendarDays },
];

export default function StudentShell({
  children,
  currentUser,
}: {
  children: React.ReactNode;
  currentUser: StudentShellUser;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center gap-3 px-4 lg:px-6">
          <Link
            href="/student/blogs"
            className="flex items-center gap-2 font-black text-[#0F172A]"
          >
            <OrbitIcon size={22} className="text-[#2563EB]" />
            <span className="text-lg leading-none">NEXUS</span>
          </Link>

          <nav className="ml-4 flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#DBEAFE] text-[#1D4ED8]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-slate-900">{currentUser.name}</p>
              <p className="text-xs text-slate-500">{currentUser.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 pb-6 pt-6 lg:px-6">
        {children}
      </main>
    </div>
  );
}
