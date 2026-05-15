import { type NextRequest, NextResponse } from "next/server";

import {
  ADMIN_IDENTITY_COOKIE_NAME,
  ADMIN_TOKEN_COOKIE_NAME,
  IDENTITY_COOKIE_NAME,
  TOKEN_COOKIE_NAME,
} from "@/lib/identity-shared";

/**
 * Bounces stale sessions: admin SSR pages redirect here on a 401 (cookies
 * present but Sanctum token gone). Clears cookies so /login won't ping-pong.
 */
export function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") || "/";
  const target = new URL("/login", request.url);
  target.searchParams.set("next", next);

  const res = NextResponse.redirect(target);
  res.cookies.delete(TOKEN_COOKIE_NAME);
  res.cookies.delete(IDENTITY_COOKIE_NAME);
  res.cookies.delete(ADMIN_TOKEN_COOKIE_NAME);
  res.cookies.delete(ADMIN_IDENTITY_COOKIE_NAME);
  return res;
}
