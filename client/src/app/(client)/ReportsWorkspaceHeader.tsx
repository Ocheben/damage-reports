"use client";

import { Search } from "lucide-react";

export function ReportsWorkspaceHeader({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (next: string) => void;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">My damage reports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Submit and track your vehicle damage claims.
        </p>
      </div>
      <label className="relative block w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          className="input !pl-9"
          placeholder="Search by ref or vehicle…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </label>
    </header>
  );
}
