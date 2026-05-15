import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useReportSelection } from "./useReportSelection";

describe("useReportSelection", () => {
  it("starts with the initial id", () => {
    const { result } = renderHook(() => useReportSelection(7));
    expect(result.current.selectedId).toBe(7);
  });

  it("supports a null initial id", () => {
    const { result } = renderHook(() => useReportSelection(null));
    expect(result.current.selectedId).toBeNull();
  });

  it("select() updates the state and writes the id to the URL", () => {
    const { result } = renderHook(() => useReportSelection(null));

    act(() => result.current.select(42));

    expect(result.current.selectedId).toBe(42);
    const url = new URL(window.location.href);
    expect(url.searchParams.get("selected")).toBe("42");
  });

  it("re-selecting another id replaces the URL value", () => {
    const { result } = renderHook(() => useReportSelection(1));

    act(() => result.current.select(99));

    expect(result.current.selectedId).toBe(99);
    expect(new URL(window.location.href).searchParams.get("selected")).toBe("99");
  });
});
