import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createToken } from "@/lib/api/session";
import { isEmailAllowed } from "@/lib/api/domain";
const COOKIE_NAME = "nexus_session";
const MAX_AGE = 7 * 24 * 60 * 60;

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function errorRedirect(message: string, base: string) {
    const url = new URL("/login", base);
    url.searchParams.set("error", message);
    return NextResponse.redirect(url.toString());
}

/**
 * GET /api/v1/auth/google/callback
 * Exchanges the OAuth code for tokens, fetches user profile,
 * enforces @iitrpr.ac.in domain, and creates/finds user.
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state") ?? "";
    const oauthError = searchParams.get("error");

    const baseUrl = origin;
    const redirectUri = `${origin}/api/v1/auth/google/callback`;

    if (oauthError || !code) {
        return errorRedirect("Google sign-in was cancelled or failed.", baseUrl);
    }

    // Exchange code for tokens
    let tokenRes: Response;
    try {
        tokenRes = await fetch(GOOGLE_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_SIGNIN_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "",
                client_secret: process.env.GOOGLE_SIGNIN_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "",
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }).toString(),
        });
    } catch {
        return errorRedirect("Failed to connect to Google. Please try again.", baseUrl);
    }

    if (!tokenRes.ok) {
        return errorRedirect("Google authentication failed. Please try again.", baseUrl);
    }

    const tokenData = await tokenRes.json() as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
        return errorRedirect("Google authentication failed. Please try again.", baseUrl);
    }

    // Fetch user info
    let userInfo: { email?: string; name?: string; sub?: string };
    try {
        const userRes = await fetch(GOOGLE_USERINFO_URL, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        userInfo = await userRes.json();
    } catch {
        return errorRedirect("Failed to fetch Google profile. Please try again.", baseUrl);
    }

    const email = userInfo.email?.toLowerCase().trim();
    const name = userInfo.name ?? "";
    const authSubject = userInfo.sub ?? "";

    if (!email) {
        return errorRedirect("No email returned from Google.", baseUrl);
    }

    if (!isEmailAllowed(email)) {
        return errorRedirect(`Only institutionally approved accounts are allowed on Nexus.`, baseUrl);
    }

    // Find or create user
    let user = await db.user.findUnique({ where: { email } });

    if (!user) {
        user = await db.user.create({
            data: {
                email,
                name,
                role: "student",
                authProvider: "google",
                authSubject,
            },
        });
    } else if (!user.isActive) {
        return errorRedirect("Your account has been deactivated. Please contact TPO.", baseUrl);
    } else {
        // Update authSubject if signing in with Google to an existing credentials account
        if (!user.authSubject) {
            await db.user.update({
                where: { id: user.id },
                data: { authSubject, authProvider: "google" },
            });
        }
    }

    const token = createToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        coordinatorType: user.coordinatorType ?? undefined,
        isActive: user.isActive,
    });

    // Determine redirect destination
    const destination = state.startsWith("/") ? state :
        (user.role === "student" ? "/student/blogs" : "/companies");

    const response = NextResponse.redirect(new URL(destination, baseUrl));
    response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: MAX_AGE,
        path: "/",
        secure: process.env.NODE_ENV === "production",
    });

    return response;
}
