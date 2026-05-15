"use client";

import { Activity, TrendingUp } from "lucide-react";

import { DecisionsTable, type DecisionRow } from "./DecisionsTable";
import { StatCard } from "./StatCard";

export type DecisionAggregates = {
  total: number;
  by_reason: Record<string, number>;
  by_result: Record<string, number>;
};

export function AuditTab({
  decisions,
  aggregates,
}: {
  decisions: DecisionRow[];
  aggregates: DecisionAggregates;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Recent decisions" value={aggregates.total} icon={<Activity className="h-5 w-5" />} />
        <StatCard label="Resolved true" value={aggregates.by_result.true ?? 0} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Resolved false" value={aggregates.by_result.false ?? 0} icon={<TrendingUp className="h-5 w-5" />} />
      </div>
      <section className="card overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Decision log</h3>
          <p className="text-xs text-slate-500">Most recent {decisions.length} entries</p>
        </header>
        <DecisionsTable decisions={decisions} />
      </section>
    </div>
  );
}
