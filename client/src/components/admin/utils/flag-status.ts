import type { AdminFlag, PercentageRule } from "../types";

export type FlagStatus = "active" | "disabled" | "scheduled" | "expired";

export function statusOf(flag: AdminFlag): FlagStatus {
  if (!flag.enabled) return "disabled";
  if (flag.starts_at && new Date(flag.starts_at) > new Date()) return "scheduled";
  if (flag.ends_at && new Date(flag.ends_at) < new Date()) return "expired";
  return "active";
}

export const STATUS_BADGE_CLASS: Record<FlagStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  disabled: "border-red-200 bg-red-50 text-red-600",
  scheduled: "border-amber-200 bg-amber-50 text-amber-700",
  expired: "border-slate-200 bg-slate-50 text-slate-600",
};

export const STATUS_LABEL: Record<FlagStatus, string> = {
  active: "Active",
  disabled: "Disabled",
  scheduled: "Scheduled",
  expired: "Expired",
};

export function initialRolloutPercentage(flag: AdminFlag): number | null {
  const rule = (flag.rules ?? []).find((r) => r.type === "percentage_rollout");
  return rule ? Number((rule as PercentageRule).percentage) : null;
}
