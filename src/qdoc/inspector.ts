import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { getQDocReactBlockMap } from "./reactDocumentMetadata";
import type { QDocDocument, QDocReactSourceBlock } from "./types";

const DEFAULT_INSPECTOR_STORAGE_KEY = "qdoc:inspector-mode";

export type QDocInspectorIntent = "edit" | "delete" | "add";
export type QDocInspectorPlacement = "block" | "before";

export interface QDocInspectorTarget {
  blockId: string;
  placement: QDocInspectorPlacement;
}

export interface QDocInspectorState {
  enabled: boolean;
  inspectorMode: boolean;
  selectedBlockId: string | null;
  selectedBlock: QDocReactSourceBlock | null;
  selectedTarget: QDocInspectorTarget | null;
  commentIntent: QDocInspectorIntent;
  setInspectorMode: (enabled: boolean) => void;
  toggleInspectorMode: () => void;
  setCommentIntent: (intent: QDocInspectorIntent) => void;
  selectTarget: (target: QDocInspectorTarget | null) => QDocReactSourceBlock | null;
  inspectTarget: (target: EventTarget | null) => QDocReactSourceBlock | null;
  handleClick: (event: ReactMouseEvent) => boolean;
}

export interface QDocInspectorCommentResult {
  ok: boolean;
  comment?: {
    id?: string;
    timestamp?: string;
    path?: string;
    line?: number;
  };
  message?: string;
}

export interface QDocPendingComment {
  id: string;
  timestamp?: string;
  path: string;
  absolutePath?: string;
  line: number;
  marker?: string;
  note: string;
  hint?: string;
}

export interface QDocCommentListResult {
  ok: boolean;
  comments?: QDocPendingComment[];
  message?: string;
}

export interface QDocCommentClearResult {
  ok: boolean;
  removedCount: number;
  comments?: QDocPendingComment[];
  message?: string;
}

export async function submitQDocInspectorComment({
  block,
  note,
  intent,
  placement,
  endpoint = "/__qdoc/comment",
  fetchImpl = globalThis.fetch?.bind(globalThis),
}: {
  block: QDocReactSourceBlock | null;
  note: string;
  intent?: QDocInspectorIntent;
  placement?: QDocInspectorPlacement;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}): Promise<QDocInspectorCommentResult> {
  if (!block) throw new Error("QDoc inspector comment requires a selected block.");
  const normalizedNote = note.trim();
  if (!normalizedNote) throw new Error("QDoc inspector comment note must not be empty.");
  if (!block.path || !block.source?.line) throw new Error("QDoc inspector selected block has no editable source location.");
  if (typeof fetchImpl !== "function") throw new Error("QDoc inspector comment endpoint is unavailable.");

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target: {
        blockId: block.id,
        path: block.path,
        source: block.source,
      },
      note: normalizedNote,
      hint: formatQDocInspectorHint({ intent, placement }),
    }),
  });
  const result = await response.json().catch(() => null) as QDocInspectorCommentResult | null;
  if (!response.ok) {
    throw new Error(result?.message ?? `QDoc inspector comment failed with status ${response.status}`);
  }
  return result ?? { ok: true };
}

export async function fetchQDocInspectorComments({
  endpoint = "/__qdoc/comment",
  fetchImpl = globalThis.fetch?.bind(globalThis),
}: {
  endpoint?: string;
  fetchImpl?: typeof fetch;
} = {}): Promise<QDocPendingComment[]> {
  if (typeof fetchImpl !== "function") throw new Error("QDoc inspector comment endpoint is unavailable.");

  const response = await fetchImpl(endpoint, { method: "GET" });
  const result = await response.json().catch(() => null) as QDocCommentListResult | null;
  if (!response.ok) {
    throw new Error(result?.message ?? `QDoc inspector comment list failed with status ${response.status}`);
  }
  return Array.isArray(result?.comments) ? result.comments : [];
}

