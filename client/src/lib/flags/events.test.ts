import { afterEach, describe, expect, it, vi } from "vitest";

import {
  __resetForTests,
  emitFlagEvent,
  subscribeToFlagEvents,
} from "./events";

afterEach(() => {
  __resetForTests();
});

describe("flag event bus", () => {
  it("invokes subscribed listeners with the event payload", () => {
    const listener = vi.fn();
    subscribeToFlagEvents(listener);

    emitFlagEvent({ type: "feature_disabled", flag: "report-photos" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      type: "feature_disabled",
      flag: "report-photos",
    });
  });

  it("supports multiple subscribers", () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribeToFlagEvents(a);
    subscribeToFlagEvents(b);

    emitFlagEvent({ type: "force_refresh" });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("stops invoking a listener after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToFlagEvents(listener);
    unsubscribe();

    emitFlagEvent({ type: "force_refresh" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("isolates failures: one throwing listener does not stop the others", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const good = vi.fn();
    subscribeToFlagEvents(() => {
      throw new Error("boom");
    });
    subscribeToFlagEvents(good);

    emitFlagEvent({ type: "force_refresh" });

    expect(good).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });
});
