import { describe, expect, it } from "vitest";

import { validate, validateField, z } from "./schema";

const loginSchema = z.object({
  email: z.email("Email must be a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  age: z
    .union([z.literal(""), z.coerce.number().min(18, "Age must be at least 18.").max(120)])
    .optional(),
});

describe("validate", () => {
  it("returns ok=true with values when every rule passes", () => {
    const result = validate(loginSchema, {
      email: "alice@example.com",
      password: "longenough",
      age: "30",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.values.email).toBe("alice@example.com");
  });

  it("flags invalid email", () => {
    const result = validate(loginSchema, {
      email: "not-an-email",
      password: "longenough",
      age: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toMatch(/valid email/i);
  });

  it("enforces min on string length and numeric value", () => {
    const result = validate(loginSchema, {
      email: "alice@example.com",
      password: "short",
      age: "12",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.password).toMatch(/at least 8/i);
      expect(result.errors.age).toMatch(/at least 18/i);
    }
  });

  it("supports refine() for cross-field rules", () => {
    const schema = z
      .object({ a: z.string(), b: z.string() })
      .refine((v) => v.a !== v.b, { message: "must differ", path: ["b"] });
    const result = validate(schema, { a: "same", b: "same" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.b).toBe("must differ");
  });
});

describe("validateField", () => {
  it("returns null when the field is valid", () => {
    expect(
      validateField(loginSchema, "email", {
        email: "alice@example.com",
        password: "",
        age: "",
      }),
    ).toBeNull();
  });

  it("returns the rule's error string when the field fails", () => {
    const error = validateField(loginSchema, "email", {
      email: "not-an-email",
      password: "",
      age: "",
    });
    expect(error).toMatch(/valid email/i);
  });
});
