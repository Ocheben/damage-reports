import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeatureFlagProvider } from "@/lib/flags/provider";
import type { FlagSet } from "@/lib/flags/types";

import { RepairCostEstimate } from "./RepairCostEstimate";

const ON: FlagSet = { "cost-estimate": { value: true, reason: "default" } };
const OFF: FlagSet = { "cost-estimate": { value: false, reason: "disabled" } };

function withProvider(ui: React.ReactNode, flags: FlagSet) {
  return render(<FeatureFlagProvider initialFlags={flags}>{ui}</FeatureFlagProvider>);
}

describe("<RepairCostEstimate>", () => {
  it("formats a numeric amount as a euro value with two decimals", () => {
    withProvider(<RepairCostEstimate amount={1840} />, ON);
    expect(screen.getByText("€1840.00")).toBeInTheDocument();
  });

  it("coerces a string amount through Number()", () => {
    withProvider(<RepairCostEstimate amount="220" />, ON);
    expect(screen.getByText("€220.00")).toBeInTheDocument();
  });

  it("shows 'Pending review' when the amount is null", () => {
    withProvider(<RepairCostEstimate amount={null} />, ON);
    expect(screen.getByText(/pending review/i)).toBeInTheDocument();
  });

  it("renders nothing when the cost-estimate flag is off", () => {
    withProvider(<RepairCostEstimate amount={1840} />, OFF);
    expect(screen.queryByText("€1840.00")).not.toBeInTheDocument();
    expect(screen.queryByText(/estimated repair cost/i)).not.toBeInTheDocument();
  });
});
