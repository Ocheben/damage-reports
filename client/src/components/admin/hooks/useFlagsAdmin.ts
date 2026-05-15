"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { useToast } from "@/components/Ui/Toast";
import { useFlagsRefresh } from "@/lib/flags/hooks";

import type { AdminFlag } from "../types";

export function useFlagsAdmin(initialFlags: AdminFlag[], initialSelectedKey: string | null) {
  const router = useRouter();
  const refreshFlags = useFlagsRefresh();
  const toast = useToast();

  const [flags, setFlags] = useState<AdminFlag[]>(initialFlags);
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(initialSelectedKey);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return flags;
    return flags.filter((f) =>
      [f.key, f.name, f.description ?? ""].some((s) => s.toLowerCase().includes(q)),
    );
  }, [flags, search]);

  const selected = flags.find((f) => f.key === selectedKey) ?? filtered[0] ?? flags[0] ?? null;

  const toggleEnabled = useCallback(
    async (flag: AdminFlag, next: boolean) => {
      const previous = flag.enabled;
      setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, enabled: next } : f)));
      try {
        const res = await fetch(`/api/admin/flags/${flag.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: next }),
        });
        if (!res.ok) throw new Error(`Update failed (${res.status})`);
        const body = (await res.json()) as { data: AdminFlag };
        setFlags((prev) => prev.map((f) => (f.id === flag.id ? body.data : f)));
        await refreshFlags();
        toast.success(`${flag.name} ${next ? "enabled" : "disabled"}.`);
      } catch (err) {
        setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, enabled: previous } : f)));
        toast.error(
          err instanceof Error ? err.message : "Could not toggle flag.",
          "Toggle reverted",
        );
      }
    },
    [refreshFlags, toast],
  );

  const select = useCallback((key: string) => {
    setSelectedKey(key);
    const url = new URL(window.location.href);
    url.searchParams.set("selected", key);
    window.history.replaceState({}, "", url);
  }, []);

  const onFlagUpdated = useCallback(
    (next: AdminFlag) => {
      setFlags((prev) => prev.map((f) => (f.id === next.id ? next : f)));
      refreshFlags().catch(() => {
        toast.info("Could not refresh the public flag set right now.");
      });
    },
    [refreshFlags, toast],
  );

  const onFlagDeleted = useCallback(
    (key: string) => {
      setFlags((prev) => prev.filter((f) => f.key !== key));
      setSelectedKey((prev) => (prev === key ? null : prev));
      router.refresh();
    },
    [router],
  );

  return {
    flags,
    filtered,
    selected,
    search,
    setSearch,
    toggleEnabled,
    select,
    onFlagUpdated,
    onFlagDeleted,
  };
}
