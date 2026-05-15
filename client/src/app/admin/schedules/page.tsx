import { redirect } from "next/navigation";

import { adminFetch } from "@/lib/admin-api";
import { StrategyBadge } from "@/components/admin/StrategyBadge";
import { strategyOf } from "@/components/admin/strategy";
import type { AdminFlag } from "@/components/admin/types";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  let flags: AdminFlag[];
  try {
    ({ data: flags } = await adminFetch<{ data: AdminFlag[] }>("/api/admin/flags"));
  } catch (err) {
    if ((err as { status?: number }).status === 401) {
      redirect("/api/auth/expired?next=/admin/schedules");
    }
    throw err;
  }
  const scheduled = flags
    .filter((f) => f.starts_at || f.ends_at)
    .sort((a, b) => (a.starts_at ?? a.ends_at ?? "").localeCompare(b.starts_at ?? b.ends_at ?? ""));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Schedules</h1>
        <p className="mt-1 text-sm text-slate-600">
          Flags with a schedule window — they activate or expire automatically when the
          window opens or closes. The evaluator checks the window on every request, so
          there&apos;s no cron required for correctness.
        </p>
      </header>

      <div className="card overflow-hidden">
        <header className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold">Upcoming and active windows</h2>
        </header>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50/50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-3 font-medium">Flag</th>
              <th className="px-6 py-3 font-medium">Strategy</th>
              <th className="px-6 py-3 font-medium">Starts</th>
              <th className="px-6 py-3 font-medium">Ends</th>
            </tr>
          </thead>
          <tbody>
            {scheduled.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                  No flags have a schedule window yet. Add one from the flag editor.
                </td>
              </tr>
            )}
            {scheduled.map((f) => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="px-6 py-3">
                  <p className="font-medium text-slate-900">{f.name}</p>
                  <p className="font-mono text-xs text-slate-500">{f.key}</p>
                </td>
                <td className="px-6 py-3"><StrategyBadge kind={strategyOf(f)} /></td>
                <td className="px-6 py-3 font-mono text-xs text-slate-600">
                  {f.starts_at?.replace("T", " ").slice(0, 16) ?? "—"}
                </td>
                <td className="px-6 py-3 font-mono text-xs text-slate-600">
                  {f.ends_at?.replace("T", " ").slice(0, 16) ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
