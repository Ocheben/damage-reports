import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useBulkSelection } from "./useBulkSelection";

describe("useBulkSelection", () => {
  it("starts with an empty selection", () => {
    const { result } = renderHook(() => useBulkSelection<number>());
    expect(result.current.selected).toEqual([]);
  });

  it("toggles ids in and out of the selection", () => {
    const { result } = renderHook(() => useBulkSelection<number>());

    act(() => result.current.toggle(1));
    expect(result.current.selected).toEqual([1]);

    act(() => result.current.toggle(2));
    expect(result.current.selected).toEqual([1, 2]);

    act(() => result.current.toggle(1));
    expect(result.current.selected).toEqual([2]);
  });

  it("clear() empties the selection", () => {
    const { result } = renderHook(() => useBulkSelection<number>());

    act(() => {
      result.current.toggle(1);
      result.current.toggle(2);
    });
    expect(result.current.selected).toHaveLength(2);

    act(() => result.current.clear());
    expect(result.current.selected).toEqual([]);
  });

  it("works for string ids too", () => {
    const { result } = renderHook(() => useBulkSelection<string>());
    act(() => result.current.toggle("a"));
    act(() => result.current.toggle("b"));
    expect(result.current.selected).toEqual(["a", "b"]);
  });
});
