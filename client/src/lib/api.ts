"use client";

import { env } from "@/lib/env";
import { emitFlagEvent } from "@/lib/flags/events";
import { TOKEN_COOKIE_NAME } from "@/lib/identity-shared";

/**
 * Browser API client. Reads a JS-readable Sanctum bearer cookie (would be
 * httpOnly behind a proxy in production — see README) and attaches it as
 * Authorization. On 403 feature_disabled, emits a flag event so the provider
 * can stamp an override and refresh.
 */

export class FeatureDisabledError extends Error {
  constructor(public readonly flag: string, message: string) {
    super(message);
    this.name = "FeatureDisabledError";
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function readTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${TOKEN_COOKIE_NAME}=`;
  const match = document.cookie.split("; ").find((c) => c.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { apiBase } = env();

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = readTokenFromCookie();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${apiBase}${path}`, { ...options, headers });

  if (res.status === 204) {
    return undefined as T;
  }

  const isJson = (res.headers.get("content-type") ?? "").includes("json");
  const body = isJson ? await res.json().catch(() => null) : await res.text();

  if (
    res.status === 403 &&
    isJson &&
    body &&
    typeof body === "object" &&
    "error" in body &&
    body.error === "feature_disabled"
  ) {
    const flag = (body as { flag?: string }).flag ?? "unknown";

    emitFlagEvent({ type: "feature_disabled", flag });
    emitFlagEvent({ type: "force_refresh" });

    throw new FeatureDisabledError(
      flag,
      (body as { message?: string }).message ?? "Feature disabled.",
    );
  }

  if (!res.ok) {
    throw new ApiError(res.status, `Request failed: ${res.status}`, body);
  }

  return body as T;
}
