import { useLayoutEffect, type RefObject } from "react";
import type { SourceBlock } from "../../../document-model";
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
  sourceBlockMap: Record<string, SourceBlock>;
  fetchImpl?: typeof fetch;
  onOpenSourceBlock?: (target: InlineDocumentSourceTarget) => void;
  onDocumentEdited?: () => void | Promise<void>;
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
  sourceBlockMap,
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
      onStatusChange?.({ state: "idle" });
      return undefined;
    }
    const markedElements = new Set<HTMLElement>();
    markEditableElements(root, sourceBlockMap, markedElements);
    const mutationObserver = typeof MutationObserver === "undefined"
      ? null
      : new MutationObserver(() => markEditableElements(root, sourceBlockMap, markedElements));
    mutationObserver?.observe(root, { childList: true, subtree: true });
    let activeEditableElement: HTMLElement | null = null;

    const finishElementEdit = (element: HTMLElement) => {
      if (element.dataset.openpressEditing !== "true") return;
      if (activeEditableElement === element) activeEditableElement = null;
      void persistElementEdit(
        element,
        sourceBlockMap,
        fetchImpl ?? globalThis.fetch?.bind(globalThis),
        failSave,
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
      if (event.key === "Escape") {
        event.preventDefault();
        element.dataset.openpressEditCanceled = "true";
        element.textContent = element.dataset.openpressOriginalText ?? "";
        finishElementEdit(element);
        element.blur();
        return;
      }
      if (event.key === "Enter") {
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
      if (event.key !== "Enter" && event.key !== " ") return;
      const element = sourceElementFromEvent(event, root);
      if (!element) return;
      const block = blockFromElement(element, sourceBlockMap);
      if (!block) return;
      event.preventDefault();
      event.stopPropagation();
      onOpenSourceBlock?.({ block, element, rect: element.getBoundingClientRect() });
    };

    ownerDocument.addEventListener("focusin", handleFocusIn, true);
    ownerDocument.addEventListener("mousedown", handleEditablePointerDown, true);
    ownerDocument.addEventListener("keydown", handleKeyDown, true);
    ownerDocument.addEventListener("focusout", handleFocusOut, true);
    root.addEventListener("keydown", handleSourceKeyDown);
    root.addEventListener("click", handleClick);

    return () => {
      ownerDocument.removeEventListener("focusin", handleFocusIn, true);
      ownerDocument.removeEventListener("mousedown", handleEditablePointerDown, true);
      ownerDocument.removeEventListener("keydown", handleKeyDown, true);
      ownerDocument.removeEventListener("focusout", handleFocusOut, true);
      root.removeEventListener("keydown", handleSourceKeyDown);
      root.removeEventListener("click", handleClick);
      mutationObserver?.disconnect();
      for (const element of markedElements) clearEditableElement(element);
    };
  }, [enabled, failSave, fetchImpl, onDocumentEdited, onOpenSourceBlock, sourceBlockMap, sourceContainerRef]);
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
  const element = target?.closest<HTMLElement>(EDITABLE_SELECTOR) ?? null;
  if (!element || (root && !root.contains(element))) return null;
  return element;
}

function sourceElementFromEvent(event: Event, root?: HTMLElement) {
  const target = eventTargetElement(event);
  const element = target?.closest<HTMLElement>(SOURCE_SELECTOR) ?? null;
  if (!element || (root && !root.contains(element))) return null;
  return element;
}

function eventTargetElement(event: Event) {
  if (event.target instanceof HTMLElement) return event.target;
  if (event.target instanceof Node && event.target.parentElement instanceof HTMLElement) return event.target.parentElement;
  return null;
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

async function persistElementEdit(
  element: HTMLElement,
  sourceBlockMap: Record<string, SourceBlock>,
  fetchImpl: typeof fetch | undefined,
  failSave: (message?: string) => void,
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

  setElementEditState(element, "saving");
  let sourceSaved = false;
  try {
    const editKind = element.dataset.openpressEditKind || sourceBlock.kind;
    const editName = element.dataset.openpressEditName || sourceBlock.name;
    const tableCellIndex = element.dataset.openpressTableCellIndex;
    const response = await fetchImpl("/__openpress/source-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockId,
        path: sourceBlock.path,
        kind: editKind,
        name: editName,
        source: sourceBlock.source,
        text: nextText,
        cellIndex: tableCellIndex ? Number(tableCellIndex) : undefined,
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `Source edit failed with status ${response.status}`);
    }
    sourceSaved = true;
    element.dataset.openpressOriginalText = nextText;
    await onDocumentEdited?.();
    setElementEditState(element, "saved");
    scheduleClearElementEditState(element, "saved");
  } catch (error) {
    if (!sourceSaved) {
      element.textContent = originalText;
    }
    setElementEditState(element, "failed");
    failSave(error instanceof Error ? error.message : String(error));
  }
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
