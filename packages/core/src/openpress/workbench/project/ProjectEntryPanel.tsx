import { memo, useState, type CSSProperties } from "react";
import { Component as ComponentIcon, Images, Palette, type LucideIcon } from "lucide-react";
import type { BookmarkItem, BookmarkSubItem, MediaAssetItem } from "../../document-model";
import { projectSourceDirectoryPath, PROJECT_SOURCES } from "./projectSourceModel";
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

export const PROJECT_VISUAL_SYSTEM_KEY = "visual-system";
export const PROJECT_IMAGE_GALLERY_KEY = "image-gallery";
export const PROJECT_COMPONENT_LIBRARY_KEY = "component-library";

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

export function ProjectPreviewPanel({
  mediaAssets,
  componentUsages,
  selectedKey,
}: {
  mediaAssets: MediaAssetItem[];
  componentUsages: Map<string, ProjectComponentUsage>;
  selectedKey: string | null;
}) {
  if (!selectedKey || selectedKey === PROJECT_VISUAL_SYSTEM_KEY) {
    return <ProjectVisualSystem />;
  }

  if (selectedKey === PROJECT_IMAGE_GALLERY_KEY) {
    return <ProjectImageGallery mediaAssets={mediaAssets} />;
  }

  if (selectedKey === PROJECT_COMPONENT_LIBRARY_KEY) {
    return <ProjectComponentLibrary usages={componentUsages} />;
  }

  return <ProjectVisualSystem />;
}

