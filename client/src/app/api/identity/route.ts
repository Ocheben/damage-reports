import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import {
  ADMIN_IDENTITY_COOKIE_NAME,
  ADMIN_TOKEN_COOKIE_NAME,
  IDENTITY_COOKIE_NAME,
  TOKEN_COOKIE_NAME,
} from "@/lib/identity-shared";

/**
 * Impersonation BFF: forwards the admin's token to /api/admin/impersonate,
 * swaps the active cookies (ff_auth_token / ff_identity) to the new persona,
 * and stashes the admin's original cookies (ff_admin_*) so DELETE can
 * restore them without re-login.
 */

type ImpersonateResponse = {
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

function setSessionCookies(
  res: NextResponse,
  token: string,
  identity: { userKey: string; role: string; country: string; name: string },
) {
  res.cookies.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  res.cookies.set(IDENTITY_COOKIE_NAME, JSON.stringify(identity), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== "string") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const cookieJar = cookies();
  const adminToken = cookieJar.get(TOKEN_COOKIE_NAME)?.value;
  const adminIdentityRaw = cookieJar.get(IDENTITY_COOKIE_NAME)?.value;
  if (!adminToken || !adminIdentityRaw) {
    // Defensive: middleware should have caught this.
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { apiBaseInternal } = env();
  const apiResponse = await fetch(`${apiBaseInternal}/api/admin/impersonate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email: body.email }),
    cache: "no-store",
  });

  if (apiResponse.status === 401) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (apiResponse.status === 403) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (apiResponse.status === 404) {
    return NextResponse.json({ error: "unknown_user" }, { status: 404 });
  }
  if (apiResponse.status === 422) {
    const payload = await apiResponse.json().catch(() => ({}));
    return NextResponse.json(payload, { status: 422 });
  }
  if (!apiResponse.ok) {
    return NextResponse.json({ error: "impersonate_failed" }, { status: 502 });
  }

  const payload = (await apiResponse.json()) as ImpersonateResponse;

  const res = NextResponse.json({ ok: true, persona: payload.user });

  // Stash before overwriting the active cookies.
  res.cookies.set(ADMIN_TOKEN_COOKIE_NAME, adminToken, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  res.cookies.set(ADMIN_IDENTITY_COOKIE_NAME, adminIdentityRaw, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  setSessionCookies(res, payload.token, {
    userKey: payload.user.email,
    role: payload.user.role,
    country: payload.user.country,
    name: payload.user.name,
  });
  return res;
}

/** Stop impersonating: restore the stashed admin cookies. */
export async function DELETE() {
  const cookieJar = cookies();
  const stashedToken = cookieJar.get(ADMIN_TOKEN_COOKIE_NAME)?.value;
  const stashedIdentityRaw = cookieJar.get(ADMIN_IDENTITY_COOKIE_NAME)?.value;

  if (!stashedToken || !stashedIdentityRaw) {
    return NextResponse.json({ error: "not_impersonating" }, { status: 400 });
  }

  let parsed: {
    userKey: string;
    role: string;
    country: string;
    name: string;
  } | null = null;
  try {
    parsed = JSON.parse(stashedIdentityRaw);
  } catch {
    return NextResponse.json({ error: "stash_corrupt" }, { status: 500 });
  }
  if (!parsed) {
    return NextResponse.json({ error: "stash_corrupt" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true, persona: parsed });
  setSessionCookies(res, stashedToken, parsed);
  res.cookies.delete(ADMIN_TOKEN_COOKIE_NAME);
  res.cookies.delete(ADMIN_IDENTITY_COOKIE_NAME);
  return res;
}
