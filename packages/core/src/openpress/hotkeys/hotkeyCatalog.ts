export type HotkeyShortcut = readonly string[];

export type HotkeyCommand = {
  id: string;
  label: string;
  shortcuts: readonly HotkeyShortcut[];
};

export const HOTKEY_COMMANDS = [
  { id: "workspace.toggle-bookmarks", label: "Toggle bookmarks", shortcuts: [["primary", "/"]] },
  { id: "workspace.open-search", label: "Open search", shortcuts: [["primary", "k"]] },
  { id: "view.zoom-in", label: "Zoom in", shortcuts: [["primary", "+"], ["primary", "="]] },
  { id: "view.zoom-out", label: "Zoom out", shortcuts: [["primary", "-"]] },
  { id: "reader.next", label: "Next page", shortcuts: [["ArrowRight"], ["PageDown"]] },
  { id: "reader.previous", label: "Previous page", shortcuts: [["ArrowLeft"], ["PageUp"]] },
  { id: "reader.first", label: "First page", shortcuts: [["Home"]] },
  { id: "reader.last", label: "Last page", shortcuts: [["End"]] },
  { id: "presentation.next", label: "Next slide", shortcuts: [["Space"], ["ArrowRight"], ["PageDown"]] },
  { id: "presentation.previous", label: "Previous slide", shortcuts: [["ArrowLeft"], ["PageUp"]] },
  { id: "presentation.first", label: "First slide", shortcuts: [["Home"]] },
  { id: "presentation.last", label: "Last slide", shortcuts: [["End"]] },
  { id: "presentation.enter-fullscreen", label: "Enter fullscreen", shortcuts: [["f"]] },
  { id: "presentation.exit", label: "Exit presentation", shortcuts: [["Escape"]] },
  { id: "search.close", label: "Close search", shortcuts: [["Escape"]] },
  { id: "editing.submit-comment", label: "Submit comment", shortcuts: [["primary", "Enter"]] },
  { id: "editing.commit-inline", label: "Commit inline edit", shortcuts: [["Enter"]] },
  { id: "editing.cancel-inline", label: "Cancel inline edit", shortcuts: [["Escape"]] },
  { id: "editing.open-source", label: "Open source", shortcuts: [["Enter"], ["Space"]] },
  { id: "editing.close-source", label: "Close source", shortcuts: [["Escape"]] },
  { id: "mentions.next", label: "Next mention", shortcuts: [["ArrowDown"]] },
  { id: "mentions.previous", label: "Previous mention", shortcuts: [["ArrowUp"]] },
  { id: "mentions.choose", label: "Choose mention", shortcuts: [["Enter"], ["Tab"]] },
  { id: "mentions.dismiss", label: "Dismiss mentions", shortcuts: [["Escape"]] },
  { id: "thumbnails.delete", label: "Delete thumbnail", shortcuts: [["Delete"], ["Backspace"]] },
  { id: "thumbnails.activate", label: "Activate thumbnail", shortcuts: [["Enter"], ["Space"]] },
  { id: "panel-resize.narrower", label: "Narrower panel", shortcuts: [["ArrowLeft"]] },
  { id: "panel-resize.wider", label: "Wider panel", shortcuts: [["ArrowRight"]] },
] as const satisfies readonly HotkeyCommand[];

export type HotkeyCommandId = (typeof HOTKEY_COMMANDS)[number]["id"];

export type HotkeyKeyboardEvent = Pick<KeyboardEvent, "key" | "code" | "metaKey" | "ctrlKey" | "altKey" | "isComposing" | "keyCode" | "target">;

export function getHotkeyCommand(commandId: HotkeyCommandId) {
  return HOTKEY_COMMANDS.find((command) => command.id === commandId);
}

export function getHotkeyCommandLabel(commandId: HotkeyCommandId) {
  return getHotkeyCommand(commandId)?.label ?? commandId;
}

export function getHotkeyShortcutLabel(shortcut: HotkeyShortcut) {
  return shortcut.map((key) => {
    if (key === "primary") return "Primary";
    if (key.length === 1) return key.toUpperCase();
    return key;
  }).join(" + ");
}

export function matchesHotkey(commandId: HotkeyCommandId, event: HotkeyKeyboardEvent) {
  const command = getHotkeyCommand(commandId);
  return command?.shortcuts.some((shortcut) => matchesShortcut(shortcut, event)) ?? false;
}

function matchesShortcut(shortcut: HotkeyShortcut, event: HotkeyKeyboardEvent) {
  const requiresPrimary = shortcut.includes("primary");
  if (requiresPrimary !== Boolean(event.metaKey || event.ctrlKey)) return false;
  if (event.altKey) return false;

  const key = shortcut.find((part) => part !== "primary");
  if (!key) return false;
  if (key === "Space") return event.key === " " || event.code === "Space";
  return event.key.toLocaleLowerCase() === key.toLocaleLowerCase();
}
