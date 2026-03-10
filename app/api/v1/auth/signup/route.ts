import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { error } from "@/lib/api/response";
import { respondWithSession, hashPassword } from "@/lib/api/session";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

/**
 * POST /api/v1/auth/signup
 * Creates a new student account with credentials and sets a session cookie.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", "BAD_REQUEST", 400);
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return error(
      parsed.error.issues[0]?.message ?? "Validation failed",
      "VALIDATION_ERROR",
      400
    );
  }

  const { name, email, password } = parsed.data;

  // Check for existing email
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (existing) {
    return error(
      "An account with this email already exists",
      "EMAIL_TAKEN",
      409
    );
  }

  const passwordHash = hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      name: name.trim(),
      email: email.toLowerCase(),
      role: "student",
      authProvider: "credentials",
      profileMeta: { passwordHash },
    })
    .returning();

  return respondWithSession(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    user.id,
    201
  );
}
