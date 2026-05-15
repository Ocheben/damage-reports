"use client";

import { FieldError } from "@/components/Ui/FormLayout";

import type { FlagFormState } from "./types";

type FieldErrors = Partial<Record<keyof FlagFormState, string>>;

export function FlagBasicsSection({
  form,
  isUpdate,
  onChange,
  onBlur,
  errors,
}: {
  form: FlagFormState;
  isUpdate: boolean;
  onChange: <K extends keyof FlagFormState>(key: K, value: FlagFormState[K]) => void;
  onBlur?: <K extends keyof FlagFormState>(key: K) => void;
  errors?: FieldErrors;
}) {
  const fieldError = (k: keyof FlagFormState) => errors?.[k];

  return (
    <section className="card space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Key</span>
          <input
            className="input font-mono"
            value={form.key}
            onChange={(e) => onChange("key", e.target.value)}
            onBlur={() => onBlur?.("key")}
            placeholder="ai-damage-analysis"
            aria-invalid={Boolean(fieldError("key"))}
            disabled={isUpdate}
          />
          {fieldError("key") && <FieldError message={fieldError("key")!} />}
        </label>
        <label className="block">
          <span className="label">Name</span>
          <input
            className="input"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            onBlur={() => onBlur?.("name")}
            aria-invalid={Boolean(fieldError("name"))}
          />
          {fieldError("name") && <FieldError message={fieldError("name")!} />}
        </label>
      </div>

      <label className="block">
        <span className="label">Description</span>
        <textarea
          className="input"
          rows={2}
          value={form.description}
          onChange={(e) => onChange("description", e.target.value)}
          onBlur={() => onBlur?.("description")}
          aria-invalid={Boolean(fieldError("description"))}
        />
        {fieldError("description") && <FieldError message={fieldError("description")!} />}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <Checkbox
          checked={form.enabled}
          onChange={(next) => onChange("enabled", next)}
          label="Enabled (master switch)"
        />
        <Checkbox
          checked={form.default_value}
          onChange={(next) => onChange("default_value", next)}
          label="Default value (when no rule matches)"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Starts at (optional)</span>
          <input
            className="input"
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => onChange("starts_at", e.target.value)}
            onBlur={() => onBlur?.("starts_at")}
            aria-invalid={Boolean(fieldError("starts_at"))}
          />
          {fieldError("starts_at") && <FieldError message={fieldError("starts_at")!} />}
        </label>
        <label className="block">
          <span className="label">Ends at (optional)</span>
          <input
            className="input"
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => onChange("ends_at", e.target.value)}
            onBlur={() => onBlur?.("ends_at")}
            aria-invalid={Boolean(fieldError("ends_at"))}
          />
          {fieldError("ends_at") && <FieldError message={fieldError("ends_at")!} />}
        </label>
      </div>
    </section>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      {label}
    </label>
  );
}
