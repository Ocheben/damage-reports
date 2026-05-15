import Link from "next/link";

import { FlagForm } from "@/components/admin/FlagForm";

export const dynamic = "force-dynamic";

export default function NewFlagPage() {
  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/flags" className="text-xs text-slate-500 hover:underline">
          ← back to flags
        </Link>
        <h1 className="text-2xl font-semibold">New feature flag</h1>
      </header>
      <FlagForm mode={{ kind: "create" }} />
    </div>
  );
}
