"use client";

import { useFlagContext } from "./provider";
import type { FlagDecision, FlagKey } from "./types";

export function useFlag(key: FlagKey | string): boolean {
  return useFlagContext().isEnabled(key);
}

export function useFlagDecision(key: FlagKey | string): FlagDecision {
  return useFlagContext().decision(key);
}

export function useFlagsRefresh(): () => Promise<void> {
  return useFlagContext().forceRefresh;
}
