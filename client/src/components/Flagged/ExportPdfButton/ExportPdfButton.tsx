"use client";

import { FileText } from "lucide-react";

import { FeatureGate } from "@/lib/flags/FeatureGate";
import { FLAG_KEYS } from "@/lib/flags/types";

import { useExportReportPdf } from "../hooks/useExportReportPdf";

export function ExportPdfButton({ reportId }: { reportId: number }) {
  const { run, busy, message } = useExportReportPdf(reportId);

  return (
    <FeatureGate flag={FLAG_KEYS.exportPdf}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn"
          onClick={run}
          disabled={busy}
          title={message ?? undefined}
        >
          <FileText className="h-4 w-4" />
          {busy ? "Exporting…" : "Export PDF"}
        </button>
      </div>
    </FeatureGate>
  );
}
