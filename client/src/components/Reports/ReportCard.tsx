"use client";

import { Clock } from "lucide-react";

import type { DamageReport } from "@/lib/reports";

import { formatIncidentShort } from "./utils";
import { ReportImage } from "./ReportImage";
import { SeverityBadge, StatusBadge } from "./badges";

export function ReportCard({
  report,
  selected,
  onSelect,
  selectable = false,
  selectedForBulk = false,
  onToggleBulk,
}: {
  report: DamageReport;
  selected: boolean;
  onSelect: () => void;
  selectable?: boolean;
  selectedForBulk?: boolean;
  onToggleBulk?: () => void;
}) {
  const incident = formatIncidentShort(report.incident_at);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full gap-3 rounded-xl border p-3 text-left transition ${
        selected
          ? "border-emerald-300 bg-emerald-50/60 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <ReportImage
        report={report}
        className="h-20 w-20 flex-shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-xs text-slate-500">{report.reference}</span>
          <StatusBadge status={report.status} />
        </div>
        <p className="mt-1 truncate text-base font-semibold text-slate-900">
          {[report.vehicle_make, report.vehicle_model].filter(Boolean).join(" ") ||
            report.vehicle_registration}
        </p>
        {report.location && (
          <p className="mt-0.5 truncate text-sm text-slate-500">{report.location}</p>
        )}
        <div className="mt-2 flex items-center gap-3">
          <SeverityBadge severity={report.severity} />
          {incident && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {incident}
            </span>
          )}
          {selectable && (
            <label
              className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={selectedForBulk}
                onChange={() => onToggleBulk?.()}
                className="h-3.5 w-3.5"
              />
              <span>Bulk</span>
            </label>
          )}
        </div>
      </div>
    </button>
  );
}

