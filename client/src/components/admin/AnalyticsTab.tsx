"use client";

import { useMemo } from "react";

import type { AdminStats } from "@/lib/admin-api";

import type { AdminFlag } from "./types";
import { strategyOf } from "./strategy";
import { StrategyBadge } from "./StrategyBadge";

export function AnalyticsTab({
  flags,
  stats,
}: {
  flags: AdminFlag[];
  stats: AdminStats;
}) {
  const { topFlags, strategyMix, maxEvals } = useMemo(() => {
    const evals = stats.evaluations_24h_by_flag;
    const sorted = [...flags].sort((a, b) => (evals[b.key] ?? 0) - (evals[a.key] ?? 0));
    const mix = flags.reduce<Record<string, number>>((acc, f) => {
      const k = strategyOf(f);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    const max = Math.max(1, ...Object.values(evals));
    return { topFlags: sorted.slice(0, 6), strategyMix: mix, maxEvals: max };
  }, [flags, stats.evaluations_24h_by_flag]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <TopFlagsCard flags={topFlags} evalsByFlag={stats.evaluations_24h_by_flag} maxEvals={maxEvals} />
      <StrategyMixCard mix={strategyMix} />
    </div>
  );
}

function TopFlagsCard({
  flags,
  evalsByFlag,
  maxEvals,
}: {
  flags: AdminFlag[];
  evalsByFlag: Record<string, number>;
  maxEvals: number;
}) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-slate-900">Top flags by traffic (24h)</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {flags.map((f) => (
          <TrafficBar
            key={f.id}
            flagKey={f.key}
            count={evalsByFlag[f.key] ?? 0}
            max={maxEvals}
          />
        ))}
      </ul>
    </div>
  );
}

function TrafficBar({
  flagKey,
  count,
  max,
}: {
  flagKey: string;
  count: number;
  max: number;
}) {
  return (
    <li className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-mono text-slate-700">{flagKey}</span>
        <span className="tabular-nums text-slate-500">{count.toLocaleString("en-GB")}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-emerald-500" style={{ width: `${(count / max) * 100}%` }} />
      </div>
    </li>
  );
}

function StrategyMixCard({ mix }: { mix: Record<string, number> }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-slate-900">Strategy mix</h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {Object.entries(mix).map(([k, n]) => (
          <li key={k}>
            <span className="badge border-slate-200 bg-slate-50 text-slate-700">
              <StrategyBadge kind={k as ReturnType<typeof strategyOf>} />
              <span className="ml-1 font-mono text-xs text-slate-500">{n}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
