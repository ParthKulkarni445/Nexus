import { clearSessionResponse } from "@/lib/api/session";

/**
 * POST /api/v1/auth/logout
 * Clears the session cookie.
 */
export async function POST() {
  return clearSessionResponse();
}
