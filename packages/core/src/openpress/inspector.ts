import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { getSourceBlockMap } from "./reactDocumentMetadata";
import type { ReaderDocument, SourceBlock } from "./types";

const DEFAULT_INSPECTOR_STORAGE_KEY = "openpress:inspector-mode";

export type InspectorIntent = "edit" | "delete" | "add";
export type InspectorPlacement = "block" | "before";

export interface InspectorTarget {
  blockId: string;
  placement: InspectorPlacement;
}

export interface InspectorState {
  enabled: boolean;
  inspectorMode: boolean;
  selectedBlockId: string | null;
  selectedBlock: SourceBlock | null;
  selectedTarget: InspectorTarget | null;
  commentIntent: InspectorIntent;
  setInspectorMode: (enabled: boolean) => void;
  toggleInspectorMode: () => void;
  setCommentIntent: (intent: InspectorIntent) => void;
  selectTarget: (target: InspectorTarget | null) => SourceBlock | null;
  inspectTarget: (target: EventTarget | null) => SourceBlock | null;
  handleClick: (event: ReactMouseEvent) => boolean;
}

export interface InspectorCommentResult {
  ok: boolean;
  comment?: {
    id?: string;
    timestamp?: string;
    path?: string;
    line?: number;
    note?: string;
    hint?: string;
  };
  message?: string;
}

export interface PendingComment {
  id: string;
  timestamp?: string;
  path: string;
  absolutePath?: string;
  line: number;
  marker?: string;
  note: string;
  hint?: string;
}

export interface CommentListResult {
  ok: boolean;
  comments?: PendingComment[];
  message?: string;
}

export interface CommentClearResult {
  ok: boolean;
  removedCount: number;
  comments?: PendingComment[];
  message?: string;
}

export async function submitInspectorComment({
  block,
  note,
  intent,
  placement,
  endpoint = "/__openpress/comment",
  fetchImpl = globalThis.fetch?.bind(globalThis),
}: {
  block: SourceBlock | null;
  note: string;
  intent?: InspectorIntent;
  placement?: InspectorPlacement;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}): Promise<InspectorCommentResult> {
  if (!block) throw new Error("OpenPress inspector comment requires a selected block.");
  const normalizedNote = note.trim();
  if (!normalizedNote) throw new Error("OpenPress inspector comment note must not be empty.");
  if (!block.path || !block.source?.line) throw new Error("OpenPress inspector selected block has no editable source location.");
  if (typeof fetchImpl !== "function") throw new Error("OpenPress inspector comment endpoint is unavailable.");

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
      hint: formatInspectorHint({ intent, placement }),
    }),
  });
  const result = await response.json().catch(() => null) as InspectorCommentResult | null;
  if (!response.ok) {
    throw new Error(result?.message ?? `OpenPress inspector comment failed with status ${response.status}`);
  }
  return result ?? { ok: true };
}

export async function fetchInspectorComments({
  endpoint = "/__openpress/comment",
  fetchImpl = globalThis.fetch?.bind(globalThis),
}: {
  endpoint?: string;
  fetchImpl?: typeof fetch;
} = {}): Promise<PendingComment[]> {
  if (typeof fetchImpl !== "function") throw new Error("OpenPress inspector comment endpoint is unavailable.");

  const response = await fetchImpl(endpoint, { method: "GET" });
  const result = await response.json().catch(() => null) as CommentListResult | null;
  if (!response.ok) {
    throw new Error(result?.message ?? `OpenPress inspector comment list failed with status ${response.status}`);
  }
  return Array.isArray(result?.comments) ? result.comments : [];
}

