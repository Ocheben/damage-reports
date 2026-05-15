"use client";

import { AlertTriangle, Sparkles } from "lucide-react";

import { FeatureGate } from "@/lib/flags/FeatureGate";
import { useFlagDecision } from "@/lib/flags/hooks";
import { FLAG_KEYS } from "@/lib/flags/types";
import type { AiAnalysis } from "@/lib/reports";

import {
  confidenceDisplay,
  estimatedCostDisplay,
  estimatedDaysDisplay,
  parseRolloutLabel,
  severityScoreDisplay,
  severityScorePercent,
} from "../utils";

export function AiDamageAnalysis({ analysis }: { analysis: AiAnalysis | null }) {
  return (
    <FeatureGate flag={FLAG_KEYS.aiDamageAnalysis}>
      <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
        <AnalysisHeader />
        <StatsRow analysis={analysis} />
        {analysis?.detected_damage && <DetectedDamage damage={analysis.detected_damage} />}
        {!analysis && (
          <p className="mt-3 text-sm text-slate-500">
            No analysis run yet — submit a report with “Request AI analysis” enabled.
          </p>
        )}
      </section>
    </FeatureGate>
  );
}

function AnalysisHeader() {
  return (
    <div className="flex items-start justify-between gap-3 pb-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-600 text-white shadow-sm">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-900">AI damage assessment</p>
          <p className="text-xs text-slate-500">Computer-vision estimate · beta</p>
        </div>
      </div>
      <RolloutBadge />
    </div>
  );
}

function StatsRow({ analysis }: { analysis: AiAnalysis | null }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat
        label="Severity score"
        value={severityScoreDisplay(analysis)}
        extra={<ProgressBar percent={severityScorePercent(analysis)} />}
      />
      <Stat
        label="Estimated repair"
        value={estimatedCostDisplay(analysis)}
        extra={<span className="text-xs text-slate-500">{confidenceDisplay(analysis)}</span>}
      />
      <Stat
        label="Estimated days"
        value={estimatedDaysDisplay(analysis)}
        extra={<span className="text-xs text-slate-500">at typical shop</span>}
      />
    </div>
  );
}

function DetectedDamage({ damage }: { damage: string }) {
  return (
    <p className="mt-3 flex items-start gap-1.5 text-sm text-slate-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
      <span>
        <span className="font-medium">Detected damage:</span> {damage}.
      </span>
    </p>
  );
}

function Stat({
  label,
  value,
  extra,
}: {
  label: string;
  value: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      <div className="mt-2">{extra}</div>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div className="h-full bg-slate-900 transition-[width]" style={{ width: `${percent}%` }} />
    </div>
  );
}

function RolloutBadge() {
  const decision = useFlagDecision(FLAG_KEYS.aiDamageAnalysis);
  return (
    <span
      className="badge border-slate-200 bg-white text-slate-600"
      title={`flag reason: ${decision.reason}`}
    >
      {parseRolloutLabel(decision.reason)}
    </span>
  );
}
