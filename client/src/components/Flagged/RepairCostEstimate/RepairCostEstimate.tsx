"use client";

import { FeatureGate } from "@/lib/flags/FeatureGate";
import { FLAG_KEYS } from "@/lib/flags/types";

export function RepairCostEstimate({ amount }: { amount: number | string | null }) {
  return (
    <FeatureGate flag={FLAG_KEYS.costEstimate}>
      <div className="card flex items-center justify-between gap-4 p-5">
        <div>
          <p className="label">Estimated repair cost</p>
          <p className="text-2xl font-semibold text-emerald-700">
            {amount != null ? `€${Number(amount).toFixed(2)}` : "Pending review"}
          </p>
        </div>
        <p className="text-xs text-slate-500">
          Indicative only. Subject to workshop assessment.
        </p>
      </div>
    </FeatureGate>
  );
}
