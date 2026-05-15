import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/Ui/Toast";
import { FeatureFlagProvider } from "@/lib/flags/provider";
import type { FlagSet } from "@/lib/flags/types";

import { ExportPdfButton } from "./ExportPdfButton";

const ON: FlagSet = { "export-pdf": { value: true, reason: "default" } };
const OFF: FlagSet = { "export-pdf": { value: false, reason: "default" } };

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
    if (url.endsWith("/export-pdf")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            export_url: "https://example.com/exports/42.pdf",
            generated_at: "2026-05-15T12:00:00Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("<ExportPdfButton>", () => {
  it("renders nothing when export-pdf flag is off", () => {
    mount(<ExportPdfButton reportId={42} />, OFF);
    expect(screen.queryByRole("button", { name: /export pdf/i })).not.toBeInTheDocument();
  });

  it("renders the button when the flag is on", () => {
    mount(<ExportPdfButton reportId={42} />, ON);
    expect(screen.getByRole("button", { name: /export pdf/i })).toBeInTheDocument();
  });

  it("calls the export endpoint with the right report id when clicked", async () => {
    const user = userEvent.setup();
    mount(<ExportPdfButton reportId={42} />, ON);

    await user.click(screen.getByRole("button", { name: /export pdf/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith("/api/v1/reports/42/export-pdf"),
      );
      expect(call).toBeDefined();
    });
  });
});
