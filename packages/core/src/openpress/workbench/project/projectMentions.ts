import type { BookmarkItem, BookmarkSubItem, MediaAssetItem } from "../../document-model";
import type { DisplayPage } from "../../reader";
import type { ComposerMentionItem } from "../mentions";

export type ProjectMentionItem = ComposerMentionItem;

export function createProjectComponentUsageCounts(pages: DisplayPage[]): Map<string, number> {
  const usages = new Map<string, number>();
  pages.forEach((page) => {
    const html = String(page.html ?? "");
    for (const name of extractRenderedComponentNames(html)) {
      usages.set(name, (usages.get(name) ?? 0) + 1);
    }
  });
  return usages;
}

export function createProjectMentionItems(
  mediaAssets: MediaAssetItem[],
  componentUsageCounts: Map<string, number>,
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

  const componentItems: ProjectMentionItem[] = Array.from(componentUsageCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b, "zh-Hant"))
    .map(([name, count]) => ({
      trigger: "@",
      value: componentMention(name),
      label: name,
      meta: `component · ${count}`,
      kind: "component",
    }));

  return [...PROJECT_SKILL_MENTIONS, ...referenceItems, ...mediaItems, ...componentItems];
}

function extractRenderedComponentNames(html: string) {
  const names: string[] = [];
  const openTagPattern = /<(?:figure|section|article|div)\b[^>]*data-openpress-component="([^"]+)"[^>]*>/g;
  for (const match of html.matchAll(openTagPattern)) {
    names.push(match[1]);
  }
  return names;
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
