import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { TOKEN_COOKIE_NAME } from "@/lib/identity-shared";

/**
 * Identity check; mostly invoked server-side by the root layout. Exposed for
 * client code (e.g. session-expiry banners) to share the same path.
 */
export async function GET() {
  const token = cookies().get(TOKEN_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const { apiBaseInternal } = env();
  const apiResponse = await fetch(`${apiBaseInternal}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (apiResponse.status === 401) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  if (!apiResponse.ok) {
    return NextResponse.json({ error: "me_failed" }, { status: 502 });
  }

  const body = await apiResponse.json();
  return NextResponse.json(body);
}
