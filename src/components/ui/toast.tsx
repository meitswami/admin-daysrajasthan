"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, X } from "lucide-react";

type Toast = { id: number; message: string; type?: "success" | "info" };

const ToastContext = createContext<{ show: (message: string, type?: Toast["type"]) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-[100] flex flex-col items-center gap-2 sm:left-auto sm:right-6 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg animate-in slide-in-from-bottom-2",
              t.type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
              t.type === "info" && "border-sky-200 bg-sky-50 text-sky-900"
            )}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button type="button" onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}>
              <X className="h-4 w-4 opacity-60" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
