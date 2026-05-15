import Link from "next/link";

import { adminFetch } from "@/lib/admin-api";

import { DecisionReasonBreakdown } from "./DecisionReasonBreakdown";
import { DecisionsLogTable, type Decision } from "./DecisionsLogTable";
import { DecisionsStats } from "./DecisionsStats";

export const dynamic = "force-dynamic";

type DecisionsResponse = {
  data: Decision[];
  aggregates: {
    total: number;
    by_reason: Record<string, number>;
    by_result: Record<string, number>;
  };
};

export default async function DecisionsPage({
  searchParams,
}: {
  searchParams: { flag?: string };
}) {
  const path = searchParams.flag
    ? `/api/admin/decisions?flag_key=${encodeURIComponent(searchParams.flag)}`
    : "/api/admin/decisions";
  const { data, aggregates } = await adminFetch<DecisionsResponse>(path);

  return (
    <div className="space-y-6">
      <DecisionsHeader />

      <DecisionsStats
        total={aggregates.total}
        trueCount={aggregates.by_result.true ?? 0}
        falseCount={aggregates.by_result.false ?? 0}
      />

      <DecisionReasonBreakdown byReason={aggregates.by_reason} />

      <DecisionsLogTable decisions={data} />
    </div>
  );
}

function DecisionsHeader() {
  return (
    <header className="flex items-end justify-between">
      <div>
        <Link href="/admin/flags" className="text-xs text-slate-500 hover:underline">
          ← back to flags
        </Link>
        <h1 className="text-2xl font-semibold">Decision log</h1>
        <p className="text-sm text-slate-600">
          Recent flag evaluations. Sample rate set by{" "}
          <code className="rounded bg-slate-100 px-1">FLAG_DECISION_LOG_SAMPLE_RATE</code>.
        </p>
      </div>
    </header>
  );
}
