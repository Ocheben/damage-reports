import { z } from "./schema";

/**
 * Tracks server FeatureFlagRequest with form-shape deltas (string dates,
 * non-null description) and a client-side starts/ends ordering check.
 */
export const flagFormSchema = z
  .object({
    key: z
      .string()
      .min(1, "Key is required.")
      .max(128)
      .regex(/^[a-z0-9][a-z0-9-]*$/, "Key must be lowercase alphanumeric with hyphens."),
    name: z.string().min(1, "Name is required.").max(255),
    description: z.string().max(1000).optional(),
    starts_at: z.string().optional(),
    ends_at: z.string().optional(),
  })
  .refine(
    (v) => {
      if (!v.starts_at || !v.ends_at) return true;
      return Date.parse(v.ends_at) > Date.parse(v.starts_at);
    },
    { message: "Ends at must be after Starts at.", path: ["ends_at"] },
  );

export type FlagFormSchemaValues = z.infer<typeof flagFormSchema>;
