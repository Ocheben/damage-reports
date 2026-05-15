"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { AdminFlag, PercentageRule } from "./types";
import {
  initialRolloutPercentage,
  statusOf,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
} from "./utils/flag-status";
import { Toggle } from "./Toggle";
import { useFlagMutations } from "./hooks/useFlagMutations";

export function FlagDetailSidePanel({
  flag,
  onUpdated,
  onDeleted,
}: {
  flag: AdminFlag;
  onUpdated: (next: AdminFlag) => void;
  onDeleted: (key: string) => void;
}) {
  const [pct, setPct] = useState<number | null>(initialRolloutPercentage(flag));

  const { patch, remove, busy, error, resetError } = useFlagMutations({
    flagId: flag.id,
    onUpdated,
    onDeleted: () => onDeleted(flag.key),
  });

  // Re-sync slider when a different flag is selected.
  useEffect(() => {
    setPct(initialRolloutPercentage(flag));
    resetError();
  }, [flag.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateRolloutPercent = async (next: number) => {
    setPct(next);
    const updatedRules = (flag.rules ?? []).map((r) =>
      r.type === "percentage_rollout" ? ({ ...r, percentage: next } as PercentageRule) : r,
    );
    await patch({ rules: updatedRules });
  };

  const confirmDelete = () => {
    if (!window.confirm(`Delete "${flag.name}"? This cannot be undone in the demo.`)) return;
    remove();
  };

  return (
    <article className="card sticky top-6">
      <PanelHeader flag={flag} />

      <div className="space-y-5 px-6 py-5">
        {flag.description && (
          <p className="text-sm leading-relaxed text-slate-600">{flag.description}</p>
        )}

        <EnabledSection
          enabled={flag.enabled}
          flagName={flag.name}
          busy={busy}
          onChange={(next) => patch({ enabled: next })}
        />

        {pct !== null && (
          <RolloutSection percent={pct} busy={busy} onChange={setPct} onCommit={updateRolloutPercent} />
        )}

        {(flag.starts_at || flag.ends_at) && (
          <ScheduleSection startsAt={flag.starts_at} endsAt={flag.ends_at} />
        )}

        {error && <ErrorBanner message={error} />}
      </div>

      <PanelFooter flagKey={flag.key} busy={busy} onDelete={confirmDelete} />
    </article>
  );
}

function PanelHeader({ flag }: { flag: AdminFlag }) {
  const status = statusOf(flag);
  return (
    <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{flag.name}</h2>
        <p className="font-mono text-xs text-slate-500">{flag.key}</p>
      </div>
      <span className={`badge ${STATUS_BADGE_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
    </header>
  );
}

function EnabledSection({
  enabled,
  flagName,
  busy,
  onChange,
}: {
  enabled: boolean;
  flagName: string;
  busy: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50/40 px-3 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-900">Enabled</span>
        <Toggle enabled={enabled} disabled={busy} onChange={onChange} label={`Toggle ${flagName}`} />
      </div>
      <p className="mt-1 text-xs text-slate-500">Environment: production</p>
    </section>
  );
}

function RolloutSection({
  percent,
  busy,
  onChange,
  onCommit,
}: {
  percent: number;
  busy: boolean;
  onChange: (next: number) => void;
  onCommit: (next: number) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50/40 px-3 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-900">Rollout</span>
        <span className="text-sm font-semibold tabular-nums text-slate-900">{percent}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={percent}
        disabled={busy}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        className="mt-3 w-full accent-emerald-600"
        aria-label="Rollout percentage"
      />
      <p className="mt-2 text-xs text-slate-500">Hashed on user ID for sticky bucketing.</p>
    </section>
  );
}

function ScheduleSection({
  startsAt,
  endsAt,
}: {
  startsAt: string | null;
  endsAt: string | null;
}) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-3 text-xs text-amber-800">
      <p className="font-semibold uppercase tracking-wide">Schedule window</p>
      {startsAt && <p>Starts: {startsAt}</p>}
      {endsAt && <p>Ends: {endsAt}</p>}
    </section>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {message}
    </p>
  );
}

function PanelFooter({
  flagKey,
  busy,
  onDelete,
}: {
  flagKey: string;
  busy: boolean;
  onDelete: () => void;
}) {
  return (
    <footer className="flex items-center gap-2 border-t border-slate-100 px-6 py-4">
      <Link href={`/admin/flags/${flagKey}`} className="btn flex-1 justify-center">
        <Pencil className="h-4 w-4" />
        Edit
      </Link>
      <button
        type="button"
        className="btn border-red-200 bg-red-50 px-3 text-red-600 hover:bg-red-100"
        aria-label="Delete flag"
        onClick={onDelete}
        disabled={busy}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </footer>
  );
}
