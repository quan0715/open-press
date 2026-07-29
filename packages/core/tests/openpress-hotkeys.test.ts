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
    expect(getHotkeyCommand("workspace.open-search")).toMatchObject({
      scope: "global",
      priority: 1,
      allowInEditable: false,
    });
    expect(getHotkeyCommand("search.close")).toMatchObject({
      scope: "modal",
      priority: 5,
      allowInEditable: true,
    });
    expect(getHotkeyCommand("editing.commit-inline")).toMatchObject({
      scope: "editor",
      priority: 5,
      allowInEditable: true,
    });
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
  it("blocks global commands in editable targets while permitted editor and modal commands run", () => {
    const registrar = createHotkeyRegistrar();
    const global = vi.fn();
    const editorWithoutPermission = vi.fn();
    const editor = vi.fn();
    const modal = vi.fn();
    registrar.register("workspace.open-search", global, { allowInEditable: true });
    registrar.register("editing.commit-inline", editorWithoutPermission);
    registrar.register("editing.commit-inline", editor, { allowInEditable: true });
    registrar.register("search.close", modal, { allowInEditable: true });

    registrar.dispatch(keydown({ key: "k", ctrlKey: true, target: editableTarget() }));
    registrar.dispatch(keydown({ key: "Enter", target: editableTarget() }));
    registrar.dispatch(keydown({ key: "Escape", target: editableTarget() }));
    registrar.dispatch(keydown({ key: "Escape", target: editableTarget(), isComposing: true }));

    expect(global).not.toHaveBeenCalled();
    expect(editorWithoutPermission).not.toHaveBeenCalled();
    expect(editor).toHaveBeenCalledOnce();
    expect(modal).toHaveBeenCalledOnce();
  });

  it("uses fixed scope priority before registration recency, then recency within a scope", () => {
    const registrar = createHotkeyRegistrar();
    const reader = vi.fn();
    const workbench = vi.fn();
    const presentation = vi.fn();
    const newerPresentation = vi.fn();
    registrar.register("presentation.next", presentation);
    registrar.register("panel-resize.wider", workbench);
    registrar.register("reader.next", reader);

    registrar.dispatch(keydown());
    registrar.register("presentation.next", newerPresentation);
    registrar.dispatch(keydown());

    expect(presentation).toHaveBeenCalledOnce();
    expect(newerPresentation).toHaveBeenCalledOnce();
    expect(workbench).not.toHaveBeenCalled();
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
