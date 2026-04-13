import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api/auth";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "tpo_admin") {
    redirect("/unauthorized");
  }

  return <AdminDashboardClient />;
}
