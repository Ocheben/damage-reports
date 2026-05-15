"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/Ui/Toast";
import { apiFetch, ApiError, FeatureDisabledError } from "@/lib/api";

export function useBulkDelete({ onCleared }: { onCleared: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (ids: number[]) => {
    setBusy(true);
    setError(null);
    try {
      // Server reads role from the authenticated user; non-staff gets 403.
      const result = await apiFetch<{ deleted: number }>("/api/v1/reports/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      onCleared();
      router.refresh();
      toast.success(
        `${result.deleted} report${result.deleted === 1 ? "" : "s"} deleted.`,
      );
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      toast.error(message, "Bulk delete failed");
    } finally {
      setBusy(false);
    }
  };

  return { run, busy, error };
}

function toErrorMessage(err: unknown): string {
  if (err instanceof FeatureDisabledError) {
    return "Bulk delete was disabled by an administrator. The UI has updated.";
  }
  if (err instanceof ApiError && err.status === 422) {
    return "One or more selected reports no longer exist.";
  }
  return err instanceof Error ? err.message : "Bulk delete failed.";
}
