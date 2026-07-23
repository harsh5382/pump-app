"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";

// ───────────────────────────────────────────────────────────────────────────
// Editorial toast system — replaces inline error/success banners app-wide.
// Usage:  const toast = useToast();  toast.error("…");  toast.success("…");
// ───────────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastApi {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

const STYLES: Record<
  ToastType,
  { icon: LucideIcon; accent: string; iconColor: string }
> = {
  success: { icon: CheckCircle2, accent: "var(--success)", iconColor: "var(--success)" },
  error: { icon: AlertCircle, accent: "var(--danger)", iconColor: "var(--danger)" },
  warning: { icon: AlertTriangle, accent: "var(--accent)", iconColor: "var(--accent)" },
  info: { icon: Info, accent: "var(--ink-700)", iconColor: "var(--ink-700)" },
};

const DURATION = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = "info") => {
      if (!message) return;
      const id = Date.now() + Math.random();
      setToasts((list) => [...list, { id, type, message }]);
      setTimeout(() => remove(id), DURATION);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m) => show(m, "success"),
      error: (m) => show(m, "error"),
      warning: (m) => show(m, "warning"),
      info: (m) => show(m, "info"),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5 w-[min(92vw,360px)] pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => {
          const s = STYLES[t.type];
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex items-start gap-3 rounded-[12px] bg-bg-elev border border-line shadow-lg pl-3.5 pr-2.5 py-3 animate-slide-up"
              style={{ borderLeft: `3px solid ${s.accent}` }}
            >
              <Icon
                className="h-[18px] w-[18px] shrink-0 mt-0.5"
                style={{ color: s.iconColor }}
              />
              <p className="flex-1 text-[13px] leading-snug text-ink-700">
                {t.message}
              </p>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="shrink-0 -mt-0.5 -mr-0.5 p-1 rounded-md text-ink-400 hover:text-ink-700 hover:bg-[var(--bg-overlay)] transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (ctx === undefined)
    throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
