import { listReports } from "@/lib/reports";

import { ReportsWorkspace } from "./ReportsWorkspace";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { selected?: string };
}) {
  const reports = await listReports();
  const initialId = (() => {
    const requested = Number(searchParams.selected);
    if (Number.isFinite(requested) && reports.some((r) => r.id === requested)) {
      return requested;
    }
    return reports[0]?.id ?? null;
  })();

  return <ReportsWorkspace reports={reports} initialId={initialId} />;
}
