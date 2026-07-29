export type HotkeyShortcut = readonly string[];

export type HotkeyScope = "editor" | "modal" | "presentation" | "workbench" | "reader" | "global";

export type HotkeyPriority = 1 | 2 | 3 | 4 | 5;

export type HotkeyCommand = {
  id: string;
  label: string;
  shortcuts: readonly HotkeyShortcut[];
  scope: HotkeyScope;
  priority: HotkeyPriority;
  allowInEditable: boolean;
};

export const HOTKEY_COMMANDS = [
  { id: "workspace.toggle-bookmarks", label: "Toggle bookmarks", shortcuts: [["primary", "/"]], scope: "global", priority: 1, allowInEditable: false },
  { id: "workspace.open-search", label: "Open search", shortcuts: [["primary", "k"]], scope: "global", priority: 1, allowInEditable: false },
  { id: "view.zoom-in", label: "Zoom in", shortcuts: [["primary", "+"], ["primary", "="]], scope: "global", priority: 1, allowInEditable: false },
  { id: "view.zoom-out", label: "Zoom out", shortcuts: [["primary", "-"]], scope: "global", priority: 1, allowInEditable: false },
  { id: "reader.next", label: "Next page", shortcuts: [["ArrowRight"], ["PageDown"]], scope: "reader", priority: 2, allowInEditable: false },
  { id: "reader.previous", label: "Previous page", shortcuts: [["ArrowLeft"], ["PageUp"]], scope: "reader", priority: 2, allowInEditable: false },
  { id: "reader.first", label: "First page", shortcuts: [["Home"]], scope: "reader", priority: 2, allowInEditable: false },
  { id: "reader.last", label: "Last page", shortcuts: [["End"]], scope: "reader", priority: 2, allowInEditable: false },
  { id: "presentation.next", label: "Next slide", shortcuts: [["Space"], ["ArrowRight"], ["PageDown"]], scope: "presentation", priority: 4, allowInEditable: false },
  { id: "presentation.previous", label: "Previous slide", shortcuts: [["ArrowLeft"], ["PageUp"]], scope: "presentation", priority: 4, allowInEditable: false },
  { id: "presentation.first", label: "First slide", shortcuts: [["Home"]], scope: "presentation", priority: 4, allowInEditable: false },
  { id: "presentation.last", label: "Last slide", shortcuts: [["End"]], scope: "presentation", priority: 4, allowInEditable: false },
  { id: "presentation.enter-fullscreen", label: "Enter fullscreen", shortcuts: [["f"]], scope: "presentation", priority: 4, allowInEditable: false },
  { id: "presentation.exit", label: "Exit presentation", shortcuts: [["Escape"]], scope: "presentation", priority: 4, allowInEditable: false },
  { id: "search.close", label: "Close search", shortcuts: [["Escape"]], scope: "modal", priority: 5, allowInEditable: true },
  { id: "editing.submit-comment", label: "Submit comment", shortcuts: [["primary", "Enter"]], scope: "editor", priority: 5, allowInEditable: true },
  { id: "editing.commit-inline", label: "Commit inline edit", shortcuts: [["Enter"]], scope: "editor", priority: 5, allowInEditable: true },
  { id: "editing.cancel-inline", label: "Cancel inline edit", shortcuts: [["Escape"]], scope: "editor", priority: 5, allowInEditable: true },
  { id: "editing.open-source", label: "Open source", shortcuts: [["Enter"], ["Space"]], scope: "editor", priority: 5, allowInEditable: true },
  { id: "editing.close-source", label: "Close source", shortcuts: [["Escape"]], scope: "editor", priority: 5, allowInEditable: true },
  { id: "mentions.next", label: "Next mention", shortcuts: [["ArrowDown"]], scope: "editor", priority: 5, allowInEditable: true },
  { id: "mentions.previous", label: "Previous mention", shortcuts: [["ArrowUp"]], scope: "editor", priority: 5, allowInEditable: true },
  { id: "mentions.choose", label: "Choose mention", shortcuts: [["Enter"], ["Tab"]], scope: "editor", priority: 5, allowInEditable: true },
  { id: "mentions.dismiss", label: "Dismiss mentions", shortcuts: [["Escape"]], scope: "editor", priority: 5, allowInEditable: true },
  { id: "thumbnails.delete", label: "Delete thumbnail", shortcuts: [["Delete"], ["Backspace"]], scope: "workbench", priority: 3, allowInEditable: false },
  { id: "thumbnails.activate", label: "Activate thumbnail", shortcuts: [["Enter"], ["Space"]], scope: "workbench", priority: 3, allowInEditable: false },
  { id: "panel-resize.narrower", label: "Narrower panel", shortcuts: [["ArrowLeft"]], scope: "workbench", priority: 3, allowInEditable: false },
  { id: "panel-resize.wider", label: "Wider panel", shortcuts: [["ArrowRight"]], scope: "workbench", priority: 3, allowInEditable: false },
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
