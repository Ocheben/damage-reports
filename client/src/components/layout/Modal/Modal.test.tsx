import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "./Modal";

describe("<Modal>", () => {
  it("renders children inside a dialog with role=dialog", () => {
    render(
      <Modal onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toContainElement(screen.getByText("Body"));
  });

  it("calls onClose when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking the backdrop, not the panel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );

    await user.click(screen.getByText("Body"));
    expect(onClose).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog");
    await user.pointer({ keys: "[MouseLeft]", target: dialog });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll while open and restores it on unmount", () => {
    document.body.style.overflow = "auto";
    const { unmount } = render(
      <Modal onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("forwards labelledBy to aria-labelledby", () => {
    render(
      <Modal onClose={vi.fn()} labelledBy="dialog-title">
        <h2 id="dialog-title">Hello</h2>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "aria-labelledby",
      "dialog-title",
    );
  });
});
