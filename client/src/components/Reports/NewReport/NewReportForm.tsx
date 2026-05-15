"use client";

import { PhotoUploadField } from "@/components/Flagged/PhotoUploadField";
import { FormField, FormRow } from "@/components/Ui/FormLayout";
import { useFlag } from "@/lib/flags/hooks";
import { FLAG_KEYS } from "@/lib/flags/types";

import {
  DAMAGE_TYPES,
  SAVED_VEHICLES,
  SEVERITIES,
  type DamageType,
  type Severity,
  type VehicleId,
} from "./constants";
import { ReportFormHeader } from "./ReportFormHeader";
import { useReportSubmission } from "./hooks";

export function NewReportForm({ onClose }: { onClose: () => void }) {
  const showAi = useFlag(FLAG_KEYS.aiDamageAnalysis);
  const {
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
    error,
    submit,
  } = useReportSubmission(showAi, onClose);

  return (
    <div className="card p-6 sm:p-8">
      <ReportFormHeader onClose={onClose} />

      <form onSubmit={submit} noValidate className="space-y-5">
        <FormRow>
          <FormField label="Reporter name" error={fieldErrors.reporter_name}>
            <input
              className="input"
              aria-invalid={Boolean(fieldErrors.reporter_name)}
              value={form.reporter_name}
              onChange={(e) => update("reporter_name", e.target.value)}
              onBlur={() => touch("reporter_name")}
            />
          </FormField>
          <FormField label="Reporter email" error={fieldErrors.reporter_email}>
            <input
              className="input"
              type="email"
              aria-invalid={Boolean(fieldErrors.reporter_email)}
              value={form.reporter_email}
              onChange={(e) => update("reporter_email", e.target.value)}
              onBlur={() => touch("reporter_email")}
            />
          </FormField>
        </FormRow>

        <FormRow>
          <FormField label="Vehicle">
            <select
              className="input pr-8"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value as VehicleId)}
            >
              {SAVED_VEHICLES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Date of incident" error={fieldErrors.incident_at}>
            <input
              className="input"
              type="date"
              aria-invalid={Boolean(fieldErrors.incident_at)}
              value={form.incident_at}
              onChange={(e) => update("incident_at", e.target.value)}
              onBlur={() => touch("incident_at")}
            />
          </FormField>
        </FormRow>

        <FormRow>
          <FormField label="Damage type" error={fieldErrors.damage_type}>
            <select
              className="input pr-8"
              value={form.damage_type}
              onChange={(e) => update("damage_type", e.target.value as DamageType)}
            >
              {DAMAGE_TYPES.map((d) => (
                <option key={d} value={d}>
                  {capitalize(d)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Severity" error={fieldErrors.severity}>
            <select
              className="input pr-8"
              value={form.severity}
              onChange={(e) => update("severity", e.target.value as Severity)}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {capitalize(s)}
                </option>
              ))}
            </select>
          </FormField>
        </FormRow>

        <FormField
          label="Location"
          error={fieldErrors.location}
          hint="Optional — where the incident took place."
        >
          <input
            className="input"
            placeholder="e.g. Amsterdam, Zuidas"
            aria-invalid={Boolean(fieldErrors.location)}
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            onBlur={() => touch("location")}
          />
        </FormField>

        <FormField
          label="Describe what happened"
          error={fieldErrors.description}
          hint="At least 10 characters."
        >
          <textarea
            className="input"
            rows={3}
            placeholder="Briefly describe the incident and damage…"
            aria-invalid={Boolean(fieldErrors.description)}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            onBlur={() => touch("description")}
          />
        </FormField>

        <PhotoUploadField value={photos} onChange={setPhotos} />

        {showAi && (
          <AiAnalysisToggle checked={requestAi} onChange={setRequestAi} />
        )}

        {error && <FormError message={error} />}

        <FormActions busy={busy} onClose={onClose} />
      </form>
    </div>
  );
}

function AiAnalysisToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
      Request AI damage analysis (beta)
    </label>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}

function FormActions({ busy, onClose }: { busy: boolean; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" className="btn" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Submitting…" : "Submit report"}
      </button>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
