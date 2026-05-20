import type { QDocBlockSource } from "./types";

export type QDocMediaAssetKind = "image" | "svg";

export interface QDocIndexedHtmlPage {
  id: string;
  html: string;
  title: string;
  pageNumber: number;
  anchors?: string[];
}

export interface QDocMediaAssetItem {
  id: string;
  kind: QDocMediaAssetKind;
  fileName: string;
  src: string;
  pageIndex: number;
  sourceTitle: string;
  usageCount: number;
  references: Array<{
    pageIndex: number;
    sourceTitle: string;
  }>;
}

export interface QDocContentSourceItem {
  id: string;
  file: string;
  path: string;
  kind?: string;
  chapter?: number;
  slug?: string;
  title: string;
  pageIndexes: number[];
  sectionCount: number;
}

export interface QDocBookmarkItem {
  id: string;
  title: string;
  label?: string;
  pageIndex: number;
  endPageIndex: number;
  subs: QDocBookmarkSubItem[];
}

export interface QDocBookmarkSubItem {
  id: string;
  title: string;
  label?: string;
  pageIndex: number;
  endPageIndex: number;
  subs: QDocBookmarkTopicItem[];
}

export interface QDocBookmarkTopicItem {
  id: string;
  title: string;
  label?: string;
  pageIndex: number;
  endPageIndex: number;
}

export function collectBookmarkIndex(pages: QDocIndexedHtmlPage[]): QDocBookmarkItem[] {
  const totalPages = pages.length;
  const chapters: QDocBookmarkItem[] = [];
  let currentChapter: QDocBookmarkItem | undefined;
  let currentSub: QDocBookmarkSubItem | undefined;
  let pendingChapterOpener: { pageIndex: number } | undefined;
  let tocAdded = false;

  pages.forEach((page) => {
    const html = parseHtmlPage(page.html);
    if (!html) return;
    const readerPage = html.querySelector<HTMLElement>(".reader-page");
    if (!readerPage) return;
    const pageIndex = page.pageNumber - 1;

    if (readerPage.classList.contains("toc")) {
      if (!tocAdded && readerPage.dataset.tocContinuation !== "true") {
        tocAdded = true;
        chapters.push({
          id: `toc-bookmark-${page.pageNumber}`,
          title: readerPage.dataset.pageTitle || readerPage.querySelector<HTMLElement>(".toc-heading, h2")?.textContent?.trim() || "目錄",
          label: "00",
          pageIndex,
          endPageIndex: totalPages - 1,
          subs: [],
        });
      }
      return;
    }

    if (readerPage.classList.contains("chapter-opener")) {
      pendingChapterOpener = { pageIndex };
      return;
    }

    if (!readerPage.classList.contains("report-page")) return;

    let pageStartedChapter = false;
    html.querySelectorAll("h2, h3, h4").forEach((heading, headingIndex) => {
      const id = bookmarkItemId(page, heading, headingIndex);
      if (heading.tagName === "H2") {
        const opener = pendingChapterOpener;
        pendingChapterOpener = undefined;
        pageStartedChapter = true;
        currentChapter = {
          id,
          title: normalizeChapterTitle(heading.textContent ?? ""),
          label: heading instanceof HTMLElement ? heading.dataset.chapter : undefined,
          pageIndex: opener?.pageIndex ?? pageIndex,
          endPageIndex: totalPages - 1,
          subs: [],
        };
        chapters.push(currentChapter);
        currentSub = undefined;
        return;
      }

      if (heading.tagName === "H3" && currentChapter) {
        currentSub = {
          id,
          title: normalizeSectionTitle(heading.textContent ?? ""),
          label: heading instanceof HTMLElement ? heading.dataset.section : undefined,
          pageIndex,
          endPageIndex: totalPages - 1,
          subs: [],
        };
        currentChapter.subs.push(currentSub);
        return;
      }

      if (heading.tagName === "H4" && currentSub) {
        currentSub.subs.push({
          id,
          title: normalizeTopicTitle(heading.textContent ?? ""),
          label: heading instanceof HTMLElement ? heading.dataset.topic : undefined,
          pageIndex,
          endPageIndex: totalPages - 1,
        });
      }
    });
    if (!pageStartedChapter) pendingChapterOpener = undefined;
  });

  // Back-fill endPageIndex: each item ends where the next sibling starts (exclusive)
  for (let i = 0; i < chapters.length; i++) {
    const nextChapterStart = chapters[i + 1]?.pageIndex ?? totalPages;
    chapters[i].endPageIndex = nextChapterStart - 1;

    const subs = chapters[i].subs;
    for (let j = 0; j < subs.length; j++) {
      const nextSubStart = subs[j + 1]?.pageIndex ?? nextChapterStart;
      subs[j].endPageIndex = Math.max(subs[j].pageIndex, nextSubStart - 1);

      const topics = subs[j].subs;
      for (let k = 0; k < topics.length; k++) {
        const nextTopicStart = topics[k + 1]?.pageIndex ?? nextSubStart;
        topics[k].endPageIndex = Math.max(topics[k].pageIndex, nextTopicStart - 1);
      }
    }
  }

  return chapters;
}

