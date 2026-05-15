import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { TOKEN_COOKIE_NAME } from "@/lib/identity-shared";

/**
 * Persona list. API endpoint is admin-gated; non-admins get 403.
 */
export type Persona = {
  id: number;
  name: string;
  email: string;
  role: string;
  country: string;
};

export async function GET() {
  const token = cookies().get(TOKEN_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ data: [] satisfies Persona[] }, { status: 401 });
  }

  const { apiBaseInternal } = env();

  try {
    const res = await fetch(`${apiBaseInternal}/api/admin/personas`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (res.status === 403) {
      return NextResponse.json({ data: [] satisfies Persona[] }, { status: 403 });
    }
    if (!res.ok) {
      return NextResponse.json({ data: [] satisfies Persona[] }, { status: 200 });
    }
    const body = await res.json();
    return NextResponse.json({ data: body.data as Persona[] });
  } catch {
    return NextResponse.json({ data: [] satisfies Persona[] });
  }
}
