import { CheckCircle2, Info, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ApiError } from "@/lib/api";
import { Button } from "./ui";

// ------------------------------------------------------------------ dialog

export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog stack" style={{ gap: 16 }} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ------------------------------------------------------------------ toasts + confirm

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}
interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  resolve: (ok: boolean) => void;
}

interface FeedbackValue {
  toast(kind: ToastKind, message: string): void;
  confirm(options: Omit<ConfirmRequest, "resolve">): Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const toast = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const confirm = useCallback(
    (options: Omit<ConfirmRequest, "resolve">) => new Promise<boolean>((resolve) => setRequest({ ...options, resolve })),
    [],
  );

  const close = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast" role={t.kind === "error" ? "alert" : "status"}>
            {t.kind === "success" ? (
              <CheckCircle2 size={18} color="var(--success)" />
            ) : t.kind === "error" ? (
              <XCircle size={18} color="var(--danger)" />
            ) : (
              <Info size={18} color="var(--info)" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
      <Dialog open={!!request} onClose={() => close(false)} title={request?.title}>
        <p className="muted">{request?.message}</p>
        <div className="grid-2">
          <Button variant="secondary" onClick={() => close(false)}>Cancel</Button>
          <Button variant={request?.destructive ? "danger" : "primary"} onClick={() => close(true)}>
            {request?.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </Dialog>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used inside <FeedbackProvider>");
  return ctx;
}

/**
 * Runs an async action with a loading flag; failures become an error toast.
 * Returns [run, loading]; run resolves to true on success.
 */
export function useAction() {
  const { toast } = useFeedback();
  const [loading, setLoading] = useState(false);
  const run = useCallback(
    async (action: () => Promise<unknown>, success?: string) => {
      setLoading(true);
      try {
        await action();
        if (success) toast("success", success);
        return true;
      } catch (e) {
        toast("error", ApiError.from(e).message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );
  return [run, loading] as const;
}