export async function clearInspectorComment({
  id,
  all = false,
  endpoint = "/__openpress/comment",
  fetchImpl = globalThis.fetch?.bind(globalThis),
}: {
  id?: string;
  all?: boolean;
  endpoint?: string;
  fetchImpl?: typeof fetch;
} = {}): Promise<CommentClearResult> {
  if (typeof fetchImpl !== "function") throw new Error("OpenPress inspector comment endpoint is unavailable.");
  if (!all && !id) throw new Error("OpenPress inspector comment clear requires an id or all=true.");

  const response = await fetchImpl(endpoint, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(all ? { all: true } : { id }),
  });
  const result = await response.json().catch(() => null) as CommentClearResult | null;
  if (!response.ok) {
    throw new Error(result?.message ?? `OpenPress inspector comment clear failed with status ${response.status}`);
  }
  return result ?? { ok: true, removedCount: 0 };
}

export async function updateInspectorComment({
  id,
  note,
  intent,
  placement,
  endpoint = "/__openpress/comment",
  fetchImpl = globalThis.fetch?.bind(globalThis),
}: {
  id: string;
  note: string;
  intent?: InspectorIntent;
  placement?: InspectorPlacement;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}): Promise<InspectorCommentResult> {
  const normalizedNote = note.trim();
  if (!id.trim()) throw new Error("OpenPress inspector comment update requires an id.");
  if (!normalizedNote) throw new Error("OpenPress inspector comment note must not be empty.");
  if (typeof fetchImpl !== "function") throw new Error("OpenPress inspector comment endpoint is unavailable.");

  const response = await fetchImpl(endpoint, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      note: normalizedNote,
      hint: formatInspectorHint({ intent, placement }),
    }),
  });
  const result = await response.json().catch(() => null) as InspectorCommentResult | null;
  if (!response.ok) {
    throw new Error(result?.message ?? `OpenPress inspector comment update failed with status ${response.status}`);
  }
  return result ?? { ok: true };
}

export function useInspector(
  document: ReaderDocument,
  {
    enabled = false,
    storageKey = DEFAULT_INSPECTOR_STORAGE_KEY,
  }: {
    enabled?: boolean;
    storageKey?: string;
  } = {},
): InspectorState {
  const blockMap = useMemo(() => getSourceBlockMap(document), [document]);
  const [inspectorMode, setInspectorModeState] = useState(() => {
    if (!enabled || typeof window === "undefined") return false;
    return window.localStorage.getItem(storageKey) === "on";
  });
  const [selectedTarget, setSelectedTarget] = useState<InspectorTarget | null>(null);
  const [commentIntent, setCommentIntent] = useState<InspectorIntent>("edit");

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

  const selectTarget = useCallback((target: InspectorTarget | null) => {
    setSelectedTarget(target);
    if (!target) return null;
    setCommentIntent(target.placement === "before" ? "add" : "edit");
    const sourceBlock = blockMap[target.blockId] ?? null;
    return sourceBlock;
  }, [blockMap]);

  const inspectTarget = useCallback((target: EventTarget | null) => {
    const inspectorTarget = findInspectorTarget(target);
    return selectTarget(inspectorTarget);
  }, [selectTarget]);

  const handleClick = useCallback((event: ReactMouseEvent) => {
    if (!enabled || !inspectorMode) return false;
    const inspectorTarget = findInspectorTarget(event.target);
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

export function findInspectorTarget(target: EventTarget | null): InspectorTarget | null {
  if (typeof Element === "undefined") return null;
  if (!(target instanceof Element)) return null;
  const insertTarget = target.closest<HTMLElement>("[data-openpress-insert-before-block-id]");
  const insertBeforeBlockId = insertTarget?.dataset.openpressInsertBeforeBlockId;
  if (insertBeforeBlockId) return { blockId: insertBeforeBlockId, placement: "before" };

  const element = target.closest<HTMLElement>("[data-openpress-block-id]");
  const blockId = element?.dataset.openpressBlockId;
  return blockId ? { blockId, placement: "block" } : null;
}

export function formatInspectorHint({
  intent,
  placement,
}: {
  intent?: InspectorIntent;
  placement?: InspectorPlacement;
} = {}) {
  const parts = ["openpress-react-inspector"];
  if (intent) parts.push(`intent=${intent}`);
  if (placement) parts.push(`placement=${placement}`);
  return parts.join(" ");
}
