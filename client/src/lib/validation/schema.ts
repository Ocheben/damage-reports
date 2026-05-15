import { z, type ZodType } from "zod/v4";

/**
 * Wraps Zod with a stable { ok, errors } shape so call sites don't pin to
 * the engine. Schemas come from Kubb (kubb.config.ts), so client and server
 * FormRequest rules share one source of truth.
 */

export type ValidationResult<T> =
  | { ok: true; values: T }
  | { ok: false; errors: Partial<Record<keyof T, string>> };

function flattenErrors<T>(error: z.ZodError): Partial<Record<keyof T, string>> {
  const out: Partial<Record<keyof T, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" || typeof key === "number") {
      const k = key as keyof T;
      // First error per field wins; UI shows one message at a time.
      if (out[k] === undefined) out[k] = issue.message;
    }
  }
  return out;
}

export function validate<T>(schema: ZodType<T>, values: unknown): ValidationResult<T> {
  const result = schema.safeParse(values);
  if (result.success) {
    return { ok: true, values: result.data };
  }
  return { ok: false, errors: flattenErrors<T>(result.error) };
}

/** Single-field validation, used on blur. */
export function validateField<T>(
  schema: ZodType<T>,
  key: keyof T,
  values: T,
): string | null {
  const fieldSchema = pickField(schema, key as string);
  if (!fieldSchema) return null;
  const result = fieldSchema.safeParse((values as Record<string, unknown>)[key as string]);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Invalid value.";
}

/** Walks ZodObject's runtime `shape`; null if non-object or key missing. */
function pickField(schema: ZodType<unknown>, key: string): ZodType<unknown> | null {
  const maybeObject = schema as unknown as { shape?: Record<string, ZodType<unknown>> };
  if (maybeObject.shape && typeof maybeObject.shape === "object") {
    return maybeObject.shape[key] ?? null;
  }
  return null;
}

// Re-exported for ad-hoc form-only schemas (e.g. the flag form).
export { z };
