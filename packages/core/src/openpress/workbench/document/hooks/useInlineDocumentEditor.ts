import { useLayoutEffect, type RefObject } from "react";
import type { DocumentRefreshOptions, SourceBlock } from "../../../document-model";
import { isKeyboardEventComposing } from "../../keyboardEvents";
import { matchesHotkey } from "../../../hotkeys";
import { localMutationHeaders } from "../../localMutationRequest";
import { useEditStatus } from "../../WorkbenchEditStatusContext";

export type InlineDocumentEditState = "idle" | "editing" | "saving" | "saved" | "failed";

export type InlineDocumentEditStatus = {
  state: InlineDocumentEditState;
  blockId?: string;
  message?: string;
};

export type InlineDocumentEditorOptions = {
  enabled: boolean;
  sourceContainerRef: RefObject<HTMLElement | null>;
  sourceContainerVersion?: number;
  sourceBlockMap: Record<string, SourceBlock>;
  pressSlug?: string | null;
  fetchImpl?: typeof fetch;
  onOpenSourceBlock?: (target: InlineDocumentSourceTarget) => void;
  onDocumentEdited?: (options?: DocumentRefreshOptions) => void | Promise<void>;
};

export type InlineDocumentSourceTarget = {
  block: SourceBlock;
  element: HTMLElement;
  rect: DOMRect;
};

type DocumentWithCaretFromPoint = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

const EDITABLE_SELECTOR = "[data-openpress-editable-block='true']";
const SOURCE_SELECTOR = "[data-openpress-source-editable-block='true']";
const EDITABLE_OBJECT_TEXT_SELECTOR = "[data-openpress-object-kind='text'][data-openpress-object-source]";
const EDITABLE_SOURCE_TARGET_SELECTOR = `[data-openpress-block-id], ${EDITABLE_OBJECT_TEXT_SELECTOR}`;
const SAVED_EDIT_STATE_RESET_DELAY_MS = 900;
// Attribute placed on the block-level container (page or nearest block element)
// to drive the CSS animation that shows the region is saving / has been re-rendered.
const INLINE_SAVE_BLOCK_ATTR = "data-openpress-inline-save";
const UNSAFE_EDITABLE_CHILDREN = [
  "a",
  "button",
  "canvas",
  "figure",
  "form",
  "img",
  "input",
  "ol",
  "picture",
  "select",
  "svg",
  "table",
  "textarea",
  "ul",
  "video",
].join(",");

