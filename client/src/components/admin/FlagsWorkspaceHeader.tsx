"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";

export function FlagsWorkspaceHeader({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (next: string) => void;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Feature Flags</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage rollout of features in the Car Damage Reports client.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            className="input !pl-9 sm:w-64"
            placeholder="Search flags…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>
        <Link href="/admin/flags/new" className="btn btn-primary">
          <Plus className="h-4 w-4" />
          New flag
        </Link>
      </div>
    </header>
  );
}
