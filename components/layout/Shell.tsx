"use client";

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
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav currentUser={currentUser} />
      <main className="flex-1 flex flex-col w-full max-w-screen-2xl mx-auto px-4 lg:px-6 pt-6 pb-6 xl:pt-0 xl:pb-0">
        {children}
      </main>
    </div>
  );
}
