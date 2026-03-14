import crypto from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "nexus-dev-secret-change-in-production";
const COOKIE_NAME = "nexus_session";
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export type SessionUserClaims = {
  userId: string;
  email?: string;
  name?: string;
  role?: string;
  coordinatorType?: string;
  isActive?: boolean;
};

// ── Token ─────────────────────────────────────────────────────────────────────

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("base64url");
}

export function createToken(claims: SessionUserClaims): string {
  const payload = Buffer.from(
    JSON.stringify({ ...claims, exp: Date.now() + MAX_AGE * 1000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string): SessionUserClaims | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (sign(payload) !== sig) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.exp < Date.now()) return null;
    return {
      userId: data.userId,
      email: data.email,
      name: data.name,
      role: data.role,
      coordinatorType: data.coordinatorType,
      isActive: data.isActive,
    };
  } catch {
    return null;
  }
}

// ── Cookie helpers ─────────────────────────────────────────────────────────────

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token)?.userId ?? null;
}

export async function getSessionUserClaims(): Promise<SessionUserClaims | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function respondWithSession<T>(
  data: T,
  status = 200
): NextResponse {
  const sessionData = data as T & {
    id: string;
    email?: string;
    name?: string;
    role?: string;
    coordinatorType?: string | null;
    isActive?: boolean;
  };
  const res = NextResponse.json({ data }, { status });
  res.cookies.set(
    COOKIE_NAME,
    createToken({
      userId: sessionData.id,
      email: sessionData.email,
      name: sessionData.name,
      role: sessionData.role,
      coordinatorType: sessionData.coordinatorType ?? undefined,
      isActive: sessionData.isActive ?? true,
    }),
    {
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    }
  );
  return res;
}

export function clearSessionResponse(): NextResponse {
  const res = NextResponse.json({ data: { success: true } });
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}

// ── Password ──────────────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100_000, 64, "sha512")
    .toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored.startsWith("pbkdf2:")) return false;
  const parts = stored.split(":");
  if (parts.length !== 3) return false;
  const [, salt, hash] = parts;
  const computed = crypto
    .pbkdf2Sync(password, salt, 100_000, 64, "sha512")
    .toString("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(hash, "hex")
    );
  } catch {
    return false;
  }
}
