"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/Ui/Toast";
import { useFlagsRefresh } from "@/lib/flags/hooks";
import { flagFormSchema } from "@/lib/validation/flagForm";
import { validate, validateField } from "@/lib/validation/schema";

import { EMPTY_FLAG, RULE_TEMPLATES, type FlagFormState, type RuleDefinition } from "../types";
import { formatValidationError } from "../utils/validation";

export type FlagFormMode = { kind: "create" } | { kind: "update"; id: number };

type FieldErrors = Partial<Record<keyof FlagFormState, string>>;

export function useFlagForm({
  initial,
  mode,
}: {
  initial?: Partial<FlagFormState>;
  mode: FlagFormMode;
}) {
  const router = useRouter();
  const refreshFlags = useFlagsRefresh();
  const toast = useToast();

  const [form, setForm] = useState<FlagFormState>({ ...EMPTY_FLAG, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  const update = <K extends keyof FlagFormState>(key: K, value: FlagFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const rest = { ...prev };
      delete rest[key];
      return rest;
    });
  };

  const touch = <K extends keyof FlagFormState>(key: K) => {
    const fieldError = validateField(flagFormSchema, key as never, form as never);
    setFieldErrors((prev) => {
      const copy = { ...prev };
      if (fieldError) copy[key] = fieldError;
      else delete copy[key];
      return copy;
    });
  };

  const updateRule = (idx: number, next: RuleDefinition) =>
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.map((r, i) => (i === idx ? next : r)),
    }));

  const addRule = (type: RuleDefinition["type"]) =>
    setForm((prev) => ({
      ...prev,
      rules: [...prev.rules, RULE_TEMPLATES[type](prev.key)],
    }));

  const removeRule = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== idx),
    }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = validate(flagFormSchema, form);
    if (!result.ok) {
      setFieldErrors(result.errors);
      setError("Please fix the highlighted fields.");
      return;
    }
    setFieldErrors({});

    setBusy(true);
    try {
      const payload = {
        key: form.key,
        name: form.name,
        description: form.description || null,
        enabled: form.enabled,
        default_value: form.default_value,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        rules: form.rules,
      };
      const url = mode.kind === "create" ? "/api/admin/flags" : `/api/admin/flags/${mode.id}`;
      const res = await fetch(url, {
        method: mode.kind === "create" ? "POST" : "PATCH",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(formatValidationError(body) ?? "Save failed.");
      }
      await refreshFlags();
      toast.success(`Flag “${form.name}” saved.`);
      router.push("/admin/flags");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed.";
      setError(message);
      toast.error(message, "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const requestDelete = () => setPendingDelete(true);
  const cancelDelete = () => setPendingDelete(false);

  const confirmDelete = async () => {
    if (mode.kind !== "update") return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/flags/${mode.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
      await refreshFlags();
      toast.success(`Flag “${form.name}” deleted.`);
      router.push("/admin/flags");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed.";
      setError(message);
      toast.error(message, "Delete failed");
    } finally {
      setBusy(false);
      setPendingDelete(false);
    }
  };

  return {
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
  };
}
