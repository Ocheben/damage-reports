import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FieldError, FormField, FormRow } from "./FormLayout";

describe("<FormField>", () => {
  it("renders the label and the child input", () => {
    render(
      <FormField label="Name">
        <input data-testid="input" />
      </FormField>,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByTestId("input")).toBeInTheDocument();
  });

  it("shows the hint when no error is set", () => {
    render(
      <FormField label="Name" hint="At most 80 characters">
        <input />
      </FormField>,
    );
    expect(screen.getByText("At most 80 characters")).toBeInTheDocument();
  });

  it("shows the error and hides the hint when both are present", () => {
    render(
      <FormField label="Name" hint="hint text" error="Required.">
        <input />
      </FormField>,
    );
    expect(screen.getByText("Required.")).toHaveAttribute("role", "alert");
    expect(screen.queryByText("hint text")).not.toBeInTheDocument();
  });
});

describe("<FieldError>", () => {
  it("renders message with role=alert for screen readers", () => {
    render(<FieldError message="Boom" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Boom");
  });
});

describe("<FormRow>", () => {
  it("renders children inside a grid container", () => {
    render(
      <FormRow>
        <span data-testid="left" />
        <span data-testid="right" />
      </FormRow>,
    );
    expect(screen.getByTestId("left")).toBeInTheDocument();
    expect(screen.getByTestId("right")).toBeInTheDocument();
  });
});
