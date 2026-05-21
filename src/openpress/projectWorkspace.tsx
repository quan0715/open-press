import type { ComponentProps } from "react";
import { BookOpen, Component as ComponentIcon, FileText, Images, List, type LucideIcon } from "lucide-react";
import type { ContentSourceItem, MediaAssetItem } from "./indexes";
import { projectSourceDirectoryPath, PROJECT_SOURCES } from "./projectSources";
import type { DisplayPage } from "./workbenchTypes";

const markdownSources = import.meta.glob<string>("@workspace/content/**/content/*.mdx", {
  eager: true,
  query: "?raw",
  import: "default",
});
export const PROJECT_IMAGE_GALLERY_KEY = "image-gallery";
export const PROJECT_COMPONENT_LIBRARY_KEY = "component-library";

export type ProjectSourceEntry = ContentSourceItem & {
  markdown: string;
  lineCount: number;
};

export type ProjectComponentUsage = {
  count: number;
  pageIndexes: number[];
  html: string;
};

export function createProjectMarkdownEntries(contentItems: ContentSourceItem[]): ProjectSourceEntry[] {
  return contentItems.map((item) => {
    const markdown = resolveMarkdownSource(item.path);
    return {
      ...item,
      markdown,
      lineCount: countMarkdownLines(markdown),
    };
  });
}

export function createProjectComponentUsages(pages: DisplayPage[]): Map<string, ProjectComponentUsage> {
  const usages = new Map<string, ProjectComponentUsage>();
  pages.forEach((page) => {
    const html = String(page.html ?? "");
    for (const block of extractRenderedComponentBlocks(html)) {
      const current = usages.get(block.name) ?? { count: 0, pageIndexes: [], html: block.html };
      current.count += 1;
      if (!current.html) current.html = block.html;
      const pageIndex = page.pageNumber - 1;
      if (!current.pageIndexes.includes(pageIndex)) current.pageIndexes.push(pageIndex);
      usages.set(block.name, current);
    }
  });
  return usages;
}

export function ProjectEntryPanel({
  entries,
  mediaAssets,
  componentCount,
  selectedKey,
  onSelectKey,
}: {
  entries: ProjectSourceEntry[];
  mediaAssets: MediaAssetItem[];
  componentCount: number;
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
}) {
  return (
    <section className="openpress-project-panel openpress-panel-section" aria-label="Project entries">
      {entries.length > 0 || mediaAssets.length > 0 || componentCount > 0 ? (
        <nav className="reader-bookmarks openpress-project-bookmarks openpress-project-entry-list" aria-label="Project files">
          <div className="reader-bookmarks-rail" aria-hidden="true" />
          <div className="bookmark-group is-open openpress-project-entry-group">
            <button
              type="button"
              className={`bookmark-item bookmark-h2 openpress-project-entry openpress-project-entry--gallery${selectedKey === PROJECT_IMAGE_GALLERY_KEY ? " is-active" : ""}`}
              aria-pressed={selectedKey === PROJECT_IMAGE_GALLERY_KEY}
              onClick={() => onSelectKey(PROJECT_IMAGE_GALLERY_KEY)}
            >
              <span className="bookmark-index openpress-project-entry-icon"><Images aria-hidden="true" /></span>
              <span className="bookmark-title">{PROJECT_SOURCES.media.label}</span>
            </button>
            {componentCount > 0 ? (
              <button
                type="button"
                className={`bookmark-item bookmark-h2 openpress-project-entry openpress-project-entry--components${selectedKey === PROJECT_COMPONENT_LIBRARY_KEY ? " is-active" : ""}`}
                aria-pressed={selectedKey === PROJECT_COMPONENT_LIBRARY_KEY}
                onClick={() => onSelectKey(PROJECT_COMPONENT_LIBRARY_KEY)}
              >
                <span className="bookmark-index openpress-project-entry-icon"><ComponentIcon aria-hidden="true" /></span>
                <span className="bookmark-title">{PROJECT_SOURCES.components.label}</span>
              </button>
            ) : null}
          </div>
          {entries.map((item) => (
            <button
              type="button"
              className={`bookmark-item bookmark-h2 openpress-project-entry${item.path === selectedKey ? " is-active" : ""}`}
              aria-pressed={item.path === selectedKey}
              onClick={() => onSelectKey(item.path)}
              key={item.id}
            >
              <span className="bookmark-index openpress-project-entry-icon">
                <ProjectKindIcon kind={item.kind} aria-hidden="true" />
              </span>
              <span className="bookmark-title">{item.file}</span>
            </button>
          ))}
        </nav>
      ) : (
        <p className="openpress-project-empty">{projectSourceDirectoryPath("content")} 尚未有可預覽內容。</p>
      )}
    </section>
  );
}

