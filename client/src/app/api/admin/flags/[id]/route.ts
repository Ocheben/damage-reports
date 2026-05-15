import { NextResponse } from "next/server";

import { adminFetch } from "@/lib/admin-api";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = await request.json();
  try {
    const result = await adminFetch(`/api/admin/flags/${params.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return NextResponse.json(result);
  } catch (err) {
    const e = err as Error & { status?: number; body?: unknown };
    return NextResponse.json(
      { error: e.message, body: e.body ?? null },
      { status: e.status ?? 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await adminFetch(`/api/admin/flags/${params.id}`, { method: "DELETE" });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const e = err as Error & { status?: number; body?: unknown };
    return NextResponse.json(
      { error: e.message, body: e.body ?? null },
      { status: e.status ?? 500 },
    );
  }
}
