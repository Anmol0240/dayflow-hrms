import { useCallback, useMemo, useState, type PropsWithChildren } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

import { cn } from "../../lib/utils";
import { ToastContext, type ToastInput, type ToastTone } from "./toast-context";

interface Toast extends ToastInput {
  id: number;
  tone: ToastTone;
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (input: ToastInput) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { ...input, id, tone: input.tone ?? "info" }]);
      window.setTimeout(() => dismiss(id), 5_000);
    },
    [dismiss],
  );

  const icons = useMemo(() => ({ success: CheckCircle2, error: CircleAlert, info: Info }), []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
      >
        {toasts.map((toast) => {
          const Icon = icons[toast.tone];
          return (
            <div
              className={cn(
                "pointer-events-auto flex gap-3 rounded-xl border bg-white p-4 shadow-lg",
                toast.tone === "error" && "border-red-200",
                toast.tone === "success" && "border-emerald-200",
              )}
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
            >
              <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-indigo-600" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-950">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-sm text-slate-600">{toast.description}</p>
                ) : null}
              </div>
              <button
                aria-label="Dismiss notification"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                onClick={() => dismiss(toast.id)}
                type="button"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
