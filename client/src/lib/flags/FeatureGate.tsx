"use client";

import { useFlag } from "./hooks";
import type { FlagKey } from "./types";

export function FeatureGate({
  flag,
  invert = false,
  fallback = null,
  children,
}: {
  flag: FlagKey | string;
  invert?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const enabled = useFlag(flag);
  const visible = invert ? !enabled : enabled;
  return <>{visible ? children : fallback}</>;
}
