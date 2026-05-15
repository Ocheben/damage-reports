"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch, ApiError, FeatureDisabledError } from "@/lib/api";
import type { DamageReport } from "@/lib/reports";

export type StatusMessage = { kind: "ok" | "err"; text: string };

export function useReportPatch(reportId: number) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  const patch = async (
    payload: Partial<DamageReport>,
    successText: string | null = "Saved.",
  ) => {
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch(`/api/v1/reports/${reportId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (successText) setMessage({ kind: "ok", text: successText });
      router.refresh();
    } catch (err) {
      setMessage({ kind: "err", text: toErrorText(err) });
    } finally {
      setBusy(false);
    }
  };

  return { patch, busy, message, setMessage };
}

function toErrorText(err: unknown): string {
  if (err instanceof FeatureDisabledError) return "This action is no longer available.";
  if (err instanceof ApiError) return `Update failed (${err.status})`;
  if (err instanceof Error) return err.message;
  return "Update failed.";
}
