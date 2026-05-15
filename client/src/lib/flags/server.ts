import "server-only";

import { env } from "@/lib/env";
import { readAuthToken } from "@/lib/identity";

import type { EvaluationResponse, FlagSet } from "./types";

/**
 * SSR flag fetch for the root layout. Forwards the Sanctum cookie as a bearer
 * token so Laravel returns the user-targeted set; no token = anonymous set.
 */
export async function fetchFlagsServerSide(): Promise<FlagSet> {
  const { apiBaseInternal } = env();
  const token = readAuthToken();

  try {
    const res = await fetch(`${apiBaseInternal}/api/v1/flags/evaluate`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({}),
      next: {
        revalidate: 15,
        tags: ["feature-flags"],
      },
    });

    if (!res.ok) {
      console.error("Flag fetch failed", res.status, await res.text());
      return {};
    }

    const json: EvaluationResponse = await res.json();
    return json.flags;
  } catch (err) {
    console.error("Flag fetch errored", err);
    return {};
  }
}
