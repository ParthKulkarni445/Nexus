import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  canAccessApiPath,
  canAccessAppPath,
  isProtectedAppPath,
} from "@/lib/auth/rbac";
import { verifySessionToken } from "@/lib/auth/session-edge";

const SESSION_COOKIE = "nexus_session";

function isAuthPage(pathname: string) {
  return pathname === "/login" || pathname === "/signup";
}

function isOpenAuthApi(pathname: string) {
  return pathname === "/api/v1/auth/login" || pathname === "/api/v1/auth/signup";
}

function loginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url);
}

function unauthorizedRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/unauthorized";
  url.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = await verifySessionToken(sessionToken);
  const isAuthenticated = Boolean(claims?.userId);

  if (isAuthPage(pathname)) {
    if (isAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = "/companies";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/v1")) {
    if (isOpenAuthApi(pathname)) {
      return NextResponse.next();
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: { message: "Authentication required" } },
        { status: 401 },
      );
    }

    if (!canAccessApiPath(pathname, claims)) {
      return NextResponse.json(
        { error: { message: "Insufficient permissions" } },
        { status: 403 },
      );
    }

    return NextResponse.next();
  }

  if (!isProtectedAppPath(pathname)) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return loginRedirect(request);
  }

  if (!canAccessAppPath(pathname, claims)) {
    return unauthorizedRedirect(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
