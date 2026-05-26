import type {
  ReaderDocument,
  SourceBlock,
} from "./documentTypes";

export const PRESS_TREE_MDX_SOURCE_TYPE = "openpress-press-tree-mdx";

export function isReactMdxDocument(document: Pick<ReaderDocument, "source"> | null | undefined) {
  return document?.source?.type === PRESS_TREE_MDX_SOURCE_TYPE;
}

export function getSourceBlockMap(
  document: Pick<ReaderDocument, "source"> | null | undefined,
): Record<string, SourceBlock> {
  if (!isReactMdxDocument(document)) return {};
  const blockMap = document?.source?.blockMap;
  if (!blockMap || typeof blockMap !== "object") return {};
  return blockMap;
}

export function getSourceBlock(
  document: Pick<ReaderDocument, "source"> | null | undefined,
  blockId: string | null | undefined,
): SourceBlock | null {
  if (!blockId) return null;
  return getSourceBlockMap(document)[blockId] ?? null;
}
