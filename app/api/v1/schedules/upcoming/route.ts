import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/api/auth";
import { serverError, success, unauthorized } from "@/lib/api/response";
import { listUpcomingSchedules } from "@/services/scheduleService";

export async function GET(_request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorized();
  }

  try {
    const upcoming = await listUpcomingSchedules();
    return success(upcoming);
  } catch (error) {
    console.error("Error listing upcoming schedules:", error);
    return serverError();
  }
}
