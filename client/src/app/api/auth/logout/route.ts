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
 * Logout BFF. Revokes the active token plus any stashed admin token, then
 * clears all auth cookies. Always 200 so the UI returns to login.
 */
export async function POST() {
  const { apiBaseInternal } = env();
  const cookieJar = cookies();
  const activeToken = cookieJar.get(TOKEN_COOKIE_NAME)?.value;
  const stashedAdminToken = cookieJar.get(ADMIN_TOKEN_COOKIE_NAME)?.value;

  await Promise.all(
    [activeToken, stashedAdminToken].filter(Boolean).map((token) =>
      fetch(`${apiBaseInternal}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }).catch(() => null),
    ),
  );

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(TOKEN_COOKIE_NAME);
  res.cookies.delete(IDENTITY_COOKIE_NAME);
  res.cookies.delete(ADMIN_TOKEN_COOKIE_NAME);
  res.cookies.delete(ADMIN_IDENTITY_COOKIE_NAME);
  return res;
}
