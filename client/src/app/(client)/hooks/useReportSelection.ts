"use client";

import { useCallback, useState } from "react";

export function useReportSelection(initialId: number | null) {
  const [selectedId, setSelectedId] = useState<number | null>(initialId);

  const select = useCallback((id: number) => {
    setSelectedId(id);
    // Reflect selection in the URL for shareability without a nav.
    const url = new URL(window.location.href);
    url.searchParams.set("selected", String(id));
    window.history.replaceState({}, "", url);
  }, []);

  return { selectedId, select };
}
