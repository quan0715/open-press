import { useMemo } from "react";
import type {
  CaptionDirectoryItem,
  CaptionDirectoryKind,
  ReaderDocument,
} from "../document-model";

type CaptionDirectoryDocument = Pick<ReaderDocument, "indexes"> | null | undefined;

export function getCaptionDirectory(
  document: CaptionDirectoryDocument,
  kind: CaptionDirectoryKind,
): CaptionDirectoryItem[] {
  const captions = document?.indexes?.captions;
  if (!captions?.length) return [];
  return captions.filter((caption) => caption.kind === kind);
}

export function getFigureDirectory(document: CaptionDirectoryDocument) {
  return getCaptionDirectory(document, "figure");
}

export function getTableDirectory(document: CaptionDirectoryDocument) {
  return getCaptionDirectory(document, "table");
}

export function useFigureDirectory(document: CaptionDirectoryDocument) {
  const captions = document?.indexes?.captions;
  return useMemo(() => getFigureDirectory(document), [captions]);
}

export function useTableDirectory(document: CaptionDirectoryDocument) {
  const captions = document?.indexes?.captions;
  return useMemo(() => getTableDirectory(document), [captions]);
}