function ProjectPanelButton({
  icon: Icon,
  label,
  meta,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  meta: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`bookmark-item bookmark-h2 openpress-project-entry${active ? " is-active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="bookmark-index openpress-project-entry-icon"><Icon aria-hidden="true" /></span>
      <span className="bookmark-title">
        <span>{label}</span>
        <small>{meta}</small>
      </span>
    </button>
  );
}

function ProjectVisualSystem() {
  return (
    <section className="openpress-project-preview-panel" aria-label="專案">
      <article className="openpress-project-visual-system" aria-label="Visual System">
        <ProjectSectionHeader title="Visual System" minimal />

        <div className="openpress-project-visual-grid">
          <section className="openpress-project-visual-card openpress-project-visual-card--typography" aria-label="Typography">
            <header>
              <span>Typography</span>
              <strong>閱讀層級</strong>
            </header>
            <div className="openpress-project-type-specimen">
              <p className="openpress-project-type-kicker">Course Notes</p>
              <h2>Data Structures</h2>
              <h3>Linked List 與 Tree Traversal</h3>
              <h4>Pointer / Node / Recursive Thinking</h4>
              <p>以 C/C++ 實作資料結構，整理概念、表示法與操作流程。</p>
              <code>struct Node *next = head;</code>
            </div>
          </section>

          <section className="openpress-project-visual-card" aria-label="Color Palette">
            <header>
              <span>Palette</span>
              <strong>色票配置</strong>
            </header>
            <div className="openpress-project-swatch-grid">
              {PROJECT_COLOR_SWATCHES.map((item) => (
                <div className="openpress-project-swatch" key={item.token}>
                  <span
                    className="openpress-project-swatch-chip"
                    style={{ "--openpress-project-swatch": `var(${item.token})` } as CSSProperties}
                    aria-hidden="true"
                  />
                  <strong>{item.label}</strong>
                  <code>{item.token.replace("--openpress-", "")}</code>
                </div>
              ))}
            </div>
          </section>

          <section className="openpress-project-visual-card openpress-project-visual-card--surfaces" aria-label="Surfaces">
            <header>
              <span>Surfaces</span>
              <strong>區塊背景</strong>
            </header>
            <div className="openpress-project-surface-preview">
              <div className="openpress-project-surface-paper">
                <span>Page paper</span>
              </div>
              <div className="openpress-project-surface-block">
                <span>Figure / Code block</span>
              </div>
            </div>
          </section>
        </div>
      </article>
    </section>
  );
}

function ProjectComponentLibrary({
  usages,
}: {
  usages: Map<string, ProjectComponentUsage>;
}) {
  const previewItems = createComponentPreviewItems(usages);
  return (
    <section className="openpress-project-preview-panel" aria-label="專案">
      <article className="openpress-project-component-viewer" aria-label={PROJECT_SOURCES.components.label}>
        <ProjectSectionHeader
          title="Rendered Components"
          description="文件目前實際渲染出的 component、圖表與示意圖狀態。"
          stats={[
            ["Kinds", String(usages.size)],
            ["Renders", String(previewItems.length)],
          ]}
        />
        {previewItems.length > 0 ? (
          <div className="openpress-project-component-list" aria-label="rendered content block list">
            {previewItems.map((item) => (
              <figure className="openpress-project-component-preview-row" key={`${item.name}-${item.index}`}>
                <figcaption>
                  <span>{item.name}</span>
                  <small>P{String(item.preview.pageIndex + 1).padStart(2, "0")}</small>
                </figcaption>
                <div
                  className="openpress-project-component-preview"
                  dangerouslySetInnerHTML={{ __html: item.preview.html }}
                />
              </figure>
            ))}
          </div>
        ) : (
          <p className="openpress-project-empty">目前文件尚未渲染任何內容區塊。</p>
        )}
      </article>
    </section>
  );
}

function ProjectImageGallery({
  mediaAssets,
}: {
  mediaAssets: MediaAssetItem[];
}) {
  const usedCount = mediaAssets.filter((item) => item.usageCount > 0).length;
  const unreferencedAssets = mediaAssets.filter((item) => item.usageCount === 0);
  const referencedAssets = mediaAssets.filter((item) => item.usageCount > 0);
  return (
    <section className="openpress-project-preview-panel" aria-label="專案">
      <article className="openpress-project-gallery-viewer" aria-label="Image Gallery">
        <ProjectSectionHeader
          title="Media Library"
          description={projectSourceDirectoryPath("media")}
          stats={[
            ["Files", String(mediaAssets.length)],
            ["Used", String(usedCount)],
          ]}
        />
        {mediaAssets.length > 0 ? (
          <div className="openpress-project-media-sections" aria-label="media gallery">
            <ProjectMediaSection title="未引用" assets={unreferencedAssets} />
            <ProjectMediaSection title="已引用" assets={referencedAssets} />
          </div>
        ) : (
          <p className="openpress-project-empty">{projectSourceDirectoryPath("media")} 尚未有可預覽素材。</p>
        )}
      </article>
    </section>
  );
}

function ProjectSectionHeader({
  title,
  description,
  stats,
  minimal = false,
}: {
  title: string;
  description?: string;
  stats?: Array<[string, string]>;
  minimal?: boolean;
}) {
  return (
    <header className={`openpress-project-section-header${minimal ? " openpress-project-section-header--minimal" : ""}`}>
      <div>
        <h2>{title}</h2>
        {description ? <span>{description}</span> : null}
      </div>
      {!minimal && stats?.length ? (
        <dl>
          {stats.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </header>
  );
}

function ProjectMediaSection({
  title,
  assets,
}: {
  title: string;
  assets: MediaAssetItem[];
}) {
  return (
    <section className="openpress-project-media-section" aria-label={title}>
      <header className="openpress-project-media-section-header">
        <h3>{title}</h3>
      </header>
      {assets.length > 0 ? (
        <div className="openpress-project-media-gallery">
          {assets.map((item) => (
            <figure className="openpress-project-media-card" data-unused={item.usageCount === 0 ? "true" : "false"} key={item.id}>
              <img src={item.src} alt="" loading="lazy" />
              <figcaption>
                <strong>{item.fileName}</strong>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="openpress-project-media-section-empty">沒有{title}圖片。</p>
      )}
    </section>
  );
}

function createComponentPreviewItems(usages: Map<string, ProjectComponentUsage>) {
  return Array.from(usages.entries())
    .flatMap(([name, usage]) => usage.previews.map((preview, index) => ({ name, preview, index })))
    .filter((item) => Boolean(item.preview.html))
    .sort((a, b) => {
      const pageDelta = a.preview.pageIndex - b.preview.pageIndex;
      return pageDelta || a.name.localeCompare(b.name, "zh-Hant") || a.index - b.index;
    });
}

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

const PROJECT_COLOR_SWATCHES = [
  { label: "Document", token: "--openpress-color-document" },
  { label: "Paper", token: "--openpress-color-paper" },
  { label: "Ink", token: "--openpress-color-ink" },
  { label: "Body", token: "--openpress-color-body" },
  { label: "Muted", token: "--openpress-color-muted" },
  { label: "Subtle", token: "--openpress-color-subtle" },
  { label: "Line", token: "--openpress-color-line" },
  { label: "Block", token: "--openpress-color-block" },
  { label: "Info", token: "--openpress-color-info" },
  { label: "Green", token: "--openpress-color-green" },
];
