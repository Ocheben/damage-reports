"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import useSWR from "swr";

import { env } from "@/lib/env";
import { TOKEN_COOKIE_NAME } from "@/lib/identity-shared";

import { subscribeToFlagEvents } from "./events";
import type {
  FlagDecision,
  FlagKey,
  FlagSet,
} from "./types";

type FlagContextValue = {
  flags: FlagSet;
  isEnabled: (key: FlagKey | string) => boolean;
  decision: (key: FlagKey | string) => FlagDecision;
  forceRefresh: () => Promise<void>;
};

const FlagContext = createContext<FlagContextValue | null>(null);

export function useFlagContext(): FlagContextValue {
  const ctx = useContext(FlagContext);
  if (!ctx) {
    throw new Error("useFlagContext used outside <FeatureFlagProvider>.");
  }
  return ctx;
}

// Module-level so it survives provider remount across App Router navigations.
const lastSeenEtag = { current: null as string | null };
const lastKnownFlags = { current: undefined as FlagSet | undefined };

function readTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${TOKEN_COOKIE_NAME}=`;
  const match = document.cookie.split("; ").find((c) => c.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

async function fetchFlagSet(): Promise<FlagSet> {
  const { apiBase } = env();
  const token = readTokenFromCookie();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (lastSeenEtag.current) headers["If-None-Match"] = lastSeenEtag.current;

  const res = await fetch(`${apiBase}/api/v1/flags/evaluate`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
    cache: "no-store",
  });

  // 304: keep SWR's data populated (undefined would clear it).
  if (res.status === 304) return lastKnownFlags.current ?? {};
  if (!res.ok) throw new Error(`Flag fetch failed: ${res.status}`);

  const etag = res.headers.get("ETag");
  if (etag) lastSeenEtag.current = etag;

  const body: { flags: FlagSet } = await res.json();
  lastKnownFlags.current = body.flags;
  return body.flags;
}

export function FeatureFlagProvider({
  initialFlags,
  children,
}: {
  initialFlags: FlagSet;
  children: React.ReactNode;
}) {
  const [overrides, setOverrides] = useState<FlagSet>({});

  const { data, mutate } = useSWR<FlagSet>("flags", fetchFlagSet, {
    fallbackData: initialFlags,
    // Event-driven freshness; revalidateOnMount converges if SSR was empty.
    // 60s deduping caps focus-toggle storms; identity changes and 403
    // feature_disabled call forceRefresh() to bypass the dedupe window.
    revalidateOnMount: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 60_000,
  });

  // SWR data + local overrides from the feature_disabled rollback path.
  const flags = useMemo(
    () => ({ ...(data ?? initialFlags), ...overrides }),
    [data, initialFlags, overrides],
  );

  const isEnabled = useCallback(
    (key: string) => Boolean(flags[key]?.value),
    [flags],
  );

  const decision = useCallback(
    (key: string): FlagDecision =>
      flags[key] ?? { value: false, reason: "unknown_flag" },
    [flags],
  );

  const forceRefresh = useCallback(async () => {
    lastSeenEtag.current = null;
    setOverrides({});
    await mutate();
  }, [mutate]);

  // apiFetch emits on 403 feature_disabled; catch up without waiting for focus.
  useEffect(() => {
    return subscribeToFlagEvents((event) => {
      if (event.type === "feature_disabled") {
        setOverrides((prev) => ({
          ...prev,
          [event.flag]: { value: false, reason: "client_override:disabled" },
        }));
      } else if (event.type === "force_refresh") {
        void forceRefresh();
      }
    });
  }, [forceRefresh]);

  const value = useMemo<FlagContextValue>(
    () => ({ flags, isEnabled, decision, forceRefresh }),
    [flags, isEnabled, decision, forceRefresh],
  );

  return <FlagContext.Provider value={value}>{children}</FlagContext.Provider>;
}
