import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import clsx from "clsx";

interface Toast { id: number; message: string; tone: "success" | "error" | "info" }
interface ToastContextValue { push: (message: string, tone?: Toast["tone"]) => void }

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "animate-rise-in rounded-xl border px-4 py-3 text-sm shadow-lift max-w-sm",
              t.tone === "success" && "bg-pine-700 text-paper border-pine-900",
              t.tone === "error" && "bg-clay-400 text-paper border-clay-600",
              t.tone === "info" && "bg-paper text-ink border-ink/10"
            )}
          >
            {t.message}
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
