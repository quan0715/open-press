import type { ComponentProps } from "react";
import { BookOpen, Component as ComponentIcon, FileText, Images, List, type LucideIcon } from "lucide-react";
import type { QDocContentSourceItem, QDocMediaAssetItem } from "./indexes";
import { projectSourceDirectoryPath, QDOC_PROJECT_SOURCES } from "./projectSources";
import type { QDocDisplayPage } from "./workbenchTypes";

const markdownSources = import.meta.glob<string>("@workspace/content/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});
const projectDataSources = import.meta.glob<string>("@workspace/components/**/data*.json", {
  eager: true,
  query: "?raw",
  import: "default",
});
const projectComponentRenderers = import.meta.glob<string>("@workspace/components/**/component.mjs", {
  eager: true,
  query: "?raw",
  import: "default",
});
const projectComponentStyles = import.meta.glob<string>("@workspace/components/**/style.css", {
  eager: true,
  query: "?raw",
  import: "default",
});
const projectComponentSchemas = import.meta.glob<string>("@workspace/components/**/schema.json", {
  eager: true,
  query: "?raw",
  import: "default",
});
const projectComponentReadmes = import.meta.glob<string>("@workspace/components/**/README.md", {
  eager: true,
  query: "?raw",
  import: "default",
});
export const QDOC_PROJECT_IMAGE_GALLERY_KEY = "image-gallery";
export const QDOC_PROJECT_COMPONENT_LIBRARY_KEY = "component-library";

export type QDocProjectSourceEntry = QDocContentSourceItem & {
  markdown: string;
  lineCount: number;
};

export type QDocProjectComponentEntry = {
  id: string;
  name: string;
  directory: string;
  rendererPath: string | null;
  stylePath: string | null;
  schemaPath: string | null;
  readmePath: string | null;
};

export type QDocProjectComponentUsage = {
  count: number;
  pageIndexes: number[];
  html: string;
};

export function createProjectMarkdownEntries(contentItems: QDocContentSourceItem[]): QDocProjectSourceEntry[] {
  return contentItems.map((item) => {
    const markdown = resolveMarkdownSource(item.path);
    return {
      ...item,
      markdown,
      lineCount: countMarkdownLines(markdown),
    };
  });
}

export function createProjectComponentEntries(): QDocProjectComponentEntry[] {
  const names = new Set<string>();
  [
    projectDataSources,
    projectComponentRenderers,
    projectComponentStyles,
    projectComponentSchemas,
    projectComponentReadmes,
  ].forEach((sources) => {
    Object.keys(sources).forEach((path) => {
      const name = componentNameFromPath(path);
      if (name) names.add(name);
    });
  });

  return Array.from(names)
    .sort((a, b) => a.localeCompare(b, "zh-Hant"))
    .map((name, index) => createProjectComponentEntry(name, index));
}

export function createProjectComponentUsages(pages: QDocDisplayPage[]): Map<string, QDocProjectComponentUsage> {
  const usages = new Map<string, QDocProjectComponentUsage>();
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

export function QDocProjectEntryPanel({
  entries,
  mediaAssets,
  componentEntries,
  selectedKey,
  onSelectKey,
}: {
  entries: QDocProjectSourceEntry[];
  mediaAssets: QDocMediaAssetItem[];
  componentEntries: QDocProjectComponentEntry[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
}) {
  return (
    <section className="qdoc-project-panel qdoc-panel-section" aria-label="Project entries">
      {entries.length > 0 || mediaAssets.length > 0 || componentEntries.length > 0 ? (
        <nav className="reader-bookmarks qdoc-project-bookmarks qdoc-project-entry-list" aria-label="Project files">
          <div className="reader-bookmarks-rail" aria-hidden="true" />
          <div className="bookmark-group is-open qdoc-project-entry-group">
            <button
              type="button"
              className={`bookmark-item bookmark-h2 qdoc-project-entry qdoc-project-entry--gallery${selectedKey === QDOC_PROJECT_IMAGE_GALLERY_KEY ? " is-active" : ""}`}
              aria-pressed={selectedKey === QDOC_PROJECT_IMAGE_GALLERY_KEY}
              onClick={() => onSelectKey(QDOC_PROJECT_IMAGE_GALLERY_KEY)}
            >
              <span className="bookmark-index qdoc-project-entry-icon"><Images aria-hidden="true" /></span>
              <span className="bookmark-title">{QDOC_PROJECT_SOURCES.media.label}</span>
            </button>
            {componentEntries.length > 0 ? (
              <button
                type="button"
                className={`bookmark-item bookmark-h2 qdoc-project-entry qdoc-project-entry--components${selectedKey === QDOC_PROJECT_COMPONENT_LIBRARY_KEY ? " is-active" : ""}`}
                aria-pressed={selectedKey === QDOC_PROJECT_COMPONENT_LIBRARY_KEY}
                onClick={() => onSelectKey(QDOC_PROJECT_COMPONENT_LIBRARY_KEY)}
              >
                <span className="bookmark-index qdoc-project-entry-icon"><ComponentIcon aria-hidden="true" /></span>
                <span className="bookmark-title">{QDOC_PROJECT_SOURCES.components.label}</span>
              </button>
            ) : null}
          </div>
          {entries.map((item) => (
            <button
              type="button"
              className={`bookmark-item bookmark-h2 qdoc-project-entry${item.path === selectedKey ? " is-active" : ""}`}
              aria-pressed={item.path === selectedKey}
              onClick={() => onSelectKey(item.path)}
              key={item.id}
            >
              <span className="bookmark-index qdoc-project-entry-icon">
                <ProjectKindIcon kind={item.kind} aria-hidden="true" />
              </span>
              <span className="bookmark-title">{item.file}</span>
            </button>
          ))}
        </nav>
      ) : (
        <p className="qdoc-project-empty">{projectSourceDirectoryPath("content")} 尚未有可預覽內容。</p>
      )}
    </section>
  );
}

export function QDocProjectWorkspace({
  entry,
  mediaAssets,
  componentEntries,
  componentUsages,
  selectedKey,
}: {
  entry: QDocProjectSourceEntry | undefined;
  mediaAssets: QDocMediaAssetItem[];
  componentEntries: QDocProjectComponentEntry[];
  componentUsages: Map<string, QDocProjectComponentUsage>;
  selectedKey: string | null;
}) {
  if (selectedKey === QDOC_PROJECT_IMAGE_GALLERY_KEY) {
    return <QDocProjectImageGallery mediaAssets={mediaAssets} />;
  }

  if (selectedKey === QDOC_PROJECT_COMPONENT_LIBRARY_KEY) {
    return <QDocProjectComponentLibrary entries={componentEntries} usages={componentUsages} />;
  }

  return (
    <section className="qdoc-project-workspace" aria-label="專案">
      {entry ? (
        <article className="qdoc-project-markdown-viewer" aria-label="Markdown content">
          <header className="qdoc-project-markdown-header">
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
          <pre className="qdoc-project-markdown-source" tabIndex={0}>
            <code>{entry.markdown || "Markdown source is empty."}</code>
          </pre>
        </article>
      ) : (
        <p className="qdoc-project-empty">{projectSourceDirectoryPath("content")} 尚未有可預覽內容。</p>
      )}
    </section>
  );
}

function QDocProjectComponentLibrary({
  entries,
  usages,
}: {
  entries: QDocProjectComponentEntry[];
  usages: Map<string, QDocProjectComponentUsage>;
}) {
  const previewItems = createComponentPreviewItems(entries, usages);
  return (
    <section className="qdoc-project-workspace" aria-label="專案">
      <article className="qdoc-project-component-viewer" aria-label={QDOC_PROJECT_SOURCES.components.label}>
        <header className="qdoc-project-markdown-header qdoc-project-component-list-header">
          <h2>{QDOC_PROJECT_SOURCES.components.label}</h2>
        </header>
        {previewItems.length > 0 ? (
          <div className="qdoc-project-component-list" aria-label="rendered content block list">
            {previewItems.map((item) => (
              <figure className="qdoc-project-component-preview-row" key={item.name}>
                <div
                  className="qdoc-project-component-preview"
                  dangerouslySetInnerHTML={{ __html: item.usage.html }}
                />
              </figure>
            ))}
          </div>
        ) : (
          <p className="qdoc-project-empty">目前文件尚未渲染任何內容區塊。</p>
        )}
      </article>
    </section>
  );
}

function QDocProjectImageGallery({
  mediaAssets,
}: {
  mediaAssets: QDocMediaAssetItem[];
}) {
  const usedCount = mediaAssets.filter((item) => item.usageCount > 0).length;
  const unreferencedAssets = mediaAssets.filter((item) => item.usageCount === 0);
  const referencedAssets = mediaAssets.filter((item) => item.usageCount > 0);
  return (
    <section className="qdoc-project-workspace" aria-label="專案">
      <article className="qdoc-project-gallery-viewer" aria-label="Image Gallery">
        <header className="qdoc-project-markdown-header">
          <h2>{QDOC_PROJECT_SOURCES.media.label}</h2>
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
          <div className="qdoc-project-media-sections" aria-label="media gallery">
            <QDocProjectMediaSection title="未引用" assets={unreferencedAssets} />
            <QDocProjectMediaSection title="已引用" assets={referencedAssets} />
          </div>
        ) : (
          <p className="qdoc-project-empty">{projectSourceDirectoryPath("media")} 尚未有可預覽素材。</p>
        )}
      </article>
    </section>
  );
}

function QDocProjectMediaSection({
  title,
  assets,
}: {
  title: string;
  assets: QDocMediaAssetItem[];
}) {
  return (
    <section className="qdoc-project-media-section" aria-label={title}>
      <header className="qdoc-project-media-section-header">
        <h3>{title}</h3>
      </header>
      {assets.length > 0 ? (
        <div className="qdoc-project-media-gallery">
          {assets.map((item) => (
            <figure className="qdoc-project-media-card" data-unused={item.usageCount === 0 ? "true" : "false"} key={item.id}>
              <img src={item.src} alt="" loading="lazy" />
              <figcaption>
                <strong>{item.fileName}</strong>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="qdoc-project-media-section-empty">沒有{title}圖片。</p>
      )}
    </section>
  );
}

function createComponentPreviewItems(
  entries: QDocProjectComponentEntry[],
  usages: Map<string, QDocProjectComponentUsage>,
) {
  const entryNames = new Set(entries.map((entry) => entry.name));
  const knownItems = entries
    .map((entry) => {
      const usage = usages.get(entry.name);
      return usage && usage.html ? { name: entry.name, usage } : null;
    })
    .filter((item): item is { name: string; usage: QDocProjectComponentUsage } => Boolean(item));
  const unknownItems = Array.from(usages.entries())
    .filter(([name, usage]) => !entryNames.has(name) && Boolean(usage.html))
    .map(([name, usage]) => ({ name, usage }));

  return [...knownItems, ...unknownItems].sort((a, b) => {
    const pageDelta = (a.usage.pageIndexes[0] ?? 0) - (b.usage.pageIndexes[0] ?? 0);
    return pageDelta || a.name.localeCompare(b.name, "zh-Hant");
  });
}

function extractRenderedComponentBlocks(html: string) {
  const blocks: Array<{ name: string; html: string }> = [];
  const openTagPattern = /<(figure|section|article|div)\b[^>]*data-qdoc-component="([^"]+)"[^>]*>/g;
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

function stripWorkspaceAlias(rawPath: string) {
  // Vite returns either the aliased path (e.g. `@workspace/components/...`)
  // or a workspace-relative one (`../../document/components/...`). Normalize
  // both to a path that starts from the workspace root.
  const normalizedPath = rawPath.replace(/\\/g, "/");
  const aliasMatch = normalizedPath.match(/@workspace\/components\/.*/);
  if (aliasMatch) {
    return `${__QDOC_COMPONENTS_PATH__}/${aliasMatch[0].replace("@workspace/components/", "")}`;
  }
  const componentsPath = `${__QDOC_COMPONENTS_PATH__}/`;
  const workspacePathIndex = normalizedPath.indexOf(componentsPath);
  if (workspacePathIndex >= 0) return normalizedPath.slice(workspacePathIndex);
  return normalizedPath.replace(/^\.\.\/\.\.\//, "");
}

function componentNameFromPath(path: string) {
  const workspacePath = stripWorkspaceAlias(path);
  const prefix = `${__QDOC_COMPONENTS_PATH__}/`;
  const relative = workspacePath.startsWith(prefix) ? workspacePath.slice(prefix.length) : workspacePath;
  return relative.split("/")[0] || "";
}

function createProjectComponentEntry(name: string, index: number): QDocProjectComponentEntry {
  const rendererPath = findComponentWorkspacePath(name, projectComponentRenderers);
  const stylePath = findComponentWorkspacePath(name, projectComponentStyles);
  const schemaPath = findComponentWorkspacePath(name, projectComponentSchemas);
  const readmePath = findComponentWorkspacePath(name, projectComponentReadmes);
  return {
    id: `component-${index + 1}`,
    name,
    directory: `${__QDOC_COMPONENTS_PATH__}/${name}`,
    rendererPath,
    stylePath,
    schemaPath,
    readmePath,
  };
}

function findComponentWorkspacePath(name: string, sources: Record<string, string>) {
  const path = Object.keys(sources).find((sourcePath) => componentNameFromPath(sourcePath) === name);
  return path ? stripWorkspaceAlias(path) : null;
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
