import type { ObjectEntity, ObjectEntityKind, ReaderDocument, SourceBlock } from "./documentTypes";

export function createObjectEntityId(kind: ObjectEntityKind, ...parts: Array<string | number>) {
  return [kind, ...parts.map((part) => encodeURIComponent(String(part)))].join(":");
}

export function createBlockObjectEntityId(blockId: string) {
  return createObjectEntityId("mdx-block", blockId);
}

export function createFrameObjectEntityId(frameKey: string) {
  return createObjectEntityId("frame", frameKey);
}

export function createPageObjectEntityId(frameKey: string) {
  return createObjectEntityId("page", frameKey);
}

export function createMdxAreaObjectEntityId(frameKey: string, chainId: string, indexInFrame: number) {
  return createObjectEntityId("mdx-area", frameKey, chainId, indexInFrame);
}

export function getObjectEntityMap(document: Pick<ReaderDocument, "source"> | null | undefined): Record<string, ObjectEntity> {
  return document?.source?.objectEntities ?? {};
}

export function getObjectEntity(document: Pick<ReaderDocument, "source"> | null | undefined, objectId: string): ObjectEntity | null {
  return getObjectEntityMap(document)[objectId] ?? null;
}

export function sourceBlockToObjectEntity(block: SourceBlock): ObjectEntity {
  return {
    id: createBlockObjectEntityId(block.id),
    kind: "mdx-block",
    label: block.name ? `${block.name} ${block.id}` : block.id,
    blockId: block.id,
    frameKey: block.frameKey,
    chainId: block.chainId,
    pageId: block.frameKey ? createPageObjectEntityId(block.frameKey) : undefined,
    source: {
      path: block.path,
      source: block.source,
      line: block.source?.line,
      column: block.source?.column,
    },
    metadata: {
      blockKind: block.kind ?? null,
      sectionSlug: block.sectionSlug ?? block.chapterSlug ?? null,
    },
  };
}
