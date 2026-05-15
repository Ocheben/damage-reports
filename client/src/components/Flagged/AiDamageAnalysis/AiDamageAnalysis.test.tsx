import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeatureFlagProvider } from "@/lib/flags/provider";
import type { FlagSet } from "@/lib/flags/types";
import type { AiAnalysis } from "@/lib/reports";

import { AiDamageAnalysis } from "./AiDamageAnalysis";

const ON: FlagSet = {
  "ai-damage-analysis": { value: true, reason: "matched:percentage_rollout:35" },
};
const OFF: FlagSet = {
  "ai-damage-analysis": { value: false, reason: "default" },
};

function withProvider(ui: React.ReactNode, flags: FlagSet) {
  return render(<FeatureFlagProvider initialFlags={flags}>{ui}</FeatureFlagProvider>);
}

describe("<AiDamageAnalysis>", () => {
  it("renders nothing when the ai-damage-analysis flag is off", () => {
    withProvider(<AiDamageAnalysis analysis={null} />, OFF);
    expect(screen.queryByText(/AI damage assessment/i)).not.toBeInTheDocument();
  });

  it("shows the empty-state message when no analysis is provided", () => {
    withProvider(<AiDamageAnalysis analysis={null} />, ON);
    expect(screen.getByText(/AI damage assessment/i)).toBeInTheDocument();
    expect(screen.getByText(/no analysis run yet/i)).toBeInTheDocument();
  });

  it("renders all stats and the detected damage line when analysis is present", () => {
    const analysis: AiAnalysis = {
      severity_score: 62,
      estimated_cost: 1840,
      estimated_days: 4,
      confidence: 0.87,
      detected_damage: "Rear bumper crack and taillight crack",
    };
    withProvider(<AiDamageAnalysis analysis={analysis} />, ON);

    expect(screen.getByText("62 / 100")).toBeInTheDocument();
    expect(screen.getByText(/€1,840/)).toBeInTheDocument();
    expect(screen.getByText("4 days")).toBeInTheDocument();
    expect(screen.getByText(/Rear bumper crack/i)).toBeInTheDocument();
  });

  it("parses the rollout percentage from the flag reason for the badge", () => {
    withProvider(<AiDamageAnalysis analysis={null} />, ON);
    expect(screen.getByText("35% rollout")).toBeInTheDocument();
  });

  it("falls back to 'QA cohort' label when matched via user_targeting", () => {
    withProvider(<AiDamageAnalysis analysis={null} />, {
      "ai-damage-analysis": { value: true, reason: "matched:user_targeting" },
    });
    expect(screen.getByText("QA cohort")).toBeInTheDocument();
  });
});
