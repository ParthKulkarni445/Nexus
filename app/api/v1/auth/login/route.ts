import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { error } from "@/lib/api/response";
import { respondWithSession, verifyPassword } from "@/lib/api/session";
import { isEmailAllowed, domainErrorMessage } from "@/lib/api/domain";


const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/v1/auth/login
 * Authenticates a user with email + password and sets a session cookie.
 * Restricts to @iitrpr.ac.in domain.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", "BAD_REQUEST", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid email or password format", "VALIDATION_ERROR", 400);
  }

  const { email: rawEmail, password } = parsed.data;
  const email = rawEmail.toLowerCase().trim();

  if (!isEmailAllowed(email)) {
    return error(domainErrorMessage(), "DOMAIN_RESTRICTED", 403);
  }

  const user = await db.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    return error("Invalid email or password", "AUTH_FAILED", 401);
  }

  const meta = ((user.profileMeta ?? {}) as Record<string, string>) ?? {};
  const passwordHash = meta.passwordHash;

  if (!passwordHash || !verifyPassword(password, passwordHash)) {
    return error("Invalid email or password", "AUTH_FAILED", 401);
  }

  return respondWithSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    coordinatorType: user.coordinatorType,
    isActive: user.isActive,
  });
}
