import "server-only";

import { cookies } from "next/headers";

import { env } from "@/lib/env";
import { TOKEN_COOKIE_NAME } from "@/lib/identity-shared";

/**
 * Server-only Laravel API client. Forwards the user's Sanctum cookie as a
 * bearer token; anonymous calls go through unauthenticated.
 */
export type AdminStats = {
  total_flags: number;
  added_this_month: number;
  active_rollouts: number;
  scheduled: number;
  next_scheduled_at: string | null;
  next_scheduled_key: string | null;
  evaluations_24h: number;
  evaluations_24h_delta: number | null;
  evaluations_24h_by_flag: Record<string, number>;
  cache: {
    hit_rate: number | null;
    ttl_seconds: number;
    status: "ok" | "unavailable";
  };
};

/**
 * Forward the user's bearer token. Pass `token` to override the cookie
 * (e.g. a fresh impersonation token before it round-trips to the browser).
 */
export async function userFetch<T>(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<T> {
  const { apiBaseInternal } = env();
  const headers = new Headers(init?.headers);

  const token = init?.token ?? cookies().get(TOKEN_COOKIE_NAME)?.value ?? null;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${apiBaseInternal}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  const isJson = (res.headers.get("content-type") ?? "").includes("json");
  const body = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const err = new Error(
      `API request failed: ${res.status} ${typeof body === "string" ? body : JSON.stringify(body)}`,
    ) as Error & { status: number; body: unknown };
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body as T;
}

/**
 * Alias kept for existing admin call sites; auth is enforced server-side by
 * the admin-role middleware on the user's own token.
 */
export const adminFetch = userFetch;
