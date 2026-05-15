import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "./ConfirmDialog";

function renderDialog(overrides: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = overrides.onConfirm ?? vi.fn();
  const onCancel = overrides.onCancel ?? vi.fn();
  render(
    <ConfirmDialog
      open
      title="Delete this flag?"
      description="The flag is soft-deleted and recoverable."
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onConfirm, onCancel };
}

describe("<ConfirmDialog>", () => {
  it("renders nothing when open is false", () => {
    render(
      <ConfirmDialog
        open={false}
        title="Hidden"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders title, description and both buttons when open", () => {
    renderDialog();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete this flag?")).toBeInTheDocument();
    expect(screen.getByText(/soft-deleted/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();
    await user.click(screen.getByRole("button", { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the cancel button is clicked", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog();
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel on Escape key", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog();
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("uses destructive styling and custom labels when provided", () => {
    renderDialog({
      destructive: true,
      confirmLabel: "Delete flag",
      cancelLabel: "Keep it",
    });
    const confirm = screen.getByRole("button", { name: /delete flag/i });
    expect(confirm).toHaveClass("btn-danger");
    expect(screen.getByRole("button", { name: /keep it/i })).toBeInTheDocument();
  });

  it("disables both buttons and shows the busy label while busy", () => {
    renderDialog({ busy: true });
    const confirm = screen.getByRole("button", { name: /working/i });
    const cancel = screen.getByRole("button", { name: /cancel/i });
    expect(confirm).toBeDisabled();
    expect(cancel).toBeDisabled();
  });
});
