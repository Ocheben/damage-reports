import { describe, expect, it } from "vitest";

import { damageReportSchema, type DamageReportFormValues } from "./damageReport";
import { validate } from "./schema";

const ok: DamageReportFormValues = {
  reporter_name: "Alice",
  reporter_email: "alice@example.com",
  incident_at: "2026-01-02",
  location: "Amsterdam",
  damage_type: "dent",
  severity: "minor",
  description: "There is a small dent on the rear bumper.",
};

describe("damageReportSchema", () => {
  it("accepts a fully-populated valid report", () => {
    const r = validate(damageReportSchema, ok);
    expect(r.ok).toBe(true);
  });

  it("rejects a future incident date", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const r = validate(damageReportSchema, { ...ok, incident_at: future });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.incident_at).toMatch(/future/i);
  });

  it("rejects an unknown damage_type", () => {
    const r = validate(damageReportSchema, { ...ok, damage_type: "alien" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.damage_type).toBeDefined();
  });

  it("rejects a too-short description", () => {
    const r = validate(damageReportSchema, { ...ok, description: "short" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.description).toMatch(/at least 10/i);
  });

  it("rejects an empty reporter_name", () => {
    const r = validate(damageReportSchema, { ...ok, reporter_name: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.reporter_name).toMatch(/required/i);
  });
});
