import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider, useToast } from "./Toast";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function Harness({
  onMount,
}: {
  onMount: (api: ReturnType<typeof useToast>) => void;
}) {
  const api = useToast();
  onMount(api);
  return null;
}

describe("<ToastProvider>", () => {
  it("renders a success toast when push is called", () => {
    let api: ReturnType<typeof useToast> | null = null;

    render(
      <ToastProvider>
        <Harness onMount={(a) => (api = a)} />
      </ToastProvider>,
    );

    act(() => {
      api!.success("Saved");
    });

    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("auto-dismisses after the timeout elapses", () => {
    let api: ReturnType<typeof useToast> | null = null;

    render(
      <ToastProvider>
        <Harness onMount={(a) => (api = a)} />
      </ToastProvider>,
    );

    act(() => {
      api!.success("Saved");
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5_500);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders error toasts with role=alert and a title", () => {
    let api: ReturnType<typeof useToast> | null = null;

    render(
      <ToastProvider>
        <Harness onMount={(a) => (api = a)} />
      </ToastProvider>,
    );

    act(() => {
      api!.error("Boom", "Failure");
    });

    const toast = screen.getByRole("alert");
    expect(toast).toHaveTextContent("Failure");
    expect(toast).toHaveTextContent("Boom");
  });

  it("throws if useToast is used outside the provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(<Harness onMount={() => {}} />),
    ).toThrow(/outside.*ToastProvider/);
    consoleSpy.mockRestore();
  });
});
