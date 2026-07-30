import { useMemo } from "react";
import {
  collectBookmarkIndex,
  collectMediaAssetIndex,
  createAnchorPageMap,
  getSourceBlockMap,
  type ReaderDocument,
} from "../../../document-model";
import type { DisplayPage } from "../../../reader";
import { useFigureDirectory, useTableDirectory } from "../../../navigation";
import { groupSourceBlocksByPath } from "../../inspector";
import { createProjectComponentUsageCounts, createProjectMentionItems } from "../../project";

export function useDocumentWorkbenchModel(document: ReaderDocument, pages: DisplayPage[]) {
  const mediaAssets = useMemo(() => collectMediaAssetIndex(pages), [pages]);
  const anchorPageMap = useMemo(() => createAnchorPageMap(pages), [pages]);
  const projectComponentUsageCounts = useMemo(() => createProjectComponentUsageCounts(pages), [pages]);
  const bookmarks = useMemo(() => collectBookmarkIndex(pages), [pages]);
  const figures = useFigureDirectory(document);
  const tables = useTableDirectory(document);
  const sourceBlockMap = useMemo(() => getSourceBlockMap(document), [document]);
  const sourceBlocksByPath = useMemo(() => groupSourceBlocksByPath(sourceBlockMap), [sourceBlockMap]);
  const projectMentionItems = useMemo(
    () => createProjectMentionItems(mediaAssets, projectComponentUsageCounts, bookmarks),
    [bookmarks, mediaAssets, projectComponentUsageCounts],
  );

  return {
    anchorPageMap,
    bookmarks,
    figures,
    sourceBlockMap,
    sourceBlocksByPath,
    projectMentionItems,
    tables,
  };
}
