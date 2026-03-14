import Shell from "@/components/layout/Shell";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api/auth";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <Shell currentUser={user}>{children}</Shell>;
}
