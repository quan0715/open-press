import { createContext, useContext, useEffect, useRef, type PropsWithChildren } from "react";
import {
  getHotkeyCommand,
  matchesHotkey,
  type HotkeyCommand,
  type HotkeyCommandId,
  type HotkeyKeyboardEvent,
} from "./hotkeyCatalog";

export type HotkeyHandler = (event: KeyboardEvent) => boolean | void;

export type UseHotkeyOptions = {
  enabled?: boolean;
  allowInEditable?: boolean;
};

type HotkeyRegistration = {
  commandId: HotkeyCommandId;
  command: HotkeyCommand;
  handler: HotkeyHandler;
  enabled: boolean;
  allowInEditable: boolean;
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

export function useHotkey(commandId: HotkeyCommandId, handler: HotkeyHandler, { enabled = true, allowInEditable = false }: UseHotkeyOptions = {}) {
  const registrar = useContext(HotkeyRegistrarContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  if (!registrar) throw new Error("useHotkey must be used within a HotkeyProvider.");

  useEffect(() => registrar.register(commandId, (event) => handlerRef.current(event), { enabled, allowInEditable }), [allowInEditable, commandId, enabled, registrar]);
}

export function createHotkeyRegistrar(): HotkeyRegistrar {
  const registrations: HotkeyRegistration[] = [];

  return {
    register(commandId, handler, { enabled = true, allowInEditable = false } = {}) {
      const command = getHotkeyCommand(commandId)!;
      const registration = { commandId, command, handler, enabled, allowInEditable };
      registrations.push(registration);
      return () => {
        const index = registrations.indexOf(registration);
        if (index >= 0) registrations.splice(index, 1);
      };
    },
    dispatch(event) {
      if (isComposing(event)) return false;
      const editable = isEditableTarget(event.target);
      const candidates = registrations
        .map((registration, order) => ({ registration, order }))
        .filter(({ registration }) => registration.enabled
          && matchesHotkey(registration.commandId, event as HotkeyKeyboardEvent)
          && (!editable || (registration.command.allowInEditable && registration.allowInEditable)))
        .sort((left, right) => right.registration.command.priority - left.registration.command.priority || right.order - left.order);

      for (const { registration } of candidates) {
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
