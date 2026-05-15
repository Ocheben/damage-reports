import type { RuleDefinition } from "./types";

export type StrategyKind = "boolean" | "percentage" | "user_targeting" | "attribute" | "scheduled";

export function strategyOf(flag: {
  rules?: RuleDefinition[] | null;
  starts_at?: string | null;
  ends_at?: string | null;
}): StrategyKind {
  // Schedule wins — it gates everything else.
  if (flag.starts_at || flag.ends_at) return "scheduled";

  const rules = flag.rules ?? [];
  for (const r of rules) {
    if (r.type === "percentage_rollout") return "percentage";
    if (r.type === "user_targeting") return "user_targeting";
    if (r.type === "attribute") return "attribute";
  }
  return "boolean";
}
