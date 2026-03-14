import type { RbacIdentity } from "@/lib/auth/rbac";

export type SessionClaims = RbacIdentity & {
  userId: string;
  email?: string;
  name?: string;
  isActive?: boolean;
  exp?: number;
};

const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "nexus-dev-secret-change-in-production";

function toBase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
}

function decodeBase64Url(value: string) {
  try {
    return atob(toBase64(value));
  } catch {
    return "";
  }
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function signPayload(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  return toBase64Url(new Uint8Array(signature));
}

export async function verifySessionToken(
  token?: string,
): Promise<SessionClaims | null> {
  if (!token) return null;

  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expectedSignature = await signPayload(payload, SESSION_SECRET);

  if (!timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  const raw = decodeBase64Url(payload);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw) as SessionClaims;
    if (!data.userId) return null;
    if (typeof data.exp === "number" && data.exp < Date.now()) return null;

    return {
      userId: data.userId,
      email: data.email,
      name: data.name,
      role: data.role,
      coordinatorType: data.coordinatorType,
      isActive: data.isActive,
      exp: data.exp,
    };
  } catch {
    return null;
  }
}
