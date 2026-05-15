"use client";

import { ConfirmDialog } from "@/components/Ui/ConfirmDialog";

import type { FlagFormState } from "./types";
import { FlagBasicsSection } from "./FlagBasicsSection";
import { FlagRulesSection } from "./FlagRulesSection";
import { useFlagForm, type FlagFormMode } from "./hooks/useFlagForm";

export function FlagForm({
  initial,
  mode,
}: {
  initial?: Partial<FlagFormState>;
  mode: FlagFormMode;
}) {
  const {
    form,
    update,
    touch,
    fieldErrors,
    updateRule,
    addRule,
    removeRule,
    save,
    requestDelete,
    confirmDelete,
    cancelDelete,
    pendingDelete,
    busy,
    error,
  } = useFlagForm({ initial, mode });

  return (
    <>
      <form className="space-y-6" onSubmit={save} noValidate>
        <FlagBasicsSection
          form={form}
          isUpdate={mode.kind === "update"}
          onChange={update}
          onBlur={touch}
          errors={fieldErrors}
        />

        <FlagRulesSection
          rules={form.rules}
          flagKey={form.key}
          onAdd={addRule}
          onUpdate={updateRule}
          onRemove={removeRule}
        />

        {error && <FormError message={error} />}

        <footer className="flex justify-between">
          {mode.kind === "update" ? (
            <button
              type="button"
              className="btn-danger btn"
              disabled={busy}
              onClick={requestDelete}
            >
              Delete flag
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save flag"}
          </button>
        </footer>
      </form>

      <ConfirmDialog
        open={pendingDelete}
        title={`Delete “${form.name || form.key}”?`}
        description="The flag is soft-deleted and can be recovered by an administrator. Active evaluations will fall back to the default value."
        confirmLabel="Delete flag"
        destructive
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="whitespace-pre-line rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {message}
    </div>
  );
}
