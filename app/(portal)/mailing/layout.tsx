import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api/auth";
import { canAccessAppPath } from "@/lib/auth/rbac";

export default async function MailingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canAccessAppPath("/mailing", user)) {
    redirect("/unauthorized?from=/mailing");
  }

  return <>{children}</>;
}