function bookmarkItemId(page: QDocIndexedHtmlPage, heading: Element, headingIndex: number) {
  const anchor = heading.id || page.anchors?.[0] || page.id;
  return `${anchor}-bookmark-${page.pageNumber}-${headingIndex + 1}`;
}

export function collectContentSourceIndex(
  pages: Array<QDocIndexedHtmlPage & { source?: QDocBlockSource }>,
): QDocContentSourceItem[] {
  const items = new Map<string, QDocContentSourceItem>();

  pages.forEach((page) => {
    const source = page.source;
    if (!source?.path) return;
    const existing = items.get(source.path);
    if (existing) {
      existing.pageIndexes.push(page.pageNumber - 1);
      existing.sectionCount += 1;
      return;
    }

    items.set(source.path, {
      id: `content-${items.size + 1}`,
      file: source.file,
      path: source.path,
      kind: source.kind,
      chapter: source.chapter,
      slug: source.slug,
      title: page.title,
      pageIndexes: [page.pageNumber - 1],
      sectionCount: 1,
    });
  });

  return Array.from(items.values()).sort((a, b) => a.path.localeCompare(b.path, "zh-Hant"));
}

export function collectMediaAssetIndex(pages: QDocIndexedHtmlPage[]): QDocMediaAssetItem[] {
  const assets = createMediaInventory();
  const imagePattern = /<(img|image)\b([^>]*)>/gi;

  pages.forEach((page) => {
    let match: RegExpExecArray | null;
    imagePattern.lastIndex = 0;
    while ((match = imagePattern.exec(page.html)) !== null) {
      const src = normalizeMediaAssetSrc(readHtmlAttribute(match[2], "src") ?? readHtmlAttribute(match[2], "href"));
      if (!src) continue;
      const existing = assets.get(src);
      if (existing) {
        existing.usageCount += 1;
        existing.pageIndex = existing.usageCount === 1 ? page.pageNumber - 1 : existing.pageIndex;
        existing.sourceTitle = existing.usageCount === 1 ? page.title : existing.sourceTitle;
        existing.references.push({
          pageIndex: page.pageNumber - 1,
          sourceTitle: page.title,
        });
        continue;
      }
      const fileName = safeDecodeURIComponent(src.split("/").pop() ?? src);
      assets.set(src, {
        id: `asset-${assets.size + 1}`,
        kind: fileName.toLowerCase().endsWith(".svg") ? "svg" : "image",
        fileName,
        src,
        pageIndex: page.pageNumber - 1,
        sourceTitle: page.title,
        usageCount: 1,
        references: [{
          pageIndex: page.pageNumber - 1,
          sourceTitle: page.title,
        }],
      });
    }
  });

  return Array.from(assets.values()).sort((a, b) => a.fileName.localeCompare(b.fileName, "zh-Hant"));
}

const workspaceMediaFiles = import.meta.glob<string>("@workspace/media/*", {
  eager: true,
  query: "?url",
  import: "default",
});

function createMediaInventory() {
  const assets = new Map<string, QDocMediaAssetItem>();

  Object.keys(workspaceMediaFiles).forEach((path) => {
    const fileName = safeDecodeURIComponent(path.split("/").pop() ?? path);
    const src = `/qdoc/media/${fileName}`;
    assets.set(src, {
      id: `asset-${assets.size + 1}`,
      kind: fileName.toLowerCase().endsWith(".svg") ? "svg" : "image",
      fileName,
      src,
      pageIndex: -1,
      sourceTitle: "未引用",
      usageCount: 0,
      references: [],
    });
  });

  return assets;
}

function parseHtmlPage(html: string) {
  if (typeof DOMParser === "undefined") return undefined;
  return new DOMParser().parseFromString(html, "text/html");
}

function normalizeChapterTitle(value: string) {
  return value
    .trim()
    .replace(/^[一二三四五六七八九十]+、\s*/, "");
}

function normalizeSectionTitle(value: string) {
  return value
    .trim()
    .replace(/^[（(][一二三四五六七八九十]+[)）]、?\s*/, "")
    .replace(/^\d+\.\d+\s+/, "");
}

function normalizeTopicTitle(value: string) {
  return value
    .trim()
    .replace(/^\d+\.\d+\.\d+\s+/, "");
}

function readHtmlAttribute(attributes: string, name: string) {
  const pattern = new RegExp(`\\b${name}=["']([^"']+)["']`, "i");
  return attributes.match(pattern)?.[1];
}

function normalizeMediaAssetSrc(value?: string) {
  if (!value) return undefined;
  if (value.startsWith("/qdoc/media/")) return value;
  if (value.startsWith("media/")) return `/qdoc/${value}`;
  if (value.startsWith("./media/")) return `/qdoc/${value.slice(2)}`;
  return undefined;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
