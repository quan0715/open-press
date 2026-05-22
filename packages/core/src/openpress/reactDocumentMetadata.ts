import type {
  ReaderDocument,
  BuildPagination,
  SourceBlock,
} from "./types";

export const REACT_MDX_SOURCE_TYPE = "openpress-react-mdx";
export const BUILD_TIME_PAGINATION_MODE = "build-time-block-measurement";

export function isReactMdxDocument(document: Pick<ReaderDocument, "source"> | null | undefined) {
  return document?.source?.type === REACT_MDX_SOURCE_TYPE;
}

export function hasBuildTimePagination(document: Pick<ReaderDocument, "source"> | null | undefined) {
  return getBuildPagination(document)?.mode === BUILD_TIME_PAGINATION_MODE;
}

export function getBuildPagination(
  document: Pick<ReaderDocument, "source"> | null | undefined,
): BuildPagination | null {
  if (!isReactMdxDocument(document)) return null;
  const pagination = document?.source?.pagination;
  return pagination && typeof pagination.mode === "string" ? pagination : null;
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
