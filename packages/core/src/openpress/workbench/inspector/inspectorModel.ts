import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { getObjectEntityMap, getSourceBlockMap } from "../../document-model";
import type {
  EditableSourceRef,
  ObjectEntity,
  ObjectEntityRef,
  ReaderDocument,
  SourceBlock,
} from "../../document-model";

const DEFAULT_INSPECTOR_STORAGE_KEY = "openpress:inspector-mode";

export type InspectorPlacement = "block" | "before";

export interface ObjectSelection {
  objectId?: string;
  entityRef?: ObjectEntityRef;
  blockId?: string;
  placement: InspectorPlacement;
  objectEntity?: ObjectEntity;
}

export type InspectorTarget = ObjectSelection;

export interface CommentDraft {
  entityRef: ObjectEntityRef;
  label?: string;
  blockId?: string;
  targetObjectId?: string;
  placement: InspectorPlacement;
  source: EditableSourceRef;
  note: string;
}

export interface InspectorState {
  enabled: boolean;
  inspectorMode: boolean;
  selectedBlockId: string | null;
  selectedBlock: SourceBlock | null;
  selectedObjectEntity: ObjectEntity | null;
  selectedSelection: ObjectSelection | null;
  selectedTarget: ObjectSelection | null;
  setInspectorMode: (enabled: boolean) => void;
  toggleInspectorMode: () => void;
  selectSelection: (target: ObjectSelection | null) => SourceBlock | null;
  inspectSelection: (target: EventTarget | null) => SourceBlock | null;
  selectTarget: (target: ObjectSelection | null) => SourceBlock | null;
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

async function requestInspectorJson<T extends { message?: string }>({
  endpoint,
  fetchImpl,
  method,
  body,
  errorPrefix,
}: {
  endpoint: string;
  fetchImpl?: typeof fetch;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  errorPrefix: string;
}): Promise<T | null> {
  if (typeof fetchImpl !== "function") throw new Error("OpenPress inspector comment endpoint is unavailable.");
  const response = await fetchImpl(endpoint, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const result = await response.json().catch(() => null) as T | null;
  if (!response.ok) {
    throw new Error(result?.message ?? `${errorPrefix} with status ${response.status}`);
  }
  return result;
}

export async function submitInspectorComment({
  draft,
  endpoint = "/__openpress/comment",
  fetchImpl = globalThis.fetch?.bind(globalThis),
}: {
  draft: CommentDraft;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}): Promise<InspectorCommentResult> {
  const result = await requestInspectorJson<InspectorCommentResult>({
    endpoint,
    fetchImpl,
    method: "POST",
    errorPrefix: "OpenPress inspector comment failed",
    body: {
      target: {
        objectId: draft.entityRef.id,
        targetObjectId: draft.targetObjectId,
        kind: draft.entityRef.kind,
        label: draft.label,
        blockId: draft.blockId,
        path: draft.source.path,
        source: draft.source.source,
      },
      note: draft.note,
      hint: formatInspectorHint({ placement: draft.placement, targetObjectId: draft.targetObjectId }),
    },
  });
  return result ?? { ok: true };
}

export function createInspectorCommentDraft({
  block,
  entity,
  note,
  placement,
  target,
}: {
  block: SourceBlock | null;
  entity: ObjectEntity | null;
  note: string;
  placement: InspectorPlacement;
  target?: ObjectSelection | null;
}): CommentDraft {
  const normalizedNote = note.trim();
  if (!block) throw new Error("OpenPress inspector comment requires a selected object.");
  if (!normalizedNote) throw new Error("OpenPress inspector comment note must not be empty.");
  if (!block.path || !block.source?.line) throw new Error("OpenPress inspector selected object has no editable source location.");

  return {
    entityRef: entity ? { id: entity.id, kind: entity.kind } : { id: block.id, kind: "mdx-block" },
    label: entity?.label ?? block.name ?? block.id,
    blockId: block.id,
    targetObjectId: target?.objectId && target.objectId !== entity?.id ? target.objectId : undefined,
    placement,
    source: {
      path: block.path,
      source: block.source,
      line: block.source.line,
      column: block.source.column,
    },
    note: normalizedNote,
  };
}

export async function fetchInspectorComments({
  endpoint = "/__openpress/comment",
  fetchImpl = globalThis.fetch?.bind(globalThis),
}: {
  endpoint?: string;
  fetchImpl?: typeof fetch;
} = {}): Promise<PendingComment[]> {
  const result = await requestInspectorJson<CommentListResult>({
    endpoint,
    fetchImpl,
    method: "GET",
    errorPrefix: "OpenPress inspector comment list failed",
  });
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
  if (!all && !id) throw new Error("OpenPress inspector comment clear requires an id or all=true.");

  const result = await requestInspectorJson<CommentClearResult>({
    endpoint,
    fetchImpl,
    method: "DELETE",
    errorPrefix: "OpenPress inspector comment clear failed",
    body: all ? { all: true } : { id },
  });
  return result ?? { ok: true, removedCount: 0 };
}

export async function updateInspectorComment({
  id,
  note,
  placement,
  endpoint = "/__openpress/comment",
  fetchImpl = globalThis.fetch?.bind(globalThis),
}: {
  id: string;
  note: string;
  placement?: InspectorPlacement;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}): Promise<InspectorCommentResult> {
  const normalizedNote = note.trim();
  if (!id.trim()) throw new Error("OpenPress inspector comment update requires an id.");
  if (!normalizedNote) throw new Error("OpenPress inspector comment note must not be empty.");

  const result = await requestInspectorJson<InspectorCommentResult>({
    endpoint,
    fetchImpl,
    method: "PATCH",
    errorPrefix: "OpenPress inspector comment update failed",
    body: {
      id,
      note: normalizedNote,
      hint: formatInspectorHint({ placement }),
    },
  });
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
  const objectEntityMap = useMemo(() => getObjectEntityMap(document), [document]);
  const [inspectorMode, setInspectorModeState] = useState(() => {
    if (!enabled || typeof window === "undefined") return false;
    return window.localStorage.getItem(storageKey) === "on";
  });
  const [selectedSelection, setSelectedSelection] = useState<ObjectSelection | null>(null);

  useEffect(() => {
    if (!enabled && inspectorMode) setInspectorModeState(false);
  }, [enabled, inspectorMode]);

  const setInspectorMode = useCallback((nextEnabled: boolean) => {
    setInspectorModeState(nextEnabled);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, nextEnabled ? "on" : "off");
    }
    if (!nextEnabled) setSelectedSelection(null);
  }, [storageKey]);

