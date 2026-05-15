"use client";

export function StatCard({
  label,
  value,
  hint,
  trend,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  icon: React.ReactNode;
}) {
  return (
    <div className="card flex items-start justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
          {value}
        </p>
        {trend ? <TrendLabel trend={trend} /> : hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-600">
        {icon}
      </span>
    </div>
  );
}

function TrendLabel({
  trend,
}: {
  trend: { direction: "up" | "down" | "flat"; label: string };
}) {
  const colors = {
    up: "text-emerald-600",
    down: "text-red-600",
    flat: "text-slate-500",
  } as const;
  const arrow = trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→";
  return (
    <p className={`mt-1 text-xs ${colors[trend.direction]}`}>
      {arrow} {trend.label}
    </p>
  );
}
