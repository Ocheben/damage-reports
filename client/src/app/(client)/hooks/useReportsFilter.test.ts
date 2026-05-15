import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { DamageReport } from "@/lib/reports";

import { useReportsFilter } from "./useReportsFilter";

function makeReport(overrides: Partial<DamageReport>): DamageReport {
  return {
    id: 1,
    reference: "DR-001",
    reporter_name: "Alice",
    reporter_email: "alice@example.com",
    vehicle_registration: "AB-12-CD",
    vehicle_make: "Volkswagen",
    vehicle_model: "Golf",
    location: "Amsterdam",
    incident_at: null,
    cover_image_url: null,
    damage_type: "dent",
    severity: "minor",
    description: "small dent",
    photos: [],
    estimated_cost: null,
    status: "submitted",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const reports: DamageReport[] = [
  makeReport({ id: 1, reference: "DR-A", status: "submitted", vehicle_make: "Volkswagen" }),
  makeReport({ id: 2, reference: "DR-B", status: "reviewing", vehicle_make: "Tesla" }),
  makeReport({ id: 3, reference: "DR-C", status: "approved", vehicle_make: "BMW" }),
  makeReport({ id: 4, reference: "DR-D", status: "rejected", vehicle_make: "Ford" }),
  makeReport({ id: 5, reference: "DR-E", status: "repaired", vehicle_make: "Renault" }),
];

describe("useReportsFilter", () => {
  it("computes counts for all/open/closed buckets", () => {
    const { result } = renderHook(() => useReportsFilter(reports));
    expect(result.current.counts).toEqual({ all: 5, open: 2, closed: 3 });
  });

  it("returns every report when tab=all and search is empty", () => {
    const { result } = renderHook(() => useReportsFilter(reports));
    expect(result.current.filtered).toHaveLength(5);
  });

  it("filters to open statuses (submitted, reviewing) when tab=open", () => {
    const { result } = renderHook(() => useReportsFilter(reports));
    act(() => result.current.setTab("open"));
    expect(result.current.filtered.map((r) => r.id)).toEqual([1, 2]);
  });

  it("filters to closed statuses (approved, rejected, repaired) when tab=closed", () => {
    const { result } = renderHook(() => useReportsFilter(reports));
    act(() => result.current.setTab("closed"));
    expect(result.current.filtered.map((r) => r.id)).toEqual([3, 4, 5]);
  });

  it("search matches reference, make, model, registration, location case-insensitively", () => {
    const { result } = renderHook(() => useReportsFilter(reports));

    act(() => result.current.setSearch("tesla"));
    expect(result.current.filtered.map((r) => r.id)).toEqual([2]);

    act(() => result.current.setSearch("DR-D"));
    expect(result.current.filtered.map((r) => r.id)).toEqual([4]);
  });

  it("combines tab + search filters", () => {
    const { result } = renderHook(() => useReportsFilter(reports));
    act(() => {
      result.current.setTab("closed");
      result.current.setSearch("bmw");
    });
    expect(result.current.filtered.map((r) => r.id)).toEqual([3]);
  });
});
