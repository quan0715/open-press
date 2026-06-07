import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useToast } from "../shared";

export type WorkbenchEditStatus = "idle" | "saving" | "saved" | "failed";

interface WorkbenchEditStatusContextValue {
  status: WorkbenchEditStatus;
  startSave: () => void;
  completeSave: () => void;
  failSave: (message?: string) => void;
}

const WorkbenchEditStatusContext = createContext<WorkbenchEditStatusContextValue | null>(null);

const SAVED_RESET_DELAY_MS = 900;

export function WorkbenchEditStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WorkbenchEditStatus>("idle");
  const { showToast } = useToast();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const startSave = useCallback(() => {
    clearTimer();
    setStatus("saving");
  }, []);

  const completeSave = useCallback(() => {
    setStatus("saved");
    timerRef.current = setTimeout(() => {
      setStatus("idle");
      timerRef.current = null;
    }, SAVED_RESET_DELAY_MS);
  }, []);

  const failSave = useCallback(
    (message?: string) => {
      showToast(message ?? "儲存失敗，請重試", "error");
      setStatus("failed");
      timerRef.current = setTimeout(() => {
        setStatus("idle");
        timerRef.current = null;
      }, SAVED_RESET_DELAY_MS);
    },
    [showToast],
  );

  return (
    <WorkbenchEditStatusContext.Provider value={{ status, startSave, completeSave, failSave }}>
      {children}
    </WorkbenchEditStatusContext.Provider>
  );
}

export function useEditStatus(): WorkbenchEditStatusContextValue {
  const ctx = useContext(WorkbenchEditStatusContext);
  if (!ctx) throw new Error("useEditStatus must be used within <WorkbenchEditStatusProvider>");
  return ctx;
}
