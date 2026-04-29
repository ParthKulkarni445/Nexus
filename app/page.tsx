import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  redirect(user.role === "student" ? "/student/blogs" : "/companies");
}