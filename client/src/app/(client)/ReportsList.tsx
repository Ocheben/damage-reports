"use client";

import { ReportCard } from "@/components/Reports/ReportCard";
import type { DamageReport } from "@/lib/reports";

export function ReportsList({
  reports,
  selectedId,
  onSelect,
  bulkEnabled,
  bulkSelection,
  onToggleBulk,
}: {
  reports: DamageReport[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  bulkEnabled: boolean;
  bulkSelection: number[];
  onToggleBulk: (id: number) => void;
}) {
  if (reports.length === 0) {
    return (
      <ul>
        <li className="card p-6 text-center text-sm text-slate-500">
          No reports match the current filter.
        </li>
      </ul>
    );
  }

  return (
    <ul className="space-y-2">
      {reports.map((r) => (
        <li key={r.id}>
          <ReportCard
            report={r}
            selected={selectedId === r.id}
            onSelect={() => onSelect(r.id)}
            selectable={bulkEnabled}
            selectedForBulk={bulkSelection.includes(r.id)}
            onToggleBulk={() => onToggleBulk(r.id)}
          />
        </li>
      ))}
    </ul>
  );
}
