"use client";

import { useState } from "react";

import type { AdminFlag } from "../types";

export function useFlagMutations({
  flagId,
  onUpdated,
  onDeleted,
}: {
  flagId: number;
  onUpdated: (next: AdminFlag) => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = async (payload: Partial<AdminFlag>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/flags/${flagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
      const body = (await res.json()) as { data: AdminFlag };
      onUpdated(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/flags/${flagId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return { patch, remove, busy, error, resetError: () => setError(null) };
}