export async function clearQDocInspectorComment({
  id,
  all = false,
  endpoint = "/__qdoc/comment",
  fetchImpl = globalThis.fetch?.bind(globalThis),
}: {
  id?: string;
  all?: boolean;
  endpoint?: string;
  fetchImpl?: typeof fetch;
} = {}): Promise<QDocCommentClearResult> {
  if (typeof fetchImpl !== "function") throw new Error("QDoc inspector comment endpoint is unavailable.");
  if (!all && !id) throw new Error("QDoc inspector comment clear requires an id or all=true.");

  const response = await fetchImpl(endpoint, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(all ? { all: true } : { id }),
  });
  const result = await response.json().catch(() => null) as QDocCommentClearResult | null;
  if (!response.ok) {
    throw new Error(result?.message ?? `QDoc inspector comment clear failed with status ${response.status}`);
  }
  return result ?? { ok: true, removedCount: 0 };
}

export function useQDocInspector(
  document: QDocDocument,
  {
    enabled = false,
    storageKey = DEFAULT_INSPECTOR_STORAGE_KEY,
  }: {
    enabled?: boolean;
    storageKey?: string;
  } = {},
): QDocInspectorState {
  const blockMap = useMemo(() => getQDocReactBlockMap(document), [document]);
  const [inspectorMode, setInspectorModeState] = useState(() => {
    if (!enabled || typeof window === "undefined") return false;
    return window.localStorage.getItem(storageKey) === "on";
  });
  const [selectedTarget, setSelectedTarget] = useState<QDocInspectorTarget | null>(null);
  const [commentIntent, setCommentIntent] = useState<QDocInspectorIntent>("edit");

  useEffect(() => {
    if (!enabled && inspectorMode) setInspectorModeState(false);
  }, [enabled, inspectorMode]);

  const setInspectorMode = useCallback((nextEnabled: boolean) => {
    setInspectorModeState(nextEnabled);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, nextEnabled ? "on" : "off");
    }
    if (!nextEnabled) setSelectedTarget(null);
  }, [storageKey]);

  const selectTarget = useCallback((target: QDocInspectorTarget | null) => {
    setSelectedTarget(target);
    if (!target) return null;
    setCommentIntent(target.placement === "before" ? "add" : "edit");
    const sourceBlock = blockMap[target.blockId] ?? null;
    return sourceBlock;
  }, [blockMap]);

  const inspectTarget = useCallback((target: EventTarget | null) => {
    const inspectorTarget = findQDocInspectorTarget(target);
    return selectTarget(inspectorTarget);
  }, [selectTarget]);

  const handleClick = useCallback((event: ReactMouseEvent) => {
    if (!enabled || !inspectorMode) return false;
    const inspectorTarget = findQDocInspectorTarget(event.target);
    if (!inspectorTarget) return false;
    selectTarget(inspectorTarget);
    event.preventDefault();
    event.stopPropagation();
    return true;
  }, [enabled, inspectorMode, selectTarget]);

  const selectedBlockId = selectedTarget?.blockId ?? null;
  const selectedBlock = selectedBlockId ? (blockMap[selectedBlockId] ?? null) : null;

  return {
    enabled,
    inspectorMode: enabled && inspectorMode,
    selectedBlockId,
    selectedBlock,
    selectedTarget,
    commentIntent,
    setInspectorMode,
    toggleInspectorMode: () => setInspectorMode(!inspectorMode),
    setCommentIntent,
    selectTarget,
    inspectTarget,
    handleClick,
  };
}

export function findQDocInspectorTarget(target: EventTarget | null): QDocInspectorTarget | null {
  if (typeof Element === "undefined") return null;
  if (!(target instanceof Element)) return null;
  const insertTarget = target.closest<HTMLElement>("[data-qdoc-insert-before-block-id]");
  const insertBeforeBlockId = insertTarget?.dataset.qdocInsertBeforeBlockId;
  if (insertBeforeBlockId) return { blockId: insertBeforeBlockId, placement: "before" };

  const element = target.closest<HTMLElement>("[data-qdoc-block-id]");
  const blockId = element?.dataset.qdocBlockId;
  return blockId ? { blockId, placement: "block" } : null;
}

export function formatQDocInspectorHint({
  intent,
  placement,
}: {
  intent?: QDocInspectorIntent;
  placement?: QDocInspectorPlacement;
} = {}) {
  const parts = ["qdoc-react-inspector"];
  if (intent) parts.push(`intent=${intent}`);
  if (placement) parts.push(`placement=${placement}`);
  return parts.join(" ");
}
