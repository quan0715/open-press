import { memo, useState } from "react";
import { Component as ComponentIcon } from "lucide-react";
import type { BookmarkItem, BookmarkSubItem, MediaAssetItem } from "../../document-model";
import type { BlockSource } from "../../document-model";
import type { DisplayPage } from "../../reader";
import { Panel } from "../panels/Panel";
import { ProjectPreviewDialog } from "./ProjectPreviewDialog";
import {
  createProjectObjectEntityId,
  type ProjectMentionItem,
  type ProjectPanelPreview,
} from "./projectPreviewTypes";

export { createProjectObjectEntityId } from "./projectPreviewTypes";
export type { ProjectMentionItem, ProjectPanelPreview } from "./projectPreviewTypes";

export type ProjectComponentUsage = {
  count: number;
  pageIndexes: number[];
  html: string;
  previews: ProjectComponentPreview[];
};

export type ProjectComponentPreview = {
  name: string;
  html: string;
  pageIndex: number;
};

export function createProjectComponentUsages(pages: DisplayPage[]): Map<string, ProjectComponentUsage> {
  const usages = new Map<string, ProjectComponentUsage>();
  pages.forEach((page) => {
    const html = String(page.html ?? "");
    const pageIndex = page.pageNumber - 1;
    for (const block of extractRenderedComponentBlocks(html)) {
      const current = usages.get(block.name) ?? { count: 0, pageIndexes: [], html: block.html, previews: [] };
      current.count += 1;
      if (!current.html) current.html = block.html;
      if (!current.pageIndexes.includes(pageIndex)) current.pageIndexes.push(pageIndex);
      current.previews.push({ name: block.name, html: block.html, pageIndex });
      usages.set(block.name, current);
    }
  });
  return usages;
}

export function createProjectMentionItems(
  mediaAssets: MediaAssetItem[],
  componentUsages: Map<string, ProjectComponentUsage>,
  bookmarks: BookmarkItem[] = [],
): ProjectMentionItem[] {
  const referenceItems = createBookmarkMentionItems(bookmarks);

  const mediaItems: ProjectMentionItem[] = mediaAssets.map((item) => ({
    trigger: "@",
    value: mediaMention(item.fileName),
    label: item.fileName,
    meta: item.usageCount > 0 ? `media · P${String(item.pageIndex + 1).padStart(2, "0")}` : "media · unused",
    kind: "media",
  }));

  const componentItems: ProjectMentionItem[] = Array.from(componentUsages.entries())
    .sort(([a], [b]) => a.localeCompare(b, "zh-Hant"))
    .map(([name, usage]) => ({
      trigger: "@",
      value: componentMention(name),
      label: name,
      meta: `component · ${usage.count}`,
      kind: "component",
    }));

  return [...PROJECT_SKILL_MENTIONS, ...referenceItems, ...mediaItems, ...componentItems];
}

