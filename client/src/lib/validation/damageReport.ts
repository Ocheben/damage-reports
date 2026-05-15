import {
  DAMAGE_TYPES,
  SEVERITIES,
} from "@/components/Reports/NewReport/constants";

import { z } from "./schema";

/**
 * Mirrors server StoreDamageReport with two intentional deltas: friendlier
 * "X is required" messages, and an "incident_at not in future" refinement
 * that OpenAPI can't express.
 */
export const damageReportSchema = z.object({
  reporter_name: z
    .string()
    .min(1, "Reporter name is required.")
    .max(255),
  reporter_email: z
    .string()
    .min(1, "Reporter email is required.")
    .email("Reporter email must be a valid email.")
    .max(255),
  damage_type: z.enum(DAMAGE_TYPES),
  severity: z.enum(SEVERITIES),
  description: z
    .string()
    .min(1, "Description is required.")
    .min(10, "Description must be at least 10 characters.")
    .max(2000),
  incident_at: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) return true;
        const ts = Date.parse(value);
        return !Number.isNaN(ts) && ts <= Date.now();
      },
      "Date of incident cannot be in the future.",
    ),
  location: z.string().max(255).optional(),
});

export type DamageReportFormValues = z.infer<typeof damageReportSchema>;
