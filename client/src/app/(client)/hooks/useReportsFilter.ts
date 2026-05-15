"use client";

import { useMemo, useState } from "react";

import type { DamageReport } from "@/lib/reports";

import { CLOSED_STATUSES, OPEN_STATUSES, type StatusFilter } from "../constants";

export function useReportsFilter(reports: DamageReport[]) {
  const [tab, setTab] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (tab === "open" && !OPEN_STATUSES.has(r.status)) return false;
      if (tab === "closed" && !CLOSED_STATUSES.has(r.status)) return false;
      if (!q) return true;
      return buildHaystack(r).includes(q);
    });
  }, [reports, tab, search]);

  const counts = useMemo(
    () => ({
      all: reports.length,
      open: reports.filter((r) => OPEN_STATUSES.has(r.status)).length,
      closed: reports.filter((r) => CLOSED_STATUSES.has(r.status)).length,
    }),
    [reports],
  );

  return { tab, setTab, search, setSearch, filtered, counts };
}

function buildHaystack(report: DamageReport): string {
  return [
    report.reference,
    report.vehicle_make,
    report.vehicle_model,
    report.vehicle_registration,
    report.location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
