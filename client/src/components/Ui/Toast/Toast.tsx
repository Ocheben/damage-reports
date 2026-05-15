"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/** Tiny in-tree toast system; no portals or extra deps. */

export type ToastKind = "success" | "error" | "info";
export type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
  /** Optional title rendered above the message. */
  title?: string;
};

type ToastContextValue = {
  push: (toast: Omit<Toast, "id">) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast used outside <ToastProvider>");
  return ctx;
}

const AUTO_DISMISS_MS = 5_000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, ...toast }]);
    window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
  }, [dismiss]);

  const api = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (message, title) => push({ kind: "success", message, title }),
      error: (message, title) => push({ kind: "error", message, title }),
      info: (message, title) => push({ kind: "info", message, title }),
      clear: () => setToasts([]),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  // Auto-focus close on errors so keyboard users can dismiss easily.
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (toast.kind === "error") closeRef.current?.focus();
  }, [toast.kind]);

  const colours: Record<ToastKind, string> = {
    success: "border-emerald-300 bg-emerald-50 text-emerald-900",
    error: "border-red-300 bg-red-50 text-red-900",
    info: "border-slate-300 bg-white text-slate-900",
  };

  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-md border px-3 py-2 text-sm shadow-md ${colours[toast.kind]}`}
    >
      <div className="flex-1">
        {toast.title && <div className="font-semibold">{toast.title}</div>}
        <div>{toast.message}</div>
      </div>
      <button
        ref={closeRef}
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="text-current opacity-60 transition hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
