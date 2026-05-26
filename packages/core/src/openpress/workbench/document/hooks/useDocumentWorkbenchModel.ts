import { useMemo } from "react";
import {
  collectBookmarkIndex,
  collectMediaAssetIndex,
  createAnchorPageMap,
  getSourceBlockMap,
  type ReaderDocument,
} from "../../../document-model";
import type { DisplayPage } from "../../../reader";
import { groupSourceBlocksByPath } from "../../inspector";
import { createProjectComponentUsages, createProjectMentionItems } from "../../project";

export function useDocumentWorkbenchModel(document: ReaderDocument, pages: DisplayPage[]) {
  const mediaAssets = useMemo(() => collectMediaAssetIndex(pages), [pages]);
  const anchorPageMap = useMemo(() => createAnchorPageMap(pages), [pages]);
  const projectComponentUsages = useMemo(() => createProjectComponentUsages(pages), [pages]);
  const bookmarks = useMemo(() => collectBookmarkIndex(pages), [pages]);
  const sourceBlockMap = useMemo(() => getSourceBlockMap(document), [document]);
  const sourceBlocksByPath = useMemo(() => groupSourceBlocksByPath(sourceBlockMap), [sourceBlockMap]);
  const projectMentionItems = useMemo(
    () => createProjectMentionItems(mediaAssets, projectComponentUsages, bookmarks),
    [bookmarks, mediaAssets, projectComponentUsages],
  );

  return {
    mediaAssets,
    anchorPageMap,
    projectComponentUsages,
    bookmarks,
    sourceBlockMap,
    sourceBlocksByPath,
    projectMentionItems,
  };
}
