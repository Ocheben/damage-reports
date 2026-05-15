"use client";

import { formatDecisionTime } from "./utils/format";
import { DecisionResultBadge } from "./DecisionResultBadge";

export type DecisionRow = {
  id: number;
  flag_key: string;
  user_key: string | null;
  result: boolean;
  reason: string;
  decided_at: string;
};

export function DecisionsTable({ decisions }: { decisions: DecisionRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50/50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-6 py-3 font-medium">Decided</th>
            <th className="px-6 py-3 font-medium">Flag</th>
            <th className="px-6 py-3 font-medium">User</th>
            <th className="px-6 py-3 font-medium">Result</th>
            <th className="px-6 py-3 font-medium">Reason</th>
          </tr>
        </thead>
        <tbody>
          {decisions.map((d) => (
            <DecisionRowItem key={d.id} decision={d} />
          ))}
          {decisions.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-6 text-center text-sm text-slate-500">
                No decisions logged yet — make a few requests from the client app.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DecisionRowItem({ decision }: { decision: DecisionRow }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-6 py-2 font-mono text-xs text-slate-500">
        {formatDecisionTime(decision.decided_at)}
      </td>
      <td className="px-6 py-2 font-mono text-xs">{decision.flag_key}</td>
      <td className="px-6 py-2 text-xs text-slate-600">
        {decision.user_key ?? <em className="text-slate-400">anon</em>}
      </td>
      <td className="px-6 py-2">
        <DecisionResultBadge result={decision.result} />
      </td>
      <td className="px-6 py-2 font-mono text-xs">{decision.reason}</td>
    </tr>
  );
}
