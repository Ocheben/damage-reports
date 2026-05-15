"use client";

import { useState } from "react";

import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { AuditTab, type DecisionAggregates } from "@/components/admin/AuditTab";
import type { DecisionRow } from "@/components/admin/DecisionsTable";
import { FlagDetailSidePanel } from "@/components/admin/FlagDetailSidePanel";
import { FlagStatsOverview } from "@/components/admin/FlagStatsOverview";
import { FlagsTable } from "@/components/admin/FlagsTable";
import { FlagsWorkspaceHeader } from "@/components/admin/FlagsWorkspaceHeader";
import type { AdminFlag } from "@/components/admin/types";
import { useFlagsAdmin } from "@/components/admin/hooks/useFlagsAdmin";
import { TabSwitcher, type TabOption } from "@/components/Ui/TabSwitcher";
import type { AdminStats } from "@/lib/admin-api";

export type TabId = "all" | "analytics" | "audit";

const TABS: ReadonlyArray<TabOption<TabId>> = [
  { id: "all", label: "All flags" },
  { id: "analytics", label: "Analytics" },
  { id: "audit", label: "Audit log" },
];

export function AdminWorkspace({
  initialFlags,
  stats,
  decisions,
  initialSelectedKey,
  initialTab,
}: {
  initialFlags: AdminFlag[];
  stats: AdminStats;
  decisions: { data: DecisionRow[]; aggregates: DecisionAggregates };
  initialSelectedKey: string | null;
  initialTab: TabId;
}) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const {
    flags,
    filtered,
    selected,
    search,
    setSearch,
    toggleEnabled,
    select,
    onFlagUpdated,
    onFlagDeleted,
  } = useFlagsAdmin(initialFlags, initialSelectedKey);

  return (
    <div className="space-y-6">
      <FlagsWorkspaceHeader search={search} onSearchChange={setSearch} />

      <FlagStatsOverview stats={stats} />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} />

      {tab === "all" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <FlagsTable
            flags={filtered}
            selectedKey={selected?.key ?? null}
            onSelect={select}
            onToggleEnabled={toggleEnabled}
            evalsByFlag={stats.evaluations_24h_by_flag}
          />
          <div>
            {selected ? (
              <FlagDetailSidePanel
                key={selected.id}
                flag={selected}
                onUpdated={onFlagUpdated}
                onDeleted={onFlagDeleted}
              />
            ) : (
              <div className="card p-10 text-center text-sm text-slate-500">
                Select a flag to see its details.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "analytics" && <AnalyticsTab flags={flags} stats={stats} />}

      {tab === "audit" && (
        <AuditTab decisions={decisions.data} aggregates={decisions.aggregates} />
      )}
    </div>
  );
}
