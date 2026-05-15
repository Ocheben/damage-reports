"use client";

import { LayoutGrid, Flag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Identity } from "@/lib/identity-shared";

/**
 * Client/Admin tab bar. Hidden when the active session isn't admin, including
 * during impersonation of a non-admin persona (Admin tab would just bounce).
 */
export function AppSwitcherBar({ identity }: { identity: Identity }) {
  const pathname = usePathname();
  if (identity.role !== "admin") return null;

  const isAdminPath = pathname?.startsWith("/admin");

  return (
    <div className="bg-slate-900 text-slate-100">
      <div className="mx-auto flex h-12 max-w-[1700px] items-center px-4">
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 transition ${
              !isAdminPath
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Client · Damage Reports
          </Link>
          <Link
            href="/admin/flags"
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 transition ${
              isAdminPath
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Flag className="h-4 w-4" />
            Admin · Feature Flags
          </Link>
        </nav>
      </div>
    </div>
  );
}