function ProjectEntryPanelImpl({
  mediaAssets,
  componentUsages,
  mentionItems,
  currentSource,
  onCommentSubmitted,
}: {
  mediaAssets: MediaAssetItem[];
  componentUsages: Map<string, ProjectComponentUsage>;
  mentionItems: ProjectMentionItem[];
  currentSource: BlockSource | undefined;
  onCommentSubmitted?: () => void | Promise<void>;
}) {
  const [preview, setPreview] = useState<ProjectPanelPreview | null>(null);
  const componentItems = Array.from(componentUsages.entries())
    .sort(([a], [b]) => a.localeCompare(b, "zh-Hant"))
    .slice(0, 8);
  const mediaItems = mediaAssets
    .slice(0, 10)
    .map((item) => ({
      fileName: item.fileName,
      src: item.src,
      mention: mediaMention(item.fileName),
      meta: item.usageCount > 0 ? `P${String(item.pageIndex + 1).padStart(2, "0")}` : "unused",
    }));

  return (
    <Panel className="openpress-project-panel openpress-panel--compact" aria-label="Project tools">
      <Panel.Section className="openpress-project-tool-block" aria-label="媒體素材">
        <Panel.SectionTitle>Media</Panel.SectionTitle>
        {mediaItems.length > 0 ? (
          <div className="openpress-project-asset-list">
            {mediaItems.map((item) => (
              <button
                type="button"
                className="openpress-project-asset"
                data-openpress-object-id={createProjectObjectEntityId("media", item.fileName)}
                key={`${item.src}-${item.fileName}`}
                onClick={() => setPreview({ kind: "media", title: item.fileName, src: item.src })}
              >
                <span className="openpress-project-asset-thumb">
                  <img src={item.src} alt="" loading="lazy" />
                </span>
                <span className="openpress-project-asset-body">
                  <strong>{item.fileName}</strong>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Panel.Empty>尚無圖片</Panel.Empty>
        )}
      </Panel.Section>

      <Panel.Section className="openpress-project-tool-block" aria-label="Components">
        <Panel.SectionTitle>Components</Panel.SectionTitle>
        {componentItems.length > 0 ? (
          <div className="openpress-project-component-mention-list">
            {componentItems.map(([name, usage]) => (
              <button
                type="button"
                data-openpress-object-id={createProjectObjectEntityId("component", name)}
                key={name}
                onClick={() => setPreview({ kind: "component", title: name, html: usage.html })}
              >
                <ComponentIcon aria-hidden="true" />
                <span>
                  <strong>{name}</strong>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Panel.Empty>尚無 component</Panel.Empty>
        )}
      </Panel.Section>
      {preview ? (
        <ProjectPreviewDialog
          key={`${preview.kind}-${preview.title}`}
          preview={preview}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </Panel>
  );
}

export const ProjectEntryPanel = memo(ProjectEntryPanelImpl);
ProjectEntryPanel.displayName = "ProjectEntryPanel";

function extractRenderedComponentBlocks(html: string) {
  const blocks: Array<{ name: string; html: string }> = [];
  const openTagPattern = /<(figure|section|article|div)\b[^>]*data-openpress-component="([^"]+)"[^>]*>/g;
  for (const match of html.matchAll(openTagPattern)) {
    const tagName = match[1];
    const componentName = match[2];
    const start = match.index ?? 0;
    const end = findClosingTagEnd(html, tagName, start + match[0].length);
    blocks.push({
      name: componentName,
      html: end > start ? html.slice(start, end) : match[0],
    });
  }
  return blocks;
}

function findClosingTagEnd(html: string, tagName: string, fromIndex: number) {
  const tagPattern = new RegExp(`</?${tagName}\\b[^>]*>`, "gi");
  tagPattern.lastIndex = fromIndex;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(html))) {
    if (match[0].startsWith("</")) {
      depth -= 1;
    } else if (!match[0].endsWith("/>")) {
      depth += 1;
    }
    if (depth === 0) return tagPattern.lastIndex;
  }
  return -1;
}

function mediaMention(fileName: string) {
  return `@media/${fileName}`;
}

function componentMention(name: string) {
  return `@component/${name}`;
}

function createBookmarkMentionItems(bookmarks: BookmarkItem[]): ProjectMentionItem[] {
  return bookmarks
    .filter((item) => item.label !== "00")
    .flatMap((chapter) => [
      bookmarkMentionItem("chapter", chapter),
      ...chapter.subs.map((section) => bookmarkMentionItem("section", section)),
    ]);
}

function bookmarkMentionItem(kind: "chapter" | "section", item: BookmarkItem | BookmarkSubItem): ProjectMentionItem {
  const label = item.label ? `${item.label} ` : "";
  return {
    trigger: "@",
    value: `@${kind}/${bookmarkMentionSlug(item)}`,
    label: `${label}${item.title}`,
    meta: `${kind === "chapter" ? "chapter" : "section"} · P${String(item.pageIndex + 1).padStart(2, "0")}`,
    kind,
  };
}

function bookmarkMentionSlug(item: BookmarkItem | BookmarkSubItem) {
  const parts = [item.label, item.title]
    .filter(Boolean)
    .map((part) => mentionSlugPart(String(part)));
  return parts.filter(Boolean).join("-") || item.id;
}

function mentionSlugPart(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}


const PROJECT_SKILL_MENTIONS: ProjectMentionItem[] = [
  { trigger: "/", value: "/insert-image", label: "insert-image", meta: "skill", kind: "skill" },
  { trigger: "/", value: "/redraw-figure", label: "redraw-figure", meta: "skill", kind: "skill" },
  { trigger: "/", value: "/rewrite-section", label: "rewrite-section", meta: "skill", kind: "skill" },
  { trigger: "/", value: "/apply-comments", label: "apply-comments", meta: "skill", kind: "skill" },
  { trigger: "/", value: "/apply-style", label: "apply-style", meta: "skill", kind: "skill" },
  { trigger: "/", value: "/fix-code", label: "fix-code", meta: "skill", kind: "skill" },
];
