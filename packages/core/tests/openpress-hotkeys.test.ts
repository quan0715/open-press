import { describe, expect, it, vi } from "vitest";
import {
  getHotkeyCommand,
  getHotkeyCommandLabel,
  getHotkeyShortcutLabel,
  HOTKEY_COMMANDS,
  matchesHotkey,
} from "../src/openpress/hotkeys";
import { createHotkeyRegistrar } from "../src/openpress/hotkeys/HotkeyProvider";

type KeydownEvent = {
  key: string;
  code?: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  isComposing?: boolean;
  keyCode?: number;
  target?: EventTarget | null;
  preventDefault: ReturnType<typeof vi.fn>;
};

function keydown(overrides: Partial<KeydownEvent> = {}): KeydownEvent {
  return {
    key: "ArrowRight",
    preventDefault: vi.fn(),
    ...overrides,
  };
}

function editableTarget(): EventTarget {
  return {
    closest: () => ({}),
  } as EventTarget;
}

describe("OpenPress hotkey catalog", () => {
  it("declares the required command ids and literal shortcuts", () => {
    expect(HOTKEY_COMMANDS.map((command) => [command.id, command.shortcuts.map((shortcut) => shortcut.join("+"))])).toEqual([
      ["workspace.toggle-bookmarks", ["primary+/"]],
      ["workspace.open-search", ["primary+k"]],
      ["view.zoom-in", ["primary++", "primary+="]],
      ["view.zoom-out", ["primary+-"]],
      ["reader.next", ["ArrowRight", "PageDown"]],
      ["reader.previous", ["ArrowLeft", "PageUp"]],
      ["reader.first", ["Home"]],
      ["reader.last", ["End"]],
      ["presentation.next", ["Space", "ArrowRight", "PageDown"]],
      ["presentation.previous", ["ArrowLeft", "PageUp"]],
      ["presentation.first", ["Home"]],
      ["presentation.last", ["End"]],
      ["presentation.enter-fullscreen", ["f"]],
      ["presentation.exit", ["Escape"]],
      ["search.close", ["Escape"]],
      ["editing.submit-comment", ["primary+Enter"]],
      ["editing.commit-inline", ["Enter"]],
      ["editing.cancel-inline", ["Escape"]],
      ["editing.open-source", ["Enter", "Space"]],
      ["editing.close-source", ["Escape"]],
      ["mentions.next", ["ArrowDown"]],
      ["mentions.previous", ["ArrowUp"]],
      ["mentions.choose", ["Enter", "Tab"]],
      ["mentions.dismiss", ["Escape"]],
      ["thumbnails.delete", ["Delete", "Backspace"]],
      ["thumbnails.activate", ["Enter", "Space"]],
      ["panel-resize.narrower", ["ArrowLeft"]],
      ["panel-resize.wider", ["ArrowRight"]],
    ]);
  });

  it("resolves command metadata and readable labels", () => {
    expect(getHotkeyCommand("workspace.open-search")?.label).toBe("Open search");
    expect(getHotkeyCommandLabel("workspace.open-search")).toBe("Open search");
    expect(getHotkeyShortcutLabel(["primary", "k"])).toBe("Primary + K");
  });

  it("matches primary modifier aliases and literal keys", () => {
    expect(matchesHotkey("view.zoom-in", keydown({ key: "=", metaKey: true }))).toBe(true);
    expect(matchesHotkey("view.zoom-in", keydown({ key: "+", ctrlKey: true }))).toBe(true);
    expect(matchesHotkey("view.zoom-in", keydown({ key: "=", ctrlKey: true, altKey: true }))).toBe(false);
    expect(matchesHotkey("reader.next", keydown({ key: "PageDown" }))).toBe(true);
    expect(matchesHotkey("presentation.next", keydown({ key: " ", code: "Space" }))).toBe(true);
  });
});

describe("OpenPress hotkey registrar", () => {
  it("does not dispatch while an editable target or composition is active", () => {
    const registrar = createHotkeyRegistrar();
    const handleNext = vi.fn();
    registrar.register("reader.next", handleNext);

    registrar.dispatch(keydown({ target: editableTarget() }));
    registrar.dispatch(keydown({ isComposing: true }));
    registrar.dispatch(keydown({ keyCode: 229 }));

    expect(handleNext).not.toHaveBeenCalled();
  });

  it("prefers the most recently active registration", () => {
    const registrar = createHotkeyRegistrar();
    const reader = vi.fn();
    const presentation = vi.fn();
    registrar.register("reader.next", reader);
    registrar.register("presentation.next", presentation);

    registrar.dispatch(keydown());

    expect(presentation).toHaveBeenCalledOnce();
    expect(reader).not.toHaveBeenCalled();
  });

  it("falls through false handlers and handles an event once", () => {
    const registrar = createHotkeyRegistrar();
    const reader = vi.fn(() => undefined);
    const declinedPresentation = vi.fn(() => false);
    const olderPresentation = vi.fn();
    registrar.register("reader.next", reader);
    registrar.register("presentation.next", olderPresentation);
    registrar.register("presentation.next", declinedPresentation);
    const event = keydown();

    registrar.dispatch(event);

    expect(declinedPresentation).toHaveBeenCalledOnce();
    expect(olderPresentation).toHaveBeenCalledOnce();
    expect(reader).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });
});