export function ProjectWorkspace({
  entry,
  mediaAssets,
  componentUsages,
  selectedKey,
}: {
  entry: ProjectSourceEntry | undefined;
  mediaAssets: MediaAssetItem[];
  componentUsages: Map<string, ProjectComponentUsage>;
  selectedKey: string | null;
}) {
  if (selectedKey === PROJECT_IMAGE_GALLERY_KEY) {
    return <ProjectImageGallery mediaAssets={mediaAssets} />;
  }

  if (selectedKey === PROJECT_COMPONENT_LIBRARY_KEY) {
    return <ProjectComponentLibrary usages={componentUsages} />;
  }

  return (
    <section className="openpress-project-workspace" aria-label="專案">
      {entry ? (
        <article className="openpress-project-markdown-viewer" aria-label="MDX content">
          <header className="openpress-project-markdown-header">
            <h2>{entry.file}</h2>
            <p>{entry.path}</p>
            <dl>
              <div>
                <dt>Pages</dt>
                <dd>{formatPageList(entry.pageIndexes)}</dd>
              </div>
              <div>
                <dt>Lines</dt>
                <dd>{entry.lineCount}</dd>
              </div>
            </dl>
          </header>
          <pre className="openpress-project-markdown-source" tabIndex={0}>
            <code>{entry.markdown || "MDX source is empty."}</code>
          </pre>
        </article>
      ) : (
        <p className="openpress-project-empty">{projectSourceDirectoryPath("content")} 尚未有可預覽內容。</p>
      )}
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
    <section className="openpress-project-workspace" aria-label="專案">
      <article className="openpress-project-component-viewer" aria-label={PROJECT_SOURCES.components.label}>
        <header className="openpress-project-markdown-header openpress-project-component-list-header">
          <h2>{PROJECT_SOURCES.components.label}</h2>
        </header>
        {previewItems.length > 0 ? (
          <div className="openpress-project-component-list" aria-label="rendered content block list">
            {previewItems.map((item) => (
              <figure className="openpress-project-component-preview-row" key={item.name}>
                <div
                  className="openpress-project-component-preview"
                  dangerouslySetInnerHTML={{ __html: item.usage.html }}
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
    <section className="openpress-project-workspace" aria-label="專案">
      <article className="openpress-project-gallery-viewer" aria-label="Image Gallery">
        <header className="openpress-project-markdown-header">
          <h2>{PROJECT_SOURCES.media.label}</h2>
          <p>{projectSourceDirectoryPath("media")}</p>
          <dl>
            <div>
              <dt>Files</dt>
              <dd>{mediaAssets.length}</dd>
            </div>
            <div>
              <dt>Used</dt>
              <dd>{usedCount}</dd>
            </div>
          </dl>
        </header>
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
    .filter(([, usage]) => Boolean(usage.html))
    .map(([name, usage]) => ({ name, usage }))
    .sort((a, b) => {
      const pageDelta = (a.usage.pageIndexes[0] ?? 0) - (b.usage.pageIndexes[0] ?? 0);
      return pageDelta || a.name.localeCompare(b.name, "zh-Hant");
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

function resolveMarkdownSource(path: string) {
  // Match by basename so that the lookup works regardless of whether Vite
  // returns the aliased path (`@workspace/content/...`) or a fully-resolved
  // absolute one for the glob keys.
  const fileName = path.split("/").pop();
  if (!fileName) return "";
  for (const [key, value] of Object.entries(markdownSources)) {
    if (key.endsWith(`/${fileName}`)) return value;
  }
  return "";
}

function countMarkdownLines(markdown: string) {
  if (!markdown) return 0;
  return markdown.split(/\r\n|\r|\n/).length;
}

function ProjectKindIcon({ kind, ...props }: { kind?: string } & ComponentProps<LucideIcon>) {
  const Icon = projectKindIcon(kind);
  return <Icon {...props} />;
}

function projectKindIcon(kind: string | undefined): LucideIcon {
  if (kind === "cover" || kind === "back-cover") return BookOpen;
  if (kind === "toc") return List;
  return FileText;
}

function formatPageList(pageIndexes: number[]) {
  if (pageIndexes.length === 0) return "None";
  return pageIndexes.map((pageIndex) => `P${String(pageIndex + 1).padStart(2, "0")}`).join(", ");
}