  const resolveSourceBlock = useCallback((target: ObjectSelection | null): SourceBlock | null => {
    if (!target) return null;
    if (target.blockId && blockMap[target.blockId]) return blockMap[target.blockId] ?? null;
    const entity = target.objectEntity;
    const source = entity?.source;
    if (!entity || !source?.path) return null;
    return {
      id: entity.blockId ?? entity.id,
      kind: entity.kind,
      name: entity.label,
      path: source.path,
      frameKey: entity.frameKey,
      chainId: entity.chainId,
      source: source.source ?? (source.line ? { line: source.line, column: source.column ?? 1 } : undefined),
    };
  }, [blockMap]);

  const selectSelection = useCallback((target: ObjectSelection | null) => {
    const resolvedTarget = target?.objectId && !target.objectEntity
      ? { ...target, objectEntity: objectEntityMap[target.objectId] }
      : target;
    const withRef = resolvedTarget?.objectEntity && !resolvedTarget.entityRef
      ? {
          ...resolvedTarget,
          entityRef: {
            id: resolvedTarget.objectEntity.id,
            kind: resolvedTarget.objectEntity.kind,
          },
        }
      : resolvedTarget;

    setSelectedSelection(withRef ?? null);
    return resolveSourceBlock(withRef ?? null);
  }, [objectEntityMap, resolveSourceBlock]);

  const inspectSelection = useCallback((target: EventTarget | null) => {
    const objectSelection = findObjectSelection(target, objectEntityMap);
    return selectSelection(objectSelection);
  }, [objectEntityMap, selectSelection]);

  const handleClick = useCallback((event: ReactMouseEvent) => {
    if (!enabled || !inspectorMode) return false;
    const objectSelection = findObjectSelection(event.target, objectEntityMap);
    if (!objectSelection) return false;
    selectSelection(objectSelection);
    event.preventDefault();
    event.stopPropagation();
    return true;
  }, [enabled, inspectorMode, objectEntityMap, selectSelection]);

  const selectedObjectEntity = selectedSelection?.objectEntity ?? null;
  const selectedBlock = resolveSourceBlock(selectedSelection);
  const selectedBlockId = selectedBlock?.id ?? selectedSelection?.blockId ?? null;

  return {
    enabled,
    inspectorMode: enabled && inspectorMode,
    selectedBlockId,
    selectedBlock,
    selectedObjectEntity,
    selectedSelection,
    selectedTarget: selectedSelection,
    setInspectorMode,
    toggleInspectorMode: () => setInspectorMode(!inspectorMode),
    selectSelection,
    inspectSelection,
    selectTarget: selectSelection,
    inspectTarget: inspectSelection,
    handleClick,
  };
}

export function findObjectSelection(
  target: EventTarget | null,
  objectEntities: Record<string, ObjectEntity> = {},
): ObjectSelection | null {
  if (typeof Element === "undefined") return null;
  if (!(target instanceof Element)) return null;
  const insertTarget = target.closest<HTMLElement>("[data-openpress-insert-before-block-id]");
  const insertBeforeBlockId = insertTarget?.dataset.openpressInsertBeforeBlockId;
  if (insertBeforeBlockId) {
    const objectId = insertTarget?.dataset.openpressObjectId;
    const objectEntity = objectId ? objectEntities[objectId] : undefined;
    const selection: ObjectSelection = { blockId: insertBeforeBlockId, placement: "before" };
    if (objectId) selection.objectId = objectId;
    if (objectEntity) {
      selection.objectEntity = objectEntity;
      selection.entityRef = { id: objectEntity.id, kind: objectEntity.kind };
    }
    return selection;
  }

  const renderedObject = target.closest<HTMLElement>("[data-openpress-object-id]");
  const objectId = renderedObject?.dataset.openpressObjectId;
  if (objectId) {
    const objectEntity = objectEntities[objectId];
    const blockId = renderedObject?.dataset.openpressBlockId || objectEntity?.blockId;
    const selection: ObjectSelection = { objectId, placement: "block" };
    if (blockId) selection.blockId = blockId;
    if (objectEntity) {
      selection.objectEntity = objectEntity;
      selection.entityRef = { id: objectEntity.id, kind: objectEntity.kind };
    }
    return selection;
  }

  const element = target.closest<HTMLElement>("[data-openpress-block-id]");
  const blockId = element?.dataset.openpressBlockId;
  return blockId ? { blockId, placement: "block" } : null;
}

export const findInspectorTarget = findObjectSelection;

export function formatInspectorHint({
  placement,
  targetObjectId,
}: {
  placement?: InspectorPlacement;
  targetObjectId?: string;
} = {}) {
  const parts = ["openpress-react-inspector"];
  if (placement) parts.push(`placement=${placement}`);
  if (targetObjectId?.trim()) parts.push(`target=${encodeURIComponent(targetObjectId.trim())}`);
  return parts.join(" ");
}
