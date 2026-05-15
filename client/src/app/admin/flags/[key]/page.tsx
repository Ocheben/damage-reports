import Link from "next/link";
import { notFound } from "next/navigation";

import { FlagForm } from "@/components/admin/FlagForm";
import type { RuleDefinition } from "@/components/admin/types";
import { adminFetch } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

type AdminFlag = {
  id: number;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  default_value: boolean;
  rules: RuleDefinition[] | null;
  starts_at: string | null;
  ends_at: string | null;
};

function dateToInput(iso: string | null): string {
  if (!iso) return "";
  // datetime-local wants "YYYY-MM-DDTHH:MM".
  return iso.slice(0, 16);
}

export default async function EditFlagPage({
  params,
}: {
  params: { key: string };
}) {
  let flag: AdminFlag;
  try {
    const list = await adminFetch<{ data: AdminFlag[] }>("/api/admin/flags");
    const found = list.data.find((f) => f.key === params.key);
    if (!found) notFound();
    flag = found;
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/flags" className="text-xs text-slate-500 hover:underline">
          ← back to flags
        </Link>
        <h1 className="text-2xl font-semibold">
          Edit flag <span className="font-mono text-emerald-700">{flag.key}</span>
        </h1>
      </header>
      <FlagForm
        mode={{ kind: "update", id: flag.id }}
        initial={{
          key: flag.key,
          name: flag.name,
          description: flag.description ?? "",
          enabled: flag.enabled,
          default_value: flag.default_value,
          starts_at: dateToInput(flag.starts_at),
          ends_at: dateToInput(flag.ends_at),
          rules: flag.rules ?? [],
        }}
      />
    </div>
  );
}
