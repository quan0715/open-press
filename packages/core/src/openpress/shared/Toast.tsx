import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const TOAST_DURATION = 2800;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = String(++counter.current);
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {typeof document !== "undefined"
        ? createPortal(
            <ToastList toasts={toasts} onDismiss={dismiss} />,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

function ToastList({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-[9000] flex flex-col gap-[10px]"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastEntry key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

const VARIANT_ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const VARIANT_ICON_CLASS: Record<ToastVariant, string> = {
  success: "text-green-400",
  error: "text-red-400",
  info: "text-blue-400",
};

function ToastEntry({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const Icon = VARIANT_ICONS[toast.variant];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className="pointer-events-auto flex min-w-[200px] max-w-[360px] items-center gap-[10px] rounded-[10px] border border-white/10 bg-neutral-900/95 py-[10px] pl-[14px] pr-[10px] text-[13px] font-medium text-[#f0f0ee] shadow-[0_8px_28px_rgb(0_0_0_/_0.4)] backdrop-blur-[14px]"
      role="status"
      data-openpress-toast-variant={toast.variant}
    >
      <Icon className={`h-[15px] w-[15px] shrink-0 ${VARIANT_ICON_CLASS[toast.variant]}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 leading-[1.4]">{toast.message}</span>
      <button
        type="button"
        className="inline-flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] border-0 bg-transparent p-0 text-[#f0f0ee]/45 transition-colors duration-150 hover:bg-white/10 hover:text-[#f0f0ee]"
        aria-label="關閉通知"
        onClick={() => onDismiss(toast.id)}
      >
        <X className="h-[11px] w-[11px]" aria-hidden="true" />
      </button>
    </div>
  );
}