export function useInlineDocumentEditor({
  enabled,
  sourceContainerRef,
  sourceContainerVersion,
  sourceBlockMap,
  pressSlug,
  fetchImpl,
  onOpenSourceBlock,
  onDocumentEdited,
}: InlineDocumentEditorOptions) {
  const { failSave } = useEditStatus();
  useLayoutEffect(() => {
    const root = sourceContainerRef.current;
    if (!root) return undefined;
    const ownerDocument = root.ownerDocument;

    if (!enabled) {
      return undefined;
    }
    let activeEditableElement: HTMLElement | null = null;
    const markedElements = new Set<HTMLElement>();
    const boundEditableElements = new Set<HTMLElement>();

    const finishElementEdit = (element: HTMLElement) => {
      if (element.dataset.openpressEditing !== "true") return;
      if (activeEditableElement === element) activeEditableElement = null;
      void persistElementEdit(
        element,
        root,
        sourceBlockMap,
        fetchImpl ?? globalThis.fetch?.bind(globalThis),
        failSave,
        pressSlug,
        onDocumentEdited,
      );
    };

    const focusEditableElement = (element: HTMLElement, event?: MouseEvent) => {
      beginElementEdit(element);
      activeEditableElement = element;
      element.focus({ preventScroll: true });
      if (event) placeCaretFromMouseEvent(element, event);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const element = editableElementFromEvent(event, root);
      if (!element) return;
      focusEditableElement(element);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const element = editableElementFromEvent(event, root);
      if (!element) return;
      event.stopPropagation();
      if (isKeyboardEventComposing(event)) return;
      if (matchesHotkey("editing.cancel-inline", event)) {
        event.preventDefault();
        element.dataset.openpressEditCanceled = "true";
        element.textContent = element.dataset.openpressOriginalText ?? "";
        finishElementEdit(element);
        element.blur();
        return;
      }
      if (matchesHotkey("editing.commit-inline", event)) {
        if (element.dataset.openpressPreserveLineBreaks === "true") return;
        event.preventDefault();
        finishElementEdit(element);
        element.blur();
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      const element = editableElementFromEvent(event, root);
      if (!element) return;
      finishElementEdit(element);
    };

    const handleEditablePointerDown = (event: MouseEvent) => {
      const element = editableElementFromEvent(event, root);
      const target = eventTargetElement(event);
      if (activeEditableElement && (!element || element !== activeEditableElement) && target && !activeEditableElement.contains(target)) {
        finishElementEdit(activeEditableElement);
      }
      if (!element) return;
      focusEditableElement(element, event);
    };
    const handleDocumentPointerDown = (event: MouseEvent) => {
      if (!activeEditableElement) return;
      const target = eventTargetElement(event);
      if (!target || activeEditableElement.contains(target) || root.contains(target)) return;
      finishElementEdit(activeEditableElement);
    };

    const handleClick = (event: MouseEvent) => {
      const editableElement = editableElementFromEvent(event, root);
      if (editableElement) {
        focusEditableElement(editableElement, event);
        return;
      }
      const element = sourceElementFromEvent(event, root);
      if (!element) return;
      const block = blockFromElement(element, sourceBlockMap);
      if (!block) return;
      event.preventDefault();
      event.stopPropagation();
      onOpenSourceBlock?.({ block, element, rect: element.getBoundingClientRect() });
    };

    const handleSourceKeyDown = (event: KeyboardEvent) => {
      if (!matchesHotkey("editing.open-source", event)) return;
      const element = sourceElementFromEvent(event, root);
      if (!element) return;
      const block = blockFromElement(element, sourceBlockMap);
      if (!block) return;
      event.preventDefault();
      event.stopPropagation();
      onOpenSourceBlock?.({ block, element, rect: element.getBoundingClientRect() });
    };

    const bindEditableElements = () => {
      root.querySelectorAll<HTMLElement>(EDITABLE_SELECTOR).forEach((element) => {
        if (boundEditableElements.has(element)) return;
        element.addEventListener("focus", handleFocusIn);
        element.addEventListener("blur", handleFocusOut);
        element.addEventListener("mousedown", handleEditablePointerDown);
        element.addEventListener("keydown", handleKeyDown);
        boundEditableElements.add(element);
      });
    };
    const refreshEditableElements = () => {
      markEditableElements(root, sourceBlockMap, markedElements);
      bindEditableElements();
    };
    refreshEditableElements();
    const mutationObserver = typeof MutationObserver === "undefined"
      ? null
      : new MutationObserver(refreshEditableElements);
    mutationObserver?.observe(root, { childList: true, subtree: true });

    root.addEventListener("focusin", handleFocusIn, true);
    root.addEventListener("focus", handleFocusIn, true);
    root.addEventListener("mousedown", handleEditablePointerDown, true);
    root.addEventListener("keydown", handleKeyDown, true);
    root.addEventListener("focusout", handleFocusOut, true);
    root.addEventListener("blur", handleFocusOut, true);
    ownerDocument.addEventListener("mousedown", handleDocumentPointerDown, true);
    root.addEventListener("keydown", handleSourceKeyDown);
    root.addEventListener("click", handleClick);

    return () => {
    root.removeEventListener("focusin", handleFocusIn, true);
    root.removeEventListener("focus", handleFocusIn, true);
    root.removeEventListener("mousedown", handleEditablePointerDown, true);
    root.removeEventListener("keydown", handleKeyDown, true);
    root.removeEventListener("focusout", handleFocusOut, true);
    root.removeEventListener("blur", handleFocusOut, true);
      ownerDocument.removeEventListener("mousedown", handleDocumentPointerDown, true);
      root.removeEventListener("keydown", handleSourceKeyDown);
      root.removeEventListener("click", handleClick);
      mutationObserver?.disconnect();
      for (const element of boundEditableElements) {
        element.removeEventListener("focus", handleFocusIn);
        element.removeEventListener("blur", handleFocusOut);
        element.removeEventListener("mousedown", handleEditablePointerDown);
        element.removeEventListener("keydown", handleKeyDown);
      }
      for (const element of markedElements) clearEditableElement(element);
    };
  }, [enabled, failSave, fetchImpl, onDocumentEdited, onOpenSourceBlock, pressSlug, sourceBlockMap, sourceContainerRef, sourceContainerVersion]);
}

function beginElementEdit(element: HTMLElement) {
  if (element.dataset.openpressEditing === "true") return;
  clearElementEditState(element);
  element.dataset.openpressOriginalText = element.dataset.openpressOriginalText ?? readableElementText(element);
  element.dataset.openpressEditing = "true";
}

function placeCaretFromMouseEvent(element: HTMLElement, event: MouseEvent) {
  const selection = element.ownerDocument.getSelection?.();
  if (!selection) return;

  const range = createCaretRangeFromPoint(element.ownerDocument, event.clientX, event.clientY);
  if (range && element.contains(range.startContainer)) {
    selection.removeAllRanges();
    selection.addRange(range);
    return;
  }

  placeCaretAtEnd(element, selection);
}

function createCaretRangeFromPoint(document: Document, x: number, y: number) {
  const documentWithCaret = document as DocumentWithCaretFromPoint;
  const rangeFromPoint = documentWithCaret.caretRangeFromPoint?.(x, y);
  if (rangeFromPoint) return rangeFromPoint;

  const caretPosition = documentWithCaret.caretPositionFromPoint?.(x, y);
  if (!caretPosition) return null;

  const range = document.createRange();
  range.setStart(caretPosition.offsetNode, caretPosition.offset);
  range.collapse(true);
  return range;
}

function placeCaretAtEnd(element: HTMLElement, selection: Selection) {
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function markEditableElements(
  root: HTMLElement,
  sourceBlockMap: Record<string, SourceBlock>,
  markedElements: Set<HTMLElement>,
) {
  root.querySelectorAll<HTMLElement>(EDITABLE_SOURCE_TARGET_SELECTOR).forEach((element) => {
    const sourceBlock = blockFromElement(element, sourceBlockMap);
    if (sourceBlock?.kind === "table-row") {
      markEditableTableCells(element, sourceBlock, markedElements);
      return;
    }

    if (sourceBlock && markEditableComponentCaption(element, sourceBlock, markedElements)) {
      return;
    }

    if (sourceBlock?.kind === "object-text") {
      element.dataset.openpressBlockId = sourceBlock.id;
      element.dataset.openpressInheritedBlockId = "true";
      element.dataset.openpressEditKind = "object-text";
      element.dataset.openpressEditName = "text";
      markEditableTextElement(element, markedElements, { label: "編輯文字" });
      return;
    }

    if (isEditableTextBlockElement(element, sourceBlockMap)) {
      markEditableTextElement(element, markedElements, {
        label: sourceBlock?.name === "pre" ? "編輯程式碼文字" : "編輯文字",
        preserveLineBreaks: sourceBlock?.name === "pre",
      });
      return;
    }

    if (!isSourceEditableBlockElement(element, sourceBlockMap)) return;
    element.setAttribute("tabindex", "0");
    element.setAttribute("role", "button");
    element.setAttribute("aria-label", "編輯 source");
    element.dataset.openpressSourceEditableBlock = "true";
    markedElements.add(element);
  });
}

function markEditableComponentCaption(
  componentElement: HTMLElement,
  sourceBlock: SourceBlock,
  markedElements: Set<HTMLElement>,
) {
  if (sourceBlock.kind !== "component") return false;
  if (!sourceBlock.path || !sourceBlock.source?.line) return false;

  const caption = componentElement.querySelector<HTMLElement>("figcaption");
  if (!caption) return false;
  if (caption.matches(UNSAFE_EDITABLE_CHILDREN) || caption.querySelector(UNSAFE_EDITABLE_CHILDREN)) return false;
  if (!readableElementText(caption).trim()) return false;

  caption.dataset.openpressBlockId = sourceBlock.id;
  caption.dataset.openpressInheritedBlockId = "true";
  if (!caption.dataset.openpressObjectId) {
    caption.dataset.openpressObjectId = createInlineEditableObjectId(sourceBlock.id, "caption");
    caption.dataset.openpressInheritedObjectId = "true";
  }
  caption.dataset.openpressEditKind = "component-caption";
  caption.dataset.openpressEditName = String(sourceBlock.name);
  markEditableTextElement(caption, markedElements, { label: "編輯圖說文字" });
  return true;
}

function markEditableTableCells(row: HTMLElement, sourceBlock: SourceBlock, markedElements: Set<HTMLElement>) {
  Array.from(row.children).forEach((child, cellIndex) => {
    if (!(child instanceof HTMLElement)) return;
    if (child.tagName !== "TD" && child.tagName !== "TH") return;
    if (child.matches(UNSAFE_EDITABLE_CHILDREN) || child.querySelector(UNSAFE_EDITABLE_CHILDREN)) return;
    if (!readableElementText(child).trim()) return;

    child.dataset.openpressBlockId = sourceBlock.id;
    child.dataset.openpressInheritedBlockId = "true";
    if (!child.dataset.openpressObjectId) {
      child.dataset.openpressObjectId = createInlineEditableObjectId(sourceBlock.id, "cell", cellIndex);
      child.dataset.openpressInheritedObjectId = "true";
    }
    child.dataset.openpressEditKind = "table-cell";
    child.dataset.openpressEditName = child.tagName.toLowerCase();
    child.dataset.openpressTableCellIndex = String(cellIndex);
    markEditableTextElement(child, markedElements, { label: "編輯表格文字" });
  });
}

function markEditableTextElement(
  element: HTMLElement,
  markedElements: Set<HTMLElement>,
  { label, preserveLineBreaks = false }: { label: string; preserveLineBreaks?: boolean },
) {
  element.setAttribute("contenteditable", "true");
  element.setAttribute("spellcheck", "false");
  element.setAttribute("tabindex", "0");
  element.setAttribute("role", "textbox");
  element.setAttribute("aria-label", label);
  element.dataset.openpressEditableBlock = "true";
  if (preserveLineBreaks) {
    element.dataset.openpressPreserveLineBreaks = "true";
    element.setAttribute("aria-multiline", "true");
  } else {
    delete element.dataset.openpressPreserveLineBreaks;
    element.removeAttribute("aria-multiline");
  }
  element.querySelectorAll<HTMLElement>("[data-openpress-caption-label]").forEach((labelElement) => {
    labelElement.setAttribute("contenteditable", "false");
  });
  if (!element.dataset.openpressOriginalText) {
    element.dataset.openpressOriginalText = readableElementText(element);
  }
  markedElements.add(element);
}

function clearEditableElement(element: HTMLElement) {
  element.removeAttribute("contenteditable");
  element.removeAttribute("spellcheck");
  element.removeAttribute("tabindex");
  element.removeAttribute("role");
  element.removeAttribute("aria-label");
  delete element.dataset.openpressEditableBlock;
  delete element.dataset.openpressSourceEditableBlock;
  delete element.dataset.openpressEditing;
  delete element.dataset.openpressOriginalText;
  delete element.dataset.openpressEditCanceled;
  delete element.dataset.openpressEditState;
  delete element.dataset.openpressEditStateToken;
  delete element.dataset.openpressEditKind;
  delete element.dataset.openpressEditName;
  delete element.dataset.openpressTableCellIndex;
  delete element.dataset.openpressPreserveLineBreaks;
  element.removeAttribute("aria-busy");
  element.removeAttribute("aria-multiline");
  if (element.dataset.openpressInheritedBlockId === "true") {
    delete element.dataset.openpressBlockId;
  }
  delete element.dataset.openpressInheritedBlockId;
  if (element.dataset.openpressInheritedObjectId === "true") {
    delete element.dataset.openpressObjectId;
  }
  delete element.dataset.openpressInheritedObjectId;
}

function isEditableTextBlockElement(element: HTMLElement, sourceBlockMap: Record<string, SourceBlock>) {
  const blockId = element.dataset.openpressBlockId;
  const sourceBlock = blockId ? sourceBlockMap[blockId] : undefined;
  if (!sourceBlock?.path || !sourceBlock.source?.line) return false;
  if (!isEditableSourceBlock(sourceBlock)) return false;
  if (element.matches(UNSAFE_EDITABLE_CHILDREN) || element.querySelector(UNSAFE_EDITABLE_CHILDREN)) return false;
  return true;
}

function isSourceEditableBlockElement(element: HTMLElement, sourceBlockMap: Record<string, SourceBlock>) {
  if (element.dataset.openpressTableCellIndex) return false;
  const sourceBlock = blockFromElement(element, sourceBlockMap);
  if (!sourceBlock?.path || !sourceBlock.source?.line) return false;
  return false;
}

function isEditableSourceBlock(sourceBlock: SourceBlock) {
  if (sourceBlock.kind === "list-item") return true;
  if (sourceBlock.kind !== "element") return false;
  return typeof sourceBlock.name === "string" && /^(h[1-6]|p|blockquote|pre|caption|figcaption)$/.test(sourceBlock.name);
}

function editableElementFromEvent(event: Event, root?: HTMLElement) {
  const target = eventTargetElement(event);
  const currentTarget = isElementTarget(event.currentTarget)
    && event.currentTarget.matches(EDITABLE_SELECTOR)
    ? event.currentTarget
    : null;
  const element = target?.closest<HTMLElement>(EDITABLE_SELECTOR) ?? currentTarget;
  if (!element) return null;
  if (root && !root.contains(element) && element !== currentTarget) return null;
  return element;
}

function sourceElementFromEvent(event: Event, root?: HTMLElement) {
  const target = eventTargetElement(event);
  const element = target?.closest<HTMLElement>(SOURCE_SELECTOR) ?? null;
  if (!element || (root && !root.contains(element))) return null;
  return element;
}

function eventTargetElement(event: Event) {
  if (isElementTarget(event.target)) return event.target;
  const parentElement = parentElementFromTarget(event.target);
  if (parentElement) return parentElement;
  return null;
}

function isElementTarget(value: EventTarget | null): value is HTMLElement {
  return Boolean(value && typeof (value as HTMLElement).closest === "function");
}

function parentElementFromTarget(value: EventTarget | null) {
  if (!value || typeof value !== "object") return null;
  const parentElement = (value as { parentElement?: unknown }).parentElement;
  return isElementTarget(parentElement as EventTarget | null) ? parentElement as HTMLElement : null;
}

function blockFromElement(element: HTMLElement, sourceBlockMap: Record<string, SourceBlock>) {
  const blockId = element.dataset.openpressBlockId;
  if (blockId && sourceBlockMap[blockId]) return sourceBlockMap[blockId];
  return sourceBlockFromObjectElement(element);
}

function sourceBlockFromObjectElement(element: HTMLElement): SourceBlock | undefined {
  if (element.dataset.openpressObjectKind !== "text") return undefined;
  const sourceRef = parseObjectSourceRef(element.dataset.openpressObjectSource);
  if (typeof sourceRef?.path !== "string" || !sourceRef.path) return undefined;
  const source = sourceLocationFromSourceRef(sourceRef);
  if (!source?.line) return undefined;
  const objectId = element.dataset.openpressObjectId || (typeof sourceRef.objectId === "string" ? sourceRef.objectId : undefined);
  if (!objectId) return undefined;
  return {
    id: `object-text:${objectId}`,
    kind: "object-text",
    name: "text",
    path: sourceRef.path,
    source,
    frameKey: element.dataset.openpressObjectFrameKey,
    chainId: element.dataset.openpressObjectChainId,
  };
}

type ObjectSourceRefCandidate = {
  path?: unknown;
  objectId?: unknown;
  source?: unknown;
  line?: unknown;
  column?: unknown;
  endLine?: unknown;
  endColumn?: unknown;
};

type SourceLocationCandidate = {
  line?: unknown;
  column?: unknown;
  endLine?: unknown;
  endColumn?: unknown;
};

function parseObjectSourceRef(value: string | undefined): ObjectSourceRefCandidate | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function sourceLocationFromSourceRef(sourceRef: ReturnType<typeof parseObjectSourceRef>): SourceBlock["source"] | undefined {
  if (!sourceRef) return undefined;
  const nestedSource = sourceLocationCandidate(sourceRef.source);
  const line = numberValue(sourceRef.line) ?? numberValue(nestedSource?.line);
  if (line === undefined) return undefined;
  return {
    line,
    column: numberValue(sourceRef.column) ?? numberValue(nestedSource?.column) ?? 1,
    endLine: numberValue(sourceRef.endLine) ?? numberValue(nestedSource?.endLine),
    endColumn: numberValue(sourceRef.endColumn) ?? numberValue(nestedSource?.endColumn),
  };
}

function sourceLocationCandidate(value: unknown): SourceLocationCandidate | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

// Find the nearest stable container that can carry the save animation.
// We walk up to [data-openpress-page-index] — the React-managed page div that
// wraps the dangerouslySetInnerHTML content. It is never torn down by innerHTML
// replacement, so the ::after animation survives even when the page HTML is
// patched in after a refresh.
function resolveBlockContainer(element: HTMLElement): HTMLElement {
  return (
    element.closest<HTMLElement>("[data-openpress-page-index]") ??
    element.closest<HTMLElement>("[data-openpress-block-id]:not([data-openpress-editable-block='true'])") ??
    element
  );
}

async function persistElementEdit(
  element: HTMLElement,
  root: HTMLElement,
  sourceBlockMap: Record<string, SourceBlock>,
  fetchImpl: typeof fetch | undefined,
  failSave: (message?: string) => void,
  pressSlug: string | null | undefined,
  onDocumentEdited: InlineDocumentEditorOptions["onDocumentEdited"],
) {
  const sourceBlock = blockFromElement(element, sourceBlockMap);
  const blockId = sourceBlock?.id ?? element.dataset.openpressBlockId;
  const preserveLineBreaks = element.dataset.openpressPreserveLineBreaks === "true";
  const originalText = normalizeEditableText(element.dataset.openpressOriginalText ?? "", { preserveLineBreaks });
  const nextText = normalizeEditableText(readableElementText(element), { preserveLineBreaks });
  const canceled = element.dataset.openpressEditCanceled === "true";
  delete element.dataset.openpressEditing;
  delete element.dataset.openpressEditCanceled;

  if (!sourceBlock || canceled || nextText === originalText) {
    delete element.dataset.openpressOriginalText;
    clearElementEditState(element);
    return;
  }
  if (!fetchImpl) {
    element.textContent = originalText;
    setElementEditState(element, "failed");
    failSave("Source edit endpoint is unavailable.");
    return;
  }

  // Capture identity attributes BEFORE the document refresh. The DOM nodes we
  // hold references to (element, blockContainer) may be torn down when the
  // refreshed page HTML is patched in (innerHTML swap or React remount of the
  // page container if page.id changes). After the refresh we re-locate the
  // equivalent nodes in the new DOM via these stable identifiers so the
  // "saved" flash always lands on the visible element instead of a detached
  // orphan that the user cannot see.
  const editIdentity: EditElementIdentity = {
    blockId: element.dataset.openpressBlockId,
    objectId: element.dataset.openpressObjectId,
    cellIndex: element.dataset.openpressTableCellIndex,
  };
  const blockContainer = resolveBlockContainer(element);
  setElementEditState(element, "saving");
  blockContainer.setAttribute(INLINE_SAVE_BLOCK_ATTR, "saving");

  let sourceSaved = false;
  try {
    const editKind = element.dataset.openpressEditKind || sourceBlock.kind;
    const editName = element.dataset.openpressEditName || sourceBlock.name;
    const tableCellIndex = element.dataset.openpressTableCellIndex;
    const response = await fetchImpl("/__openpress/source-edit", {
      method: "POST",
      headers: localMutationHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        blockId,
        path: sourceBlock.path,
        kind: editKind,
        name: editName,
        source: sourceBlock.source,
        text: nextText,
        cellIndex: tableCellIndex ? Number(tableCellIndex) : undefined,
        pressSlug,
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `Source edit failed with status ${response.status}`);
    }
    const result = await response.json().catch(() => undefined) as { document?: { renderId?: string } } | undefined;
    sourceSaved = true;
    element.dataset.openpressOriginalText = nextText;
    await onDocumentEdited?.({ expectedRenderId: result?.document?.renderId });

    // The React commit for the refreshed document may not have flushed yet.
    // Wait one frame so querySelector sees the new DOM before we re-locate.
    await waitForNextFrame();

    const refreshedElement = relocateRefreshedEditableElement(root, editIdentity)
      ?? (element.isConnected ? element : null);
    const refreshedContainer = refreshedElement
      ? resolveBlockContainer(refreshedElement)
      : (blockContainer.isConnected ? blockContainer : null);

    if (refreshedElement) {
      refreshedElement.dataset.openpressOriginalText = nextText;
      setElementEditState(refreshedElement, "saved");
      scheduleClearElementEditState(refreshedElement, "saved");
    }
    if (refreshedContainer) {
      refreshedContainer.setAttribute(INLINE_SAVE_BLOCK_ATTR, "saved");
      scheduleBlockContainerClear(refreshedContainer);
    }
  } catch (error) {
    if (!sourceSaved) {
      element.textContent = originalText;
    }
    blockContainer.removeAttribute(INLINE_SAVE_BLOCK_ATTR);
    setElementEditState(element, "failed");
    failSave(error instanceof Error ? error.message : String(error));
  }
}

type EditElementIdentity = {
  blockId?: string;
  objectId?: string;
  cellIndex?: string;
};

function relocateRefreshedEditableElement(
  root: HTMLElement,
  identity: EditElementIdentity,
): HTMLElement | null {
  if (!root.isConnected) return null;
  const selectors: string[] = [];
  if (identity.objectId) {
    selectors.push(`[data-openpress-object-id="${cssAttrValue(identity.objectId)}"]`);
  }
  if (identity.blockId) {
    if (identity.cellIndex) {
      selectors.push(
        `[data-openpress-block-id="${cssAttrValue(identity.blockId)}"][data-openpress-table-cell-index="${cssAttrValue(identity.cellIndex)}"]`,
      );
    } else {
      selectors.push(`[data-openpress-block-id="${cssAttrValue(identity.blockId)}"]`);
    }
  }
  for (const selector of selectors) {
    try {
      const found = root.querySelector<HTMLElement>(selector);
      if (found) return found;
    } catch {
      // Bad selector (shouldn't happen with escaped values) — try the next.
    }
  }
  return null;
}

function cssAttrValue(value: string) {
  // Escape backslash and double quote for use inside an attribute selector
  // wrapped in double quotes.
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

function setElementEditState(element: HTMLElement, state: "saving" | "saved" | "failed") {
  element.dataset.openpressEditState = state;
  delete element.dataset.openpressEditStateToken;
  if (state === "saving") {
    element.setAttribute("aria-busy", "true");
    return;
  }
  element.removeAttribute("aria-busy");
}

function clearElementEditState(element: HTMLElement) {
  delete element.dataset.openpressEditState;
  delete element.dataset.openpressEditStateToken;
  element.removeAttribute("aria-busy");
}

function scheduleClearElementEditState(element: HTMLElement, state: "saved" | "failed") {
  const token = `${Date.now()}-${Math.random()}`;
  element.dataset.openpressEditStateToken = token;
  window.setTimeout(() => {
    if (element.dataset.openpressEditStateToken !== token) return;
    if (element.dataset.openpressEditState !== state) return;
    clearElementEditState(element);
  }, SAVED_EDIT_STATE_RESET_DELAY_MS);
}

function scheduleBlockContainerClear(container: HTMLElement) {
  // Keep the "saved" state long enough for the CSS flash to complete, then remove.
  window.setTimeout(() => {
    if (container.getAttribute(INLINE_SAVE_BLOCK_ATTR) === "saved") {
      container.removeAttribute(INLINE_SAVE_BLOCK_ATTR);
    }
  }, SAVED_EDIT_STATE_RESET_DELAY_MS + 400);
}

function readableElementText(element: HTMLElement) {
  const captionLabel = element.querySelector("[data-openpress-caption-label]");
  if (!captionLabel) return typeof element.innerText === "string" ? element.innerText : (element.textContent ?? "");
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-openpress-caption-label]").forEach((node) => node.remove());
  return typeof clone.innerText === "string" ? clone.innerText : (clone.textContent ?? "");
}

function normalizeEditableText(value: string, { preserveLineBreaks = false }: { preserveLineBreaks?: boolean } = {}) {
  if (preserveLineBreaks) return value.replace(/\r\n?/g, "\n").replace(/^\n+|\n+$/g, "");
  return value.replace(/\s*\r?\n\s*/g, " ").trim();
}

function createInlineEditableObjectId(blockId: string, kind: "caption" | "cell", index?: number) {
  const parts = ["mdx-block", blockId, kind];
  if (typeof index === "number") parts.push(String(index));
  return parts.join(":");
}
