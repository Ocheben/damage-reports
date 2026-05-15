"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch, ApiError, FeatureDisabledError } from "@/lib/api";
import {
  damageReportSchema,
  type DamageReportFormValues,
} from "@/lib/validation/damageReport";
import { validate, validateField } from "@/lib/validation/schema";

import {
  SAVED_VEHICLES,
  type DamageType,
  type Photo,
  type Severity,
  type VehicleId,
} from "./constants";

export type ReportFormFields = DamageReportFormValues;
export type ReportFormErrors = Partial<Record<keyof ReportFormFields, string>>;

const INITIAL_FORM: ReportFormFields = {
  reporter_name: "",
  reporter_email: "",
  incident_at: "",
  location: "",
  damage_type: "dent",
  severity: "minor",
  description: "",
};

export function useReportSubmission(
  aiEnabled: boolean,
  onSuccess?: () => void,
) {
  const router = useRouter();

  const [vehicleId, setVehicleId] = useState<VehicleId>(SAVED_VEHICLES[0].id);
  const [form, setForm] = useState<ReportFormFields>(INITIAL_FORM);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [requestAi, setRequestAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ReportFormErrors>({});

  const update = <K extends keyof ReportFormFields>(
    key: K,
    value: ReportFormFields[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear field error on edit; re-validate on blur.
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const rest = { ...prev };
      delete rest[key];
      return rest;
    });
  };

  const touch = <K extends keyof ReportFormFields>(key: K) => {
    const next = { ...form };
    const error = validateField(damageReportSchema, key, next);
    setFieldErrors((prev) => {
      const copy = { ...prev };
      if (error) copy[key] = error;
      else delete copy[key];
      return copy;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const result = validate(damageReportSchema, form);
    if (!result.ok) {
      setFieldErrors(result.errors);
      setFormError("Please fix the highlighted fields.");
      return;
    }
    setFieldErrors({});

    setBusy(true);
    try {
      const vehicle = SAVED_VEHICLES.find((v) => v.id === vehicleId) ?? SAVED_VEHICLES[0];
      const body = {
        ...result.values,
        vehicle_registration: vehicle.registration,
        vehicle_make: vehicle.make,
        vehicle_model: vehicle.model,
        incident_at: result.values.incident_at || undefined,
        location: result.values.location || undefined,
        photos: photos.length ? photos : undefined,
        request_ai_analysis: requestAi && aiEnabled,
      };
      const created = await apiFetch<{ data: { id: number } }>("/api/v1/reports", {
        method: "POST",
        body: JSON.stringify(body),
      });
      onSuccess?.();
      router.push(`/?selected=${created.data.id}`);
      router.refresh();
    } catch (err) {
      const { formMessage, fieldMessages } = unpackError(err);
      if (fieldMessages) setFieldErrors((prev) => ({ ...prev, ...fieldMessages }));
      setFormError(formMessage);
    } finally {
      setBusy(false);
    }
  };

  return {
    form,
    update,
    touch,
    fieldErrors,
    vehicleId,
    setVehicleId,
    photos,
    setPhotos,
    requestAi,
    setRequestAi,
    busy,
    error: formError,
    submit,
  };
}

function unpackError(err: unknown): {
  formMessage: string;
  fieldMessages: ReportFormErrors | null;
} {
  if (err instanceof FeatureDisabledError) {
    return {
      formMessage: `The "${err.flag}" feature was just disabled. The form has updated — please retry.`,
      fieldMessages: null,
    };
  }
  if (err instanceof ApiError && err.status === 422) {
    const body = err.body as { errors?: Record<string, string[]> } | null;
    const errors = body?.errors ?? {};
    const fieldMessages: ReportFormErrors = {};
    for (const [key, messages] of Object.entries(errors)) {
      // Skip dot-notation server errors (e.g. "photos.0.url"); form is flat.
      if (key in INITIAL_FORM && messages.length > 0) {
        fieldMessages[key as keyof ReportFormFields] = messages[0];
      }
    }
    return {
      formMessage: Object.keys(fieldMessages).length
        ? "Please fix the highlighted fields."
        : Object.values(errors).flat().join(" • ") || "Please check the form.",
      fieldMessages: Object.keys(fieldMessages).length ? fieldMessages : null,
    };
  }
  return {
    formMessage: err instanceof Error ? err.message : "Submission failed.",
    fieldMessages: null,
  };
}

export type { DamageType, Severity };
