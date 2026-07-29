import { createContext, useContext, useEffect, useRef, type PropsWithChildren } from "react";
import {
  matchesHotkey,
  type HotkeyCommandId,
  type HotkeyKeyboardEvent,
} from "./hotkeyCatalog";

export type HotkeyHandler = (event: KeyboardEvent) => boolean | void;

export type UseHotkeyOptions = {
  enabled?: boolean;
};

type HotkeyRegistration = {
  commandId: HotkeyCommandId;
  handler: HotkeyHandler;
  enabled: boolean;
};

export type HotkeyRegistrar = {
  register: (commandId: HotkeyCommandId, handler: HotkeyHandler, options?: UseHotkeyOptions) => () => void;
  dispatch: (event: KeyboardEvent) => boolean;
};

const HotkeyRegistrarContext = createContext<HotkeyRegistrar | null>(null);

export function HotkeyProvider({ children }: PropsWithChildren) {
  const registrarRef = useRef<HotkeyRegistrar | null>(null);
  if (!registrarRef.current) registrarRef.current = createHotkeyRegistrar();

  useEffect(() => {
    const registrar = registrarRef.current!;
    const onKeyDown = (event: KeyboardEvent) => registrar.dispatch(event);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return <HotkeyRegistrarContext.Provider value={registrarRef.current}>{children}</HotkeyRegistrarContext.Provider>;
}

export function useHotkey(commandId: HotkeyCommandId, handler: HotkeyHandler, { enabled = true }: UseHotkeyOptions = {}) {
  const registrar = useContext(HotkeyRegistrarContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  if (!registrar) throw new Error("useHotkey must be used within a HotkeyProvider.");

  useEffect(() => registrar.register(commandId, (event) => handlerRef.current(event), { enabled }), [commandId, enabled, registrar]);
}

export function createHotkeyRegistrar(): HotkeyRegistrar {
  const registrations: HotkeyRegistration[] = [];

  return {
    register(commandId, handler, { enabled = true } = {}) {
      const registration = { commandId, handler, enabled };
      registrations.push(registration);
      return () => {
        const index = registrations.indexOf(registration);
        if (index >= 0) registrations.splice(index, 1);
      };
    },
    dispatch(event) {
      if (isComposing(event) || isEditableTarget(event.target)) return false;

      for (let index = registrations.length - 1; index >= 0; index -= 1) {
        const registration = registrations[index];
        if (!registration.enabled || !matchesHotkey(registration.commandId, event as HotkeyKeyboardEvent)) continue;
        if (registration.handler(event) === false) continue;
        event.preventDefault();
        return true;
      }

      return false;
    },
  };
}

function isComposing(event: KeyboardEvent) {
  return event.isComposing || event.keyCode === 229;
}

function isEditableTarget(target: EventTarget | null) {
  return typeof (target as { closest?: unknown } | null)?.closest === "function"
    && (target as Element).closest("input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']") !== null;
}
