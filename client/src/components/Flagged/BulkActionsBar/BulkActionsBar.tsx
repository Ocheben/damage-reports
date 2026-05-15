"use client";

import { useFlag } from "@/lib/flags/hooks";
import { FLAG_KEYS } from "@/lib/flags/types";

import { useBulkDelete } from "../hooks/useBulkDelete";

export function BulkActionsBar({
  selected,
  onCleared,
}: {
  selected: number[];
  onCleared: () => void;
}) {
  const enabled = useFlag(FLAG_KEYS.bulkActions);
  const { run, busy, error } = useBulkDelete({ onCleared });

  if (!enabled || selected.length === 0) return null;

  return (
    <div className="flex items-center justify-between rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
      <span>{selected.length} selected</span>
      <div className="flex items-center gap-3">
        {error && <span className="text-xs text-amber-300">{error}</span>}
        <button
          type="button"
          className="btn-danger btn"
          disabled={busy}
          onClick={() => run(selected)}
        >
          {busy ? "Deleting…" : "Delete selected"}
        </button>
      </div>
    </div>
  );
}
