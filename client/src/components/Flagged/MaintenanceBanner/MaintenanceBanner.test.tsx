import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeatureFlagProvider } from "@/lib/flags/provider";
import type { FlagSet } from "@/lib/flags/types";

import { MaintenanceBanner } from "./MaintenanceBanner";

function withProvider(ui: React.ReactNode, flags: FlagSet) {
  return render(<FeatureFlagProvider initialFlags={flags}>{ui}</FeatureFlagProvider>);
}

describe("<MaintenanceBanner>", () => {
  it("renders the banner when maintenance-banner flag is on", () => {
    withProvider(<MaintenanceBanner />, {
      "maintenance-banner": { value: true, reason: "default" },
    });
    expect(screen.getByText(/scheduled maintenance/i)).toBeInTheDocument();
  });

  it("renders nothing when the flag is off", () => {
    withProvider(<MaintenanceBanner />, {
      "maintenance-banner": { value: false, reason: "disabled" },
    });
    expect(screen.queryByText(/scheduled maintenance/i)).not.toBeInTheDocument();
  });

  it("renders nothing when the flag is unknown", () => {
    withProvider(<MaintenanceBanner />, {});
    expect(screen.queryByText(/scheduled maintenance/i)).not.toBeInTheDocument();
  });
});
