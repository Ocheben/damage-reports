import { formatDecisionTime } from "@/components/admin/utils/format";

export type Decision = {
  id: number;
  flag_key: string;
  user_key: string | null;
  result: boolean;
  reason: string;
  context: { user_key?: string | null; attributes?: Record<string, unknown> } | null;
  decided_at: string;
};

export function DecisionsLogTable({ decisions }: { decisions: Decision[] }) {
  return (
    <section className="card overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-500">
            <th className="px-2 py-2">Decided</th>
            <th className="px-2 py-2">Flag</th>
            <th className="px-2 py-2">User</th>
            <th className="px-2 py-2">Result</th>
            <th className="px-2 py-2">Reason</th>
          </tr>
        </thead>
        <tbody>
          {decisions.map((d) => (
            <DecisionLogRow key={d.id} decision={d} />
          ))}
          {decisions.length === 0 && (
            <tr>
              <td colSpan={5} className="px-2 py-4 text-center text-sm text-slate-500">
                No decisions logged yet — make a request from the reports app and refresh.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function DecisionLogRow({ decision }: { decision: Decision }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-2 py-1.5 font-mono text-xs text-slate-500">
        {formatDecisionTime(decision.decided_at)}
      </td>
      <td className="px-2 py-1.5 font-mono text-xs">{decision.flag_key}</td>
      <td className="px-2 py-1.5 text-xs text-slate-600">
        {decision.user_key ?? <em className="text-slate-400">anon</em>}
      </td>
      <td className="px-2 py-1.5">
        {decision.result ? (
          <span className="pill bg-emerald-100 text-emerald-700">true</span>
        ) : (
          <span className="pill bg-slate-100 text-slate-600">false</span>
        )}
      </td>
      <td className="px-2 py-1.5 font-mono text-xs">{decision.reason}</td>
    </tr>
  );
}
