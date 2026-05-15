"use client";

import { CircleCheck, Flag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AdminStats } from "@/lib/admin-api";

import { ADMIN_NAV, type AdminNavItem } from "./constants/nav";

export function AdminSidebar({ stats }: { stats: AdminStats | null }) {
  const pathname = usePathname() ?? "";

  return (
    <aside className="flex min-h-full flex-1 flex-col border-r border-slate-200 bg-white">
      <div>
        <SidebarBrand />
        <SidebarNav pathname={pathname} />
      </div>

      <CacheStatusCard stats={stats} />
    </aside>
  );
}

function SidebarBrand() {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
      <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-600 text-white shadow-sm">
        <Flag className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-slate-900">Damage Reports Flags</span>
        <span className="block text-xs text-slate-500">Admin</span>
      </span>
    </div>
  );
}

function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav className="space-y-1 px-2 py-3 text-sm">
      {ADMIN_NAV.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          active={pathname.startsWith(item.matchPrefix)}
        />
      ))}
    </nav>
  );
}

function NavItem({ item, active }: { item: AdminNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`relative flex items-center gap-2 rounded-md px-3 py-2 transition ${active
        ? "bg-emerald-50 font-medium text-emerald-700"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
    >
      {active && (
        <span className="absolute -left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-emerald-600" />
      )}
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function CacheStatusCard({ stats }: { stats: AdminStats | null }) {
  return (
    <div className="m-3 mt-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cache</p>
      <p className="mt-1 text-sm font-medium text-slate-900">
        Redis · {stats?.cache.ttl_seconds ?? 900}s TTL
      </p>
      <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700">
        <CircleCheck className="h-3 w-3" />
        {formatHitRate(stats?.cache.hit_rate)}
      </p>
    </div>
  );
}

function formatHitRate(rate: number | null | undefined): string {
  if (rate == null) return "stats unavailable";
  return `${(rate * 100).toFixed(1)}% hit rate`;
}
