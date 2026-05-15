"use client";

import type { AdminFlag } from "./types";
import { statusOf, STATUS_BADGE_CLASS, STATUS_LABEL } from "./utils/flag-status";
import { strategyOf } from "./strategy";
import { StrategyBadge } from "./StrategyBadge";
import { Toggle } from "./Toggle";

export function FlagsTable({
  flags,
  selectedKey,
  onSelect,
  onToggleEnabled,
  evalsByFlag,
}: {
  flags: AdminFlag[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onToggleEnabled: (flag: AdminFlag, next: boolean) => void;
  evalsByFlag: Record<string, number>;
}) {
  return (
    <div className="card overflow-hidden">
      <header className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-900">All flags</h2>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <FlagsTableHeader />
          <tbody>
            {flags.map((f) => (
              <FlagRow
                key={f.id}
                flag={f}
                selected={selectedKey === f.key}
                evals={evalsByFlag[f.key] ?? 0}
                onSelect={() => onSelect(f.key)}
                onToggleEnabled={(next) => onToggleEnabled(f, next)}
              />
            ))}
            {flags.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                  No flags match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FlagsTableHeader() {
  return (
    <thead className="bg-slate-50/50 text-left text-xs uppercase tracking-wide text-slate-500">
      <tr>
        <th className="px-6 py-3 font-medium">Flag</th>
        <th className="px-6 py-3 font-medium">Strategy</th>
        <th className="px-6 py-3 font-medium">Status</th>
        <th className="px-6 py-3 font-medium tabular-nums">Evals / 24h</th>
        <th className="px-6 py-3 text-right font-medium">Enabled</th>
      </tr>
    </thead>
  );
}

function FlagRow({
  flag,
  selected,
  evals,
  onSelect,
  onToggleEnabled,
}: {
  flag: AdminFlag;
  selected: boolean;
  evals: number;
  onSelect: () => void;
  onToggleEnabled: (next: boolean) => void;
}) {
  const status = statusOf(flag);
  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer border-t border-slate-100 transition ${
        selected ? "bg-emerald-50/60" : "hover:bg-slate-50/70"
      }`}
    >
      <td className="px-6 py-3">
        <p className="font-medium text-slate-900">{flag.name}</p>
        <p className="font-mono text-xs text-slate-500">{flag.key}</p>
      </td>
      <td className="px-6 py-3">
        <StrategyBadge kind={strategyOf(flag)} />
      </td>
      <td className="px-6 py-3">
        <span className={`badge ${STATUS_BADGE_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
      </td>
      <td className="px-6 py-3 tabular-nums text-slate-700">{formatCount(evals)}</td>
      <td className="px-6 py-3 text-right">
        <Toggle
          enabled={flag.enabled}
          onChange={onToggleEnabled}
          label={`Toggle ${flag.name}`}
        />
      </td>
    </tr>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString("en-GB");
}
