import { NextResponse } from "next/server";

import { adminFetch } from "@/lib/admin-api";

// Browser → here → Laravel. Keeps the admin token server-side.
export async function POST(request: Request) {
  const body = await request.json();
  try {
    const result = await adminFetch("/api/admin/flags", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const e = err as Error & { status?: number; body?: unknown };
    return NextResponse.json(
      { error: e.message, body: e.body ?? null },
      { status: e.status ?? 500 },
    );
  }
}
