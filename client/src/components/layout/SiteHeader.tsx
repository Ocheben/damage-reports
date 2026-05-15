"use client";

import { Car, MessageSquare } from "lucide-react";
import Link from "next/link";

import { AvatarDropdown } from "@/components/layout/AvatarDropdown";
import { NewReportLauncher } from "@/components/layout/NewReportLauncher";
import type { Identity } from "@/lib/identity-shared";

export function SiteHeader({
  identity,
  adminIdentity,
}: {
  identity: Identity;
  adminIdentity: Identity | null;
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-[73px] max-w-[1700px] items-center justify-between px-8">
        <Brand />
        <HeaderActions identity={identity} adminIdentity={adminIdentity} />
      </div>
    </header>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-600 text-white shadow-sm">
        <Car className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-base font-semibold text-slate-900">Damage Reports</span>
        <span className="block text-xs text-slate-500">Damage report management</span>
      </span>
    </Link>
  );
}

function HeaderActions({
  identity,
  adminIdentity,
}: {
  identity: Identity;
  adminIdentity: Identity | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" className="btn">
        <MessageSquare className="h-4 w-4" />
        Chat with us
      </button>
      <NewReportLauncher />
      <AvatarDropdown identity={identity} adminIdentity={adminIdentity} variant="light" />
    </div>
  );
}
