"use client";

import { Activity, Calendar, Flag, TrendingUp } from "lucide-react";

import type { AdminStats } from "@/lib/admin-api";

import { formatLargeNumber, formatScheduleDate } from "./utils/format";
import { StatCard } from "./StatCard";

export function FlagStatsOverview({ stats }: { stats: AdminStats }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total flags"
        value={stats.total_flags}
        hint={stats.added_this_month > 0 ? `${stats.added_this_month} added this month` : undefined}
        icon={<Flag className="h-5 w-5" />}
      />
      <StatCard
        label="Evaluations / 24h"
        value={formatLargeNumber(stats.evaluations_24h)}
        trend={trendFromDelta(stats.evaluations_24h_delta)}
        icon={<Activity className="h-5 w-5" />}
      />
      <StatCard
        label="Active rollouts"
        value={stats.active_rollouts}
        icon={<TrendingUp className="h-5 w-5" />}
      />
      <StatCard
        label="Scheduled"
        value={stats.scheduled}
        hint={stats.next_scheduled_at ? `Activates ${formatScheduleDate(stats.next_scheduled_at)}` : undefined}
        icon={<Calendar className="h-5 w-5" />}
      />
    </section>
  );
}

function trendFromDelta(delta: number | null) {
  if (delta == null) return undefined;
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return {
    direction: direction as "up" | "down" | "flat",
    label: `${Math.abs(Math.round(delta * 100))}% vs yesterday`,
  };
}
