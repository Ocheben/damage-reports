"use client";

import { Check, LogOut, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import type { Identity } from "@/lib/identity-shared";

import { useClickOutside } from "@/components/layout/hooks/useClickOutside";
import { useFlagsRefresh } from "@/lib/flags/hooks";

type Persona = {
  id: number;
  name: string;
  email: string;
  role: string;
  country: string;
};

/**
 * Top-right user menu. Modes: non-admin (logout only), admin not impersonating
 * (personas + logout), admin while impersonating (stop + logout). Persona
 * actions call BFF handlers that swap cookies, then router.refresh() re-runs
 * SSR with the new identity. `variant` styles the trigger for the bar/header.
 */
export function AvatarDropdown({
  identity,
  adminIdentity,
  variant = "dark",
}: {
  identity: Identity;
  adminIdentity: Identity | null;
  variant?: "dark" | "light";
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const containerRef = useClickOutside<HTMLDivElement>(open, close);

  const router = useRouter();
  const refreshFlags = useFlagsRefresh();
  const [pending, startTransition] = useTransition();

  const isImpersonating = adminIdentity !== null;
  const showPersonas = identity.role === "admin" && !isImpersonating;
  const personas = usePersonas(showPersonas && open);

  function impersonate(email: string) {
    startTransition(async () => {
      const res = await fetch("/api/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return;
      close();
      // Refetch flags client-side, then refresh SSR for chrome.
      await refreshFlags();
      router.refresh();
    });
  }

  function stopImpersonating() {
    startTransition(async () => {
      const res = await fetch("/api/identity", { method: "DELETE" });
      if (!res.ok) return;
      close();
      await refreshFlags();
      router.refresh();
    });
  }

  function logout() {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    });
  }

  const initials = makeInitials(identity.name);

  const triggerClasses =
    variant === "dark"
      ? "flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-sm text-slate-200 transition hover:bg-slate-800"
      : "flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-sm text-slate-700 transition hover:bg-slate-100";
  const initialsClasses =
    variant === "dark"
      ? "flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white"
      : "flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={triggerClasses}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={initialsClasses}>{initials}</span>
        {isImpersonating && (
          <span className="hidden rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 sm:inline">
            impersonating
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 shadow-lg"
        >
          <CurrentUserHeader identity={identity} adminIdentity={adminIdentity} />

          {isImpersonating && adminIdentity && (
            <button
              type="button"
              disabled={pending}
              onClick={stopImpersonating}
              className="flex w-full items-center gap-2 border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-slate-50 disabled:opacity-60"
            >
              <UserCog className="h-4 w-4 text-amber-600" />
              <span>
                Stop impersonating
                <span className="block text-xs text-slate-500">
                  Back to {adminIdentity.name}
                </span>
              </span>
            </button>
          )}

          {showPersonas && (
            <PersonaList
              personas={personas}
              activeEmail={identity.userKey}
              pending={pending}
              onPick={impersonate}
            />
          )}

          <button
            type="button"
            disabled={pending}
            onClick={logout}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function CurrentUserHeader({
  identity,
  adminIdentity,
}: {
  identity: Identity;
  adminIdentity: Identity | null;
}) {
  return (
    <div className="border-b border-slate-100 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Acting as
      </p>
      <p className="text-sm font-medium text-slate-900">{identity.name}</p>
      <p className="text-xs text-slate-500">
        {identity.userKey ?? "anonymous"} · role: {identity.role}
      </p>
      {adminIdentity && (
        <p className="mt-1 text-[11px] text-amber-700">
          Original session: {adminIdentity.name} ({adminIdentity.userKey})
        </p>
      )}
    </div>
  );
}

function PersonaList({
  personas,
  activeEmail,
  pending,
  onPick,
}: {
  personas: Persona[] | null;
  activeEmail: string | null;
  pending: boolean;
  onPick: (email: string) => void;
}) {
  return (
    <div className="border-b border-slate-100">
      <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Impersonate
      </p>
      <ul className="max-h-72 overflow-y-auto py-1">
        {personas === null && (
          <li className="px-4 py-3 text-xs text-slate-500">Loading personas…</li>
        )}
        {personas?.length === 0 && (
          <li className="px-4 py-3 text-xs text-slate-500">No personas available.</li>
        )}
        {personas?.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              disabled={pending || p.email === activeEmail}
              onClick={() => onPick(p.email)}
              className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <span>
                <span className="font-medium">{p.name}</span>
                <span className="block text-xs text-slate-500">
                  role: {p.role} · country: {p.country} · {p.email}
                </span>
              </span>
              {p.email === activeEmail && (
                <Check className="h-4 w-4 text-emerald-600" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function usePersonas(active: boolean): Persona[] | null {
  const [personas, setPersonas] = useState<Persona[] | null>(null);

  useEffect(() => {
    if (!active || personas !== null) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/personas");
        const body = (await res.json()) as { data: Persona[] };
        if (!cancelled) setPersonas(body.data);
      } catch {
        if (!cancelled) setPersonas([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, personas]);

  return personas;
}

function makeInitials(name: string): string {
  if (!name) return "?";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
