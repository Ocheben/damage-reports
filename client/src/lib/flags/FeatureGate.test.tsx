import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeatureFlagProvider } from "./provider";
import { FeatureGate } from "./FeatureGate";
import type { FlagSet } from "./types";

function withProvider(ui: React.ReactNode, flags: FlagSet) {
  return render(<FeatureFlagProvider initialFlags={flags}>{ui}</FeatureFlagProvider>);
}

describe("<FeatureGate>", () => {
  it("renders children when the flag is on", () => {
    withProvider(
      <FeatureGate flag="report-photos">
        <span>visible</span>
      </FeatureGate>,
      { "report-photos": { value: true, reason: "default" } },
    );

    expect(screen.getByText("visible")).toBeInTheDocument();
  });

  it("renders fallback when the flag is off", () => {
    withProvider(
      <FeatureGate flag="report-photos" fallback={<span>fallback</span>}>
        <span>visible</span>
      </FeatureGate>,
      { "report-photos": { value: false, reason: "disabled" } },
    );

    expect(screen.queryByText("visible")).not.toBeInTheDocument();
    expect(screen.getByText("fallback")).toBeInTheDocument();
  });

  it("inverts when invert=true", () => {
    withProvider(
      <FeatureGate flag="report-photos" invert>
        <span>shown-when-off</span>
      </FeatureGate>,
      { "report-photos": { value: false, reason: "disabled" } },
    );

    expect(screen.getByText("shown-when-off")).toBeInTheDocument();
  });

  it("treats an unknown flag as off", () => {
    withProvider(
      <FeatureGate flag="not-seeded">
        <span>visible</span>
      </FeatureGate>,
      {},
    );

    expect(screen.queryByText("visible")).not.toBeInTheDocument();
  });
});
