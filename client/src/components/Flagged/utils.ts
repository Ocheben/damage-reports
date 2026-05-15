import type { AiAnalysis } from "@/lib/reports";

export function severityScoreDisplay(analysis: AiAnalysis | null): string {
  return analysis?.severity_score != null ? `${analysis.severity_score} / 100` : "—";
}

export function severityScorePercent(analysis: AiAnalysis | null): number {
  return Math.min(100, Math.max(0, Number(analysis?.severity_score ?? 0)));
}

export function estimatedCostDisplay(analysis: AiAnalysis | null): string {
  if (analysis?.estimated_cost == null) return "—";
  return `€${Math.round(Number(analysis.estimated_cost)).toLocaleString("en-GB")}`;
}

export function confidenceDisplay(analysis: AiAnalysis | null): string {
  const margin =
    analysis?.confidence != null ? Math.round((1 - Number(analysis.confidence)) * 100) : 15;
  return `±${margin}% confidence`;
}

export function estimatedDaysDisplay(analysis: AiAnalysis | null): string {
  return analysis?.estimated_days != null ? `${analysis.estimated_days} days` : "—";
}

/** Pull the percentage from a flag reason like "matched:percentage_rollout:35". */
export function parseRolloutLabel(reason: string): string {
  const m = reason.match(/percentage_rollout:(\d+(?:\.\d+)?)/);
  if (m) return `${m[1]}% rollout`;
  if (reason === "matched:user_targeting") return "QA cohort";
  return "35% rollout";
}
