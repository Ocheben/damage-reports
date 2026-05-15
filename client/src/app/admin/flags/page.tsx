import { redirect } from "next/navigation";

import type { DecisionAggregates } from "@/components/admin/AuditTab";
import type { DecisionRow } from "@/components/admin/DecisionsTable";
import type { AdminFlag } from "@/components/admin/types";
import { adminFetch, type AdminStats } from "@/lib/admin-api";

import { AdminWorkspace, type TabId } from "./AdminWorkspace";

export const dynamic = "force-dynamic";

export default async function AdminFlagsPage({
  searchParams,
}: {
  searchParams: { tab?: string; selected?: string };
}) {
  let flagsBody: { data: AdminFlag[] };
  let stats: AdminStats;
  let decisions: { data: DecisionRow[]; aggregates: DecisionAggregates };
  try {
    [flagsBody, stats, decisions] = await Promise.all([
      adminFetch<{ data: AdminFlag[] }>("/api/admin/flags"),
      adminFetch<AdminStats>("/api/admin/stats"),
      adminFetch<{ data: DecisionRow[]; aggregates: DecisionAggregates }>(
        "/api/admin/decisions?limit=200",
      ),
    ]);
  } catch (err) {
    if ((err as { status?: number }).status === 401) {
      redirect("/api/auth/expired?next=/admin/flags");
    }
    throw err;
  }

  const flags = flagsBody.data;
  const initialSelected =
    flags.find((f) => f.key === searchParams.selected)?.key ?? flags[0]?.key ?? null;

  return (
    <AdminWorkspace
      initialFlags={flags}
      stats={stats}
      decisions={decisions}
      initialSelectedKey={initialSelected}
      initialTab={(searchParams.tab as TabId | undefined) ?? "all"}
    />
  );
}
