import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { IDENTITY_COOKIE_NAME, TOKEN_COOKIE_NAME } from "@/lib/identity-shared";

/**
 * Login BFF. Forwards to Laravel and stores the Sanctum token + identity in
 * JS-readable cookies (so the Kubb client can set the bearer header). In
 * production this would move behind an HttpOnly cookie + same-origin proxy.
 */

type LoginResponse = {
  token: string;
  expires_at: string | null;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    country: string;
  };
};

const COOKIE_MAX_AGE = 60 * 60; // 1h; matches Sanctum's default token TTL

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.email !== "string" ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { apiBaseInternal } = env();
  const apiResponse = await fetch(`${apiBaseInternal}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email: body.email, password: body.password }),
    cache: "no-store",
  });

  if (apiResponse.status === 422) {
    // Pass through Laravel's error envelope for field-level messages.
    const payload = await apiResponse.json().catch(() => ({}));
    return NextResponse.json(payload, { status: 422 });
  }
  if (apiResponse.status === 429) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (!apiResponse.ok) {
    return NextResponse.json({ error: "login_failed" }, { status: 502 });
  }

  const payload = (await apiResponse.json()) as LoginResponse;

  const res = NextResponse.json({ ok: true, user: payload.user });
  res.cookies.set(TOKEN_COOKIE_NAME, payload.token, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  res.cookies.set(
    IDENTITY_COOKIE_NAME,
    JSON.stringify({
      userKey: payload.user.email,
      role: payload.user.role,
      country: payload.user.country,
      name: payload.user.name,
    }),
    {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    },
  );
  return res;
}
