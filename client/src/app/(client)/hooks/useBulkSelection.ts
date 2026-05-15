"use client";

import { useCallback, useState } from "react";

export function useBulkSelection<T>() {
  const [selected, setSelected] = useState<T[]>([]);

  const toggle = useCallback((id: T) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const clear = useCallback(() => setSelected([]), []);

  return { selected, toggle, clear };
}
