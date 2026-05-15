"use client";

import { Calendar, CircleCheck, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

import { AiDamageAnalysis } from "@/components/Flagged/AiDamageAnalysis";
import { ExportPdfButton } from "@/components/Flagged/ExportPdfButton";
import { RepairCostEstimate } from "@/components/Flagged/RepairCostEstimate";
import type { DamageReport } from "@/lib/reports";

import { formatIncident } from "./utils";
import { ReportImage } from "./ReportImage";
import { StatusBadge } from "./badges";
import { useReportPatch, type StatusMessage } from "./hooks";

export function ReportDetailPanel({ report }: { report: DamageReport }) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(report.description);
  const { patch, busy, message, setMessage } = useReportPatch(report.id);

  // Reset local state when the selected report changes.
  useEffect(() => {
    setEditing(false);
    setDescription(report.description);
    setMessage(null);
  }, [report.id, report.description, setMessage]);

  const dirty = description !== report.description;

  const save = async () => {
    if (!dirty) return;
    await patch({ description });
    setEditing(false);
  };

  const cancelReport = async () => {
    if (!window.confirm("Cancel this report? It will be marked as rejected.")) return;
    await patch({ status: "rejected" }, "Report cancelled.");
  };

  const toggleEditing = () => {
    if (editing) setDescription(report.description);
    setEditing((e) => !e);
  };

  return (
    <article className="card overflow-hidden">
      <DetailHeader report={report} />

      <div className="px-6">
        <ReportImage report={report} size="hero" className="h-64 w-full rounded-lg" />
      </div>

      <DescriptionSection
        editing={editing}
        description={description}
        onToggleEditing={toggleEditing}
        onDescriptionChange={setDescription}
      />

      <section className="px-6 pt-5">
        <RepairCostEstimate amount={report.estimated_cost} />
      </section>

      <section className="px-6 pt-5">
        <AiDamageAnalysis analysis={report.ai_analysis ?? null} />
      </section>

      <DetailFooter
        busy={busy}
        dirty={dirty}
        message={message}
        onCancel={cancelReport}
        onSave={save}
      />
    </article>
  );
}

function DetailHeader({ report }: { report: DamageReport }) {
  const incident = formatIncident(report.incident_at);
  const title =
    [report.vehicle_make, report.vehicle_model].filter(Boolean).join(" ") ||
    report.vehicle_registration;

  return (
    <header className="flex items-start justify-between gap-4 px-6 py-5">
      <div className="min-w-0">
        <p className="font-mono text-xs text-slate-500">{report.reference}</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
          {report.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {report.location}
            </span>
          )}
          {incident && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {incident}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={report.status} />
        <ExportPdfButton reportId={report.id} />
      </div>
    </header>
  );
}

function DescriptionSection({
  editing,
  description,
  onToggleEditing,
  onDescriptionChange,
}: {
  editing: boolean;
  description: string;
  onToggleEditing: () => void;
  onDescriptionChange: (next: string) => void;
}) {
  return (
    <section className="px-6 pt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-900">Description</p>
        <button
          type="button"
          className="text-sm font-medium text-slate-700 hover:text-slate-900"
          onClick={onToggleEditing}
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>
      {editing ? (
        <textarea
          className="input mt-2"
          rows={3}
          autoFocus
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      ) : (
        <p className="mt-2 text-sm text-slate-700">{description}</p>
      )}
    </section>
  );
}

function DetailFooter({
  busy,
  dirty,
  message,
  onCancel,
  onSave,
}: {
  busy: boolean;
  dirty: boolean;
  message: StatusMessage | null;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <footer className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
      <div className="flex items-center gap-3">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancel report
        </button>
        {message && (
          <span
            className={`text-xs ${
              message.kind === "ok" ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {message.text}
          </span>
        )}
      </div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={!dirty || busy}
        onClick={onSave}
      >
        <CircleCheck className="h-4 w-4" />
        {busy ? "Saving…" : "Save changes"}
      </button>
    </footer>
  );
}
