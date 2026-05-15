"use client";

const STATUS_STYLES: Record<string, string> = {
  submitted: "border-blue-200 bg-blue-50 text-blue-700",
  reviewing: "border-amber-200 bg-amber-50 text-amber-700",
  in_review: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  repaired: "border-slate-200 bg-slate-50 text-slate-700",
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  reviewing: "In review",
  approved: "Approved",
  rejected: "Rejected",
  repaired: "Repaired",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "border-slate-200 bg-slate-50 text-slate-700";
  const label = STATUS_LABEL[status] ?? status;
  return <span className={`badge ${cls}`}>{label}</span>;
}

const SEVERITY_STYLES: Record<string, string> = {
  minor: "border-emerald-200 bg-emerald-50 text-emerald-700",
  moderate: "border-amber-200 bg-amber-50 text-amber-700",
  severe: "border-red-200 bg-red-50 text-red-700",
};

export function SeverityBadge({ severity }: { severity: string }) {
  const cls = SEVERITY_STYLES[severity] ?? "border-slate-200 bg-slate-50 text-slate-700";
  const label = severity.charAt(0).toUpperCase() + severity.slice(1);
  return <span className={`badge ${cls}`}>{label}</span>;
}
