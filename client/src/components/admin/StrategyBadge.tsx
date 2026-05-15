"use client";

import { Calendar, Percent, Target, ToggleRight } from "lucide-react";

import type { StrategyKind } from "./strategy";

const META: Record<
  StrategyKind,
  { label: string; icon: React.ReactNode; cls: string }
> = {
  boolean: {
    label: "Boolean",
    icon: <ToggleRight className="h-3 w-3" />,
    cls: "border-slate-200 bg-slate-50 text-slate-700",
  },
  percentage: {
    label: "Percentage rollout",
    icon: <Percent className="h-3 w-3" />,
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  user_targeting: {
    label: "User targeting",
    icon: <Target className="h-3 w-3" />,
    cls: "border-blue-200 bg-blue-50 text-blue-700",
  },
  attribute: {
    label: "Attribute",
    icon: <Target className="h-3 w-3" />,
    cls: "border-violet-200 bg-violet-50 text-violet-700",
  },
  scheduled: {
    label: "Scheduled",
    icon: <Calendar className="h-3 w-3" />,
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

export function StrategyBadge({ kind }: { kind: StrategyKind }) {
  const meta = META[kind];
  return (
    <span className={`badge ${meta.cls}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}
