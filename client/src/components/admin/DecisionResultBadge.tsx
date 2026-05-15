"use client";

export function DecisionResultBadge({ result }: { result: boolean }) {
  if (result) {
    return (
      <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">true</span>
    );
  }
  return (
    <span className="badge border-slate-200 bg-slate-50 text-slate-600">false</span>
  );
}
