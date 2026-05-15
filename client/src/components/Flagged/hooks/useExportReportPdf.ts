"use client";

import { useState } from "react";

import { useToast } from "@/components/Ui/Toast";
import { apiFetch, FeatureDisabledError } from "@/lib/api";

export function useExportReportPdf(reportId: number) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const data = await apiFetch<{ export_url: string }>(
        `/api/v1/reports/${reportId}/export-pdf`,
        { method: "POST" },
      );
      setMessage(`Exported to ${data.export_url}`);
      toast.success("Export ready. Check the URL above.");
    } catch (err) {
      const text = toErrorMessage(err);
      setMessage(text);
      toast.error(text, "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return { run, busy, message };
}

function toErrorMessage(err: unknown): string {
  if (err instanceof FeatureDisabledError) return "Export was disabled while you were here.";
  return err instanceof Error ? err.message : "Export failed.";
}
