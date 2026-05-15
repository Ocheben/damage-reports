import Link from "next/link";

export function DecisionReasonBreakdown({ byReason }: { byReason: Record<string, number> }) {
  const entries = Object.entries(byReason);

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold">Reason breakdown</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {entries.map(([reason, count]) => (
          <Link
            key={reason}
            href="/admin/decisions"
            className="pill bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            {reason} <span className="font-mono">({count})</span>
          </Link>
        ))}
        {entries.length === 0 && (
          <span className="text-sm text-slate-500">No decisions yet.</span>
        )}
      </div>
    </section>
  );
}
