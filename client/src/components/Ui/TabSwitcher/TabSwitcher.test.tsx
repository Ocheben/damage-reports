import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TabSwitcher, type TabOption } from "./TabSwitcher";

type Tab = "all" | "open" | "closed";
const tabs: ReadonlyArray<TabOption<Tab>> = [
  { id: "all", label: "All (10)" },
  { id: "open", label: "Open (4)" },
  { id: "closed", label: "Closed (6)" },
];

describe("<TabSwitcher>", () => {
  it("renders one button per tab", () => {
    render(<TabSwitcher tabs={tabs} active="all" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "All (10)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open (4)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Closed (6)" })).toBeInTheDocument();
  });

  it("marks the active tab with the tab-active class", () => {
    render(<TabSwitcher tabs={tabs} active="open" onChange={vi.fn()} />);
    const open = screen.getByRole("button", { name: "Open (4)" });
    const all = screen.getByRole("button", { name: "All (10)" });
    expect(open.className).toMatch(/tab-active/);
    expect(all.className).not.toMatch(/tab-active/);
  });

  it("calls onChange with the tab id on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TabSwitcher tabs={tabs} active="all" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Closed (6)" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("closed");
  });
});
