"use client";

import { useRouter } from "next/navigation";

import { BulkActionsBar } from "@/components/Flagged/BulkActionsBar";
import { ReportDetailPanel } from "@/components/Reports/ReportDetailPanel";
import { TabSwitcher, type TabOption } from "@/components/Ui/TabSwitcher";
import { useFlag } from "@/lib/flags/hooks";
import { FLAG_KEYS } from "@/lib/flags/types";
import type { DamageReport } from "@/lib/reports";

import type { StatusFilter } from "./constants";
import { ReportsList } from "./ReportsList";
import { ReportsWorkspaceHeader } from "./ReportsWorkspaceHeader";
import { useBulkSelection } from "./hooks/useBulkSelection";
import { useReportsFilter } from "./hooks/useReportsFilter";
import { useReportSelection } from "./hooks/useReportSelection";

export function ReportsWorkspace({
  reports,
  initialId,
}: {
  reports: DamageReport[];
  initialId: number | null;
}) {
  const router = useRouter();
  const showBulk = useFlag(FLAG_KEYS.bulkActions);

  const { tab, setTab, search, setSearch, filtered, counts } = useReportsFilter(reports);
  const { selectedId, select } = useReportSelection(initialId);
  const bulk = useBulkSelection<number>();

  const selected = filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  const tabs: ReadonlyArray<TabOption<StatusFilter>> = [
    { id: "all", label: `All (${counts.all})` },
    { id: "open", label: `Open (${counts.open})` },
    { id: "closed", label: `Closed (${counts.closed})` },
  ];

  return (
    <div className="space-y-6">
      <ReportsWorkspaceHeader search={search} onSearchChange={setSearch} />

      <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)] xl:grid-cols-[480px_minmax(0,1fr)]">
        <div className="space-y-3">
          <TabSwitcher tabs={tabs} active={tab} onChange={setTab} />

          <BulkActionsBar
            selected={bulk.selected}
            onCleared={() => {
              bulk.clear();
              router.refresh();
            }}
          />

          <ReportsList
            reports={filtered}
            selectedId={selected?.id ?? null}
            onSelect={select}
            bulkEnabled={showBulk}
            bulkSelection={bulk.selected}
            onToggleBulk={bulk.toggle}
          />
        </div>

        <div>
          {selected ? (
            <ReportDetailPanel report={selected} />
          ) : (
            <div className="card p-12 text-center text-sm text-slate-500">
              Select a report on the left to see its details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
