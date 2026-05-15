"use client";

import { X } from "lucide-react";

export function ReportFormHeader({ onClose }: { onClose: () => void }) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 id="new-report-title" className="text-lg font-semibold text-slate-900">
          Submit a damage report
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Tell us what happened. We&rsquo;ll get a repair quote in minutes.
        </p>
      </div>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="-mr-1 -mt-1 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
    </header>
  );
}
