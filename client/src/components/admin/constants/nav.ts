import { Calendar, Flag, ScrollText } from "lucide-react";
import type { ComponentType } from "react";

type IconType = ComponentType<{ className?: string }>;

export type AdminNavItem = {
  href: string;
  label: string;
  icon: IconType;
  matchPrefix: string;
};

export const ADMIN_NAV: ReadonlyArray<AdminNavItem> = [
  { href: "/admin/flags", label: "Feature Flags", icon: Flag, matchPrefix: "/admin/flags" },
  { href: "/admin/schedules", label: "Schedules", icon: Calendar, matchPrefix: "/admin/schedules" },
  { href: "/admin/decisions", label: "Decision log", icon: ScrollText, matchPrefix: "/admin/decisions" },
];
