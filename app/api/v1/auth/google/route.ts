import { NextRequest, NextResponse } from "next/server";
import { googleHdHint } from "@/lib/api/domain";
import { addBasePath } from "@/lib/base-path";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

/**
 * GET /api/v1/auth/google
 * Redirects the user to Google's OAuth consent screen.
 */
export async function GET(request: NextRequest) {
    const clientId = process.env.GOOGLE_SIGNIN_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
        return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
    }

    const { origin, searchParams } = new URL(request.url);
    const redirectUri = `${origin}${addBasePath("/api/v1/auth/google/callback")}`;
    const from = searchParams.get("from") ?? "";

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "select_account",
        state: from,
    });

    const hd = googleHdHint();
    if (hd) params.set("hd", hd);

    return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
