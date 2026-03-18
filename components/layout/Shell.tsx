"use client";

import { usePathname } from "next/navigation";
import TopNav from "./Sidebar";

type ShellUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  coordinatorType?: string;
};

export default function Shell({
  children,
  currentUser,
}: {
  children: React.ReactNode;
  currentUser: ShellUser;
}) {
  const pathname = usePathname();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopNav currentUser={currentUser} />
      <main
        key={pathname}
        className="flex-1 overflow-y-auto xl:overflow-hidden flex flex-col w-full max-w-screen-2xl mx-auto px-4 lg:px-6 pt-6 pb-6 xl:pt-0 xl:pb-0"
      >
        {children}
      </main>
    </div>
  );
}
