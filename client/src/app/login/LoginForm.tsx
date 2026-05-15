"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Login form + demo-persona picker. The picker is the primary path for
 * testers; manual entry is left enabled.
 */

type Persona = {
  email: string;
  password: string;
  name: string;
  role: string;
  country: string;
  blurb: string;
};

const DEMO_PERSONAS: Persona[] = [
  {
    email: "roy@example.com",
    password: "password",
    name: "Roy",
    role: "admin",
    country: "NL",
    blurb: "Admin — only persona that can reach the /admin panel.",
  },
  {
    email: "mona@example.com",
    password: "password",
    name: "Mona",
    role: "staff",
    country: "NL",
    blurb: "Staff — passes the bulk-actions attribute rule.",
  },
  {
    email: "qa.alice@example.com",
    password: "password",
    name: "QA Alice",
    role: "qa",
    country: "NL",
    blurb: "Always-on for the ai-damage-analysis flag (user_targeting).",
  },
  {
    email: "qa.bob@example.com",
    password: "password",
    name: "QA Bob",
    role: "qa",
    country: "NL",
    blurb: "Same QA targeting as Alice.",
  },
  {
    email: "alice@example.com",
    password: "password",
    name: "Alice",
    role: "customer",
    country: "NL",
    blurb: "Plain customer — defaults everywhere.",
  },
  {
    email: "bob@example.com",
    password: "password",
    name: "Bob",
    role: "customer",
    country: "US",
    blurb: "Customer with country=US (for future country rules).",
  },
];

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(creds: { email: string; password: string }) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      if (res.status === 422) {
        setError("Invalid email or password.");
        return;
      }
      if (res.status === 429) {
        setError("Too many attempts — wait a minute and try again.");
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Try again.");
        return;
      }
      router.push(next);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          submit({ email, password });
        }}
      >
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-60"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-60"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <DemoCredentialsCard onPick={submit} disabled={pending} />
    </div>
  );
}

function DemoCredentialsCard({
  onPick,
  disabled,
}: {
  onPick: (creds: { email: string; password: string }) => void;
  disabled: boolean;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <ShieldCheck className="h-4 w-4" /> Demo personas
      </header>
      <ul className="space-y-1.5">
        {DEMO_PERSONAS.map((p) => {
          const isAdmin = p.role === "admin";
          return (
            <li key={p.email}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick({ email: p.email, password: p.password })}
                className={`flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition disabled:opacity-60 ${
                  isAdmin
                    ? "border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    {p.name}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        isAdmin
                          ? "bg-emerald-200 text-emerald-900"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {p.role}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {p.email} · pwd: {p.password}
                  </span>
                  <span className="block text-xs text-slate-500">{p.blurb}</span>
                </span>
                <span className="shrink-0 text-xs font-medium text-slate-600">
                  Use →
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] text-slate-500">
        These credentials are for the demo only. The login endpoint is rate-limited (10/min).
      </p>
    </section>
  );
}
