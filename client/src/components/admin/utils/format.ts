export function formatLargeNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString("en-GB");
}

export function formatScheduleDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

export function formatDecisionTime(iso: string): string {
  return iso.replace("T", " ").slice(0, 19);
}
