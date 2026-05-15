import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FeatureFlagProvider } from "@/lib/flags/provider";
import type { FlagSet } from "@/lib/flags/types";

import { PhotoUploadField } from "./PhotoUploadField";

const ON: FlagSet = { "report-photos": { value: true, reason: "default" } };
const OFF: FlagSet = { "report-photos": { value: false, reason: "default" } };

function mount(ui: React.ReactNode, flags: FlagSet) {
  return render(<FeatureFlagProvider initialFlags={flags}>{ui}</FeatureFlagProvider>);
}

describe("<PhotoUploadField>", () => {
  it("renders nothing when report-photos flag is off", () => {
    mount(<PhotoUploadField value={[]} onChange={vi.fn()} />, OFF);
    expect(screen.queryByText(/drop photos/i)).not.toBeInTheDocument();
  });

  it("shows the dropzone and the Browse files button when the flag is on", () => {
    mount(<PhotoUploadField value={[]} onChange={vi.fn()} />, ON);
    expect(screen.getByText(/drop photos of the damage/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /browse files/i })).toBeInTheDocument();
  });

  it("commits a new photo via onChange when the user types a URL and clicks Add", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<PhotoUploadField value={[]} onChange={onChange} />, ON);

    await user.click(screen.getByRole("button", { name: /browse files/i }));
    const url = screen.getByPlaceholderText(/https/);
    await user.type(url, "https://example.com/photo.jpg");
    await user.click(screen.getByRole("button", { name: /add photo/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual([
      { url: "https://example.com/photo.jpg", caption: "" },
    ]);
  });

  it("disables the Add button until a URL is provided", async () => {
    const user = userEvent.setup();
    mount(<PhotoUploadField value={[]} onChange={vi.fn()} />, ON);

    await user.click(screen.getByRole("button", { name: /browse files/i }));
    const add = screen.getByRole("button", { name: /add photo/i });
    expect(add).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/https/), "https://x.com/p.jpg");
    expect(add).toBeEnabled();
  });

  it("renders the existing photo list with a remove button per item", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(
      <PhotoUploadField
        value={[
          { url: "https://a.com/1.jpg", caption: "Front" },
          { url: "https://a.com/2.jpg", caption: "" },
        ]}
        onChange={onChange}
      />,
      ON,
    );

    expect(screen.getByText("https://a.com/1.jpg")).toBeInTheDocument();
    expect(screen.getByText(/Front/)).toBeInTheDocument();

    const removes = screen.getAllByRole("button", { name: /remove/i });
    expect(removes).toHaveLength(2);

    await user.click(removes[0]);
    expect(onChange).toHaveBeenCalledWith([
      { url: "https://a.com/2.jpg", caption: "" },
    ]);
  });
});
