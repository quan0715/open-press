import type {
  QDocDocument,
  QDocReactPagination,
  QDocReactSourceBlock,
} from "./types";

export const QDOC_REACT_MDX_SOURCE_TYPE = "qdoc-react-mdx";
export const QDOC_BUILD_TIME_PAGINATION_MODE = "build-time-block-measurement";

export function isQDocReactMdxDocument(document: Pick<QDocDocument, "source"> | null | undefined) {
  return document?.source?.type === QDOC_REACT_MDX_SOURCE_TYPE;
}

export function hasQDocBuildTimePagination(document: Pick<QDocDocument, "source"> | null | undefined) {
  return getQDocReactPagination(document)?.mode === QDOC_BUILD_TIME_PAGINATION_MODE;
}

export function getQDocReactPagination(
  document: Pick<QDocDocument, "source"> | null | undefined,
): QDocReactPagination | null {
  if (!isQDocReactMdxDocument(document)) return null;
  const pagination = document?.source?.pagination;
  return pagination && typeof pagination.mode === "string" ? pagination : null;
}

export function getQDocReactBlockMap(
  document: Pick<QDocDocument, "source"> | null | undefined,
): Record<string, QDocReactSourceBlock> {
  if (!isQDocReactMdxDocument(document)) return {};
  const blockMap = document?.source?.blockMap;
  if (!blockMap || typeof blockMap !== "object") return {};
  return blockMap;
}

export function getQDocReactBlockSource(
  document: Pick<QDocDocument, "source"> | null | undefined,
  blockId: string | null | undefined,
): QDocReactSourceBlock | null {
  if (!blockId) return null;
  return getQDocReactBlockMap(document)[blockId] ?? null;
}
