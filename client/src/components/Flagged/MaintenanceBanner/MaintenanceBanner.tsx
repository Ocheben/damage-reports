"use client";

import { FeatureGate } from "@/lib/flags/FeatureGate";
import { FLAG_KEYS } from "@/lib/flags/types";

export function MaintenanceBanner() {
  return (
    <FeatureGate flag={FLAG_KEYS.maintenanceBanner}>
      <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
        <strong>Scheduled maintenance:</strong> some features may be temporarily unavailable.
      </div>
    </FeatureGate>
  );
}
