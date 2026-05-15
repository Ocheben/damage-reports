import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/Ui/Toast";
import { FeatureFlagProvider } from "@/lib/flags/provider";
import type { FlagSet } from "@/lib/flags/types";

import { BulkActionsBar } from "./BulkActionsBar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const ON: FlagSet = { "bulk-actions": { value: true, reason: "default" } };
const OFF: FlagSet = { "bulk-actions": { value: false, reason: "default" } };

let currentFlags: FlagSet = {};

function mount(ui: React.ReactNode, flags: FlagSet) {
  currentFlags = flags;
  return render(
    <ToastProvider>
      <FeatureFlagProvider initialFlags={flags}>{ui}</FeatureFlagProvider>
    </ToastProvider>,
  );
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  currentFlags = {};
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/v1/flags/evaluate")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ flags: currentFlags, evaluated_at: new Date().toISOString() }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    }
    if (url.includes("/api/v1/reports/bulk-delete")) {
      return Promise.resolve(
        new Response(JSON.stringify({ deleted: 1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("<BulkActionsBar>", () => {
  it("renders nothing when bulk-actions flag is off", () => {
    mount(<BulkActionsBar selected={[1, 2]} onCleared={vi.fn()} />, OFF);
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
  });

  it("renders nothing when no rows are selected", () => {
    mount(<BulkActionsBar selected={[]} onCleared={vi.fn()} />, ON);
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
  });

  it("shows the count and a delete button when selection is non-empty", () => {
    mount(<BulkActionsBar selected={[1, 2, 3]} onCleared={vi.fn()} />, ON);
    expect(screen.getByText("3 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete selected/i })).toBeInTheDocument();
  });

  it("calls bulk-delete and onCleared when the button is clicked", async () => {
    const user = userEvent.setup();
    const onCleared = vi.fn();
    mount(<BulkActionsBar selected={[7, 8]} onCleared={onCleared} />, ON);

    await user.click(screen.getByRole("button", { name: /delete selected/i }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith("/api/v1/reports/bulk-delete"),
      );
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    const call = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith("/api/v1/reports/bulk-delete"),
    );
    const body = JSON.parse((call![1] as RequestInit).body as string);
    expect(body.ids).toEqual([7, 8]);

    await waitFor(() => expect(onCleared).toHaveBeenCalled());
  });
});
