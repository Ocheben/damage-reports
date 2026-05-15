import "server-only";

import type { DamageReport as GeneratedDamageReport } from "@/generated/types/DamageReport";
import type { PaginatedReports } from "@/generated/types/PaginatedReports";
import { env } from "@/lib/env";
import { readAuthToken } from "@/lib/identity";

// Local extension until ai_analysis lands in the OpenAPI spec.
export type AiAnalysis = {
  confidence?: number;
  severity_score?: number;
  estimated_days?: number;
  detected_damage?: string;
  suggested_repair?: string;
  estimated_cost?: number | string;
  generated_at?: string;
};

export type DamageReport = GeneratedDamageReport & {
  ai_analysis?: AiAnalysis | null;
};

async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiBaseInternal } = env();
  const token = readAuthToken();
  const res = await fetch(`${apiBaseInternal}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API ${path} returned ${res.status}`);
  }
  return res.json();
}

export async function listReports(): Promise<DamageReport[]> {
  const body = await publicFetch<PaginatedReports>("/api/v1/reports");
  return body.data;
}
