import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetForTests,
  subscribeToFlagEvents,
  type FlagEvent,
} from "@/lib/flags/events";

import { ApiError, FeatureDisabledError, apiFetch } from "./api";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  __resetForTests();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiFetch", () => {
  it("resolves with parsed JSON on 2xx", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ data: { id: 1 } }),
    );

    const out = await apiFetch<{ data: { id: number } }>("/api/v1/reports/1");
    expect(out.data.id).toBe(1);
  });

  it("throws FeatureDisabledError and emits flag events on 403 feature_disabled", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(
        { error: "feature_disabled", flag: "bulk-actions", message: "off" },
        403,
      ),
    );

    const events: FlagEvent[] = [];
    subscribeToFlagEvents((e) => events.push(e));

    await expect(apiFetch("/api/v1/reports/bulk-delete")).rejects.toBeInstanceOf(
      FeatureDisabledError,
    );

    expect(events).toEqual([
      { type: "feature_disabled", flag: "bulk-actions" },
      { type: "force_refresh" },
    ]);
  });

  it("throws ApiError with status + body on other non-2xx", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ errors: { reporter_name: ["required"] } }, 422),
    );

    try {
      await apiFetch("/api/v1/reports", { method: "POST" });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const e = err as ApiError;
      expect(e.status).toBe(422);
      expect((e.body as { errors: Record<string, string[]> }).errors.reporter_name).toEqual([
        "required",
      ]);
    }
  });

  it("returns undefined on 204", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    );

    const out = await apiFetch("/api/admin/flags/1", { method: "DELETE" });
    expect(out).toBeUndefined();
  });
});
