import { NextResponse, type NextRequest } from "next/server";

import {
  IDENTITY_COOKIE_NAME,
  TOKEN_COOKIE_NAME,
} from "@/lib/identity-shared";

/**
 * Injects x-pathname for the root layout, redirects unauthenticated users
 * to /login (with ?next=), redirects non-admins out of /admin/*, and bounces
 * authed users off /login. Cookie role is UX-only; the API enforces.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Forward the pathname so server components can read it from headers().
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value ?? null;
  const identityRaw = request.cookies.get(IDENTITY_COOKIE_NAME)?.value ?? null;
  const role = parseRole(identityRaw);
  const isAuthed = Boolean(token && identityRaw);
  const isLoginPath = pathname === "/login" || pathname.startsWith("/login/");

  // Already-authed users on /login → bounce to home (or to ?next=).
  if (isLoginPath && isAuthed) {
    const next = request.nextUrl.searchParams.get("next") || "/";
    return NextResponse.redirect(new URL(next, request.url));
  }

  // Unauthenticated and not on /login → redirect to /login?next=…
  if (!isLoginPath && !isAuthed) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  // Authed but not admin and trying to enter /admin/* → bounce home.
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

function parseRole(raw: string | null): string {
  if (!raw) return "anonymous";
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed.role === "string" ? parsed.role : "anonymous";
  } catch {
    return "anonymous";
  }
}

/**
 * Skip static assets, Next internals, /api/* (route handlers manage their
 * own cookies — running this middleware there would loop), and the favicon.
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
