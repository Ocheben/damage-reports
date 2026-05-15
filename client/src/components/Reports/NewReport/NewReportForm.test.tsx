import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/Ui/Toast";
import { FeatureFlagProvider } from "@/lib/flags/provider";

import { NewReportForm } from "./NewReportForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const fetchMock = vi.fn();

// Default: SWR poll returns the seeded flag set; reports POST returns 201.
function defaultFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === "string" ? input : input.toString();
  if (url.includes("/api/v1/flags/evaluate")) {
    return Promise.resolve(
      new Response(JSON.stringify({ flags: {}, evaluated_at: new Date().toISOString() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }
  if (url.includes("/api/v1/reports")) {
    return Promise.resolve(
      new Response(JSON.stringify({ data: { id: 42 } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }
  return Promise.reject(new Error(`Unexpected fetch: ${url}`));
}

function mount(ui: React.ReactNode) {
  return render(
    <ToastProvider>
      <FeatureFlagProvider initialFlags={{}}>{ui}</FeatureFlagProvider>
    </ToastProvider>,
  );
}

beforeEach(() => {
  fetchMock.mockImplementation(defaultFetch);
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("<NewReportForm>", () => {
  it("shows field-level errors when submitted empty", async () => {
    const user = userEvent.setup();
    mount(<NewReportForm onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /submit report/i }));

    expect(
      await screen.findByText(/reporter name is required/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/reporter email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/description is required/i)).toBeInTheDocument();

    const reportCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/api/v1/reports"),
    );
    expect(reportCalls).toHaveLength(0);
  });

  it("clears a field error once the user starts typing", async () => {
    const user = userEvent.setup();
    mount(<NewReportForm onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /submit report/i }));
    expect(
      await screen.findByText(/reporter name is required/i),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/reporter name/i), "Alice");

    expect(
      screen.queryByText(/reporter name is required/i),
    ).not.toBeInTheDocument();
  });

  it("rejects a future incident date on blur", async () => {
    mount(<NewReportForm onClose={vi.fn()} />);

    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const date = screen.getByLabelText(/date of incident/i) as HTMLInputElement;
    fireEvent.change(date, { target: { value: future } });
    fireEvent.blur(date);

    await waitFor(() => {
      expect(screen.getByText(/cannot be in the future/i)).toBeInTheDocument();
    });
  });

  it("posts to /api/v1/reports when the payload is valid", async () => {
    const user = userEvent.setup();
    mount(<NewReportForm onClose={vi.fn()} />);

    await user.type(screen.getByLabelText(/reporter name/i), "Alice");
    await user.type(
      screen.getByLabelText(/reporter email/i),
      "alice@example.com",
    );
    await user.type(
      screen.getByLabelText(/describe what happened/i),
      "There is a small dent on the rear bumper.",
    );

    await user.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith("/api/v1/reports"),
      );
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    const reportCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith("/api/v1/reports"),
    );
    expect(reportCall).toBeDefined();
    const body = JSON.parse((reportCall![1] as RequestInit).body as string);
    expect(body.reporter_email).toBe("alice@example.com");
    expect(body.description).toMatch(/small dent/);
  });
});
