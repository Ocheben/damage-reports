"use client";

import { env } from "@/lib/env";
import { emitFlagEvent } from "@/lib/flags/events";
import { TOKEN_COOKIE_NAME } from "@/lib/identity-shared";

import { ApiError, FeatureDisabledError } from "./api";

/**
 * HTTP client for Kubb-generated SDK functions. Exported types mirror Kubb's
 * fetch-client preset so generated code compiles without a shim. Adds bearer
 * auth from the cookie, FeatureDisabledError on 403 feature_disabled, and
 * ApiError on other non-2xx. Wired via importPath in kubb.config.ts.
 */

export type RequestConfig<TData = unknown> = {
  baseURL?: string;
  url?: string;
  method?: "GET" | "PUT" | "PATCH" | "POST" | "DELETE" | "OPTIONS" | "HEAD";
  params?: unknown;
  data?: TData | FormData;
  responseType?: "arraybuffer" | "blob" | "document" | "json" | "text" | "stream";
  signal?: AbortSignal;
  headers?: [string, string][] | Record<string, string>;
  credentials?: "omit" | "same-origin" | "include";
};

export type ResponseConfig<TData = unknown> = {
  data: TData;
  status: number;
  statusText: string;
  headers: Headers;
};

export type ResponseErrorConfig<TError = unknown> = TError;

export type Client = <TResponseData, // eslint-disable-next-line @typescript-eslint/no-unused-vars
_TError = unknown, TRequestData = unknown>(
  config: RequestConfig<TRequestData>,
) => Promise<ResponseConfig<TResponseData>>;

function readTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${TOKEN_COOKIE_NAME}=`;
  const match = document.cookie.split("; ").find((c) => c.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

function buildUrl(base: string, path: string, params?: unknown): string {
  let url = `${base}${path}`;
  if (params && typeof params === "object") {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
      if (value === undefined || value === null) continue;
      search.append(key, String(value));
    }
    const qs = search.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }
  return url;
}

const client: Client = async <TResponseData, // eslint-disable-next-line @typescript-eslint/no-unused-vars
_TError = unknown, TRequestData = unknown>(
  config: RequestConfig<TRequestData>,
): Promise<ResponseConfig<TResponseData>> => {
  const { apiBase } = env();
  const base = config.baseURL ?? apiBase;

  const headers = new Headers(
    Array.isArray(config.headers)
      ? Object.fromEntries(config.headers)
      : (config.headers as Record<string, string> | undefined),
  );
  headers.set("Accept", "application/json");
  if (config.data !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = readTokenFromCookie();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const init: RequestInit = {
    method: config.method ?? "GET",
    headers,
    signal: config.signal,
  };
  if (config.data !== undefined) {
    init.body =
      typeof config.data === "string" || config.data instanceof FormData
        ? (config.data as BodyInit)
        : JSON.stringify(config.data);
  }

  const url = buildUrl(base, config.url ?? "", config.params);
  const res = await fetch(url, init);

  if (res.status === 204) {
    return {
      data: undefined as TResponseData,
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    };
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

  return {
    data: body as TResponseData,
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  };
};

export default client;
