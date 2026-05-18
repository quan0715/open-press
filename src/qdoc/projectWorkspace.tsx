import type { ComponentProps } from "react";
import { BookOpen, Database, FileJson, FileText, Images, List, type LucideIcon } from "lucide-react";
import type { QDocContentSourceItem, QDocMediaAssetItem } from "./indexes";
import { inferChartType, renderChartFigure, type QDocChartType } from "./chartRenderer.js";
import { projectSourceDirectoryPath, QDOC_PROJECT_SOURCES } from "./projectSources";

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
export const QDOC_PROJECT_IMAGE_GALLERY_KEY = "image-gallery";
export const QDOC_PROJECT_DATA_LIBRARY_KEY = "data-library";

export type QDocProjectSourceEntry = QDocContentSourceItem & {
  markdown: string;
  lineCount: number;
};

export type QDocProjectDataEntry = {
  id: string;
  path: string;
  file: string;
  directory: string;
  raw: string;
  title: string;
  caption: string | null;
  chartType: QDocChartType | null;
  variant: string;
  chartHtml: string;
  itemCount: number | null;
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

export function createProjectDataEntries(): QDocProjectDataEntry[] {
  return Object.entries(projectDataSources)
    .map(([path, raw], index) => createProjectDataEntry(path, raw, index))
    .sort((a, b) => a.path.localeCompare(b.path, "zh-Hant"));
}

export function QDocProjectEntryPanel({
  entries,
  mediaAssets,
  dataEntries,
  selectedKey,
  onSelectKey,
}: {
  entries: QDocProjectSourceEntry[];
  mediaAssets: QDocMediaAssetItem[];
  dataEntries: QDocProjectDataEntry[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
}) {
  return (
    <section className="qdoc-project-panel qdoc-panel-section" aria-label="Project entries">
      {entries.length > 0 || mediaAssets.length > 0 || dataEntries.length > 0 ? (
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
            {dataEntries.length > 0 ? (
              <button
                type="button"
                className={`bookmark-item bookmark-h2 qdoc-project-entry qdoc-project-entry--data${selectedKey === QDOC_PROJECT_DATA_LIBRARY_KEY ? " is-active" : ""}`}
                aria-pressed={selectedKey === QDOC_PROJECT_DATA_LIBRARY_KEY}
                onClick={() => onSelectKey(QDOC_PROJECT_DATA_LIBRARY_KEY)}
              >
                <span className="bookmark-index qdoc-project-entry-icon"><Database aria-hidden="true" /></span>
                <span className="bookmark-title">{QDOC_PROJECT_SOURCES.data.label}</span>
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
  dataEntries,
  selectedKey,
}: {
  entry: QDocProjectSourceEntry | undefined;
  mediaAssets: QDocMediaAssetItem[];
  dataEntries: QDocProjectDataEntry[];
  selectedKey: string | null;
}) {
  if (selectedKey === QDOC_PROJECT_IMAGE_GALLERY_KEY) {
    return <QDocProjectImageGallery mediaAssets={mediaAssets} />;
  }

  if (selectedKey === QDOC_PROJECT_DATA_LIBRARY_KEY) {
    return <QDocProjectDataLibrary entries={dataEntries} />;
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

function QDocProjectDataLibrary({
  entries,
}: {
  entries: QDocProjectDataEntry[];
}) {
  const totalItems = entries.reduce((sum, item) => sum + (item.itemCount ?? 0), 0);
  return (
    <section className="qdoc-project-workspace" aria-label="專案">
      <article className="qdoc-project-data-viewer" aria-label={QDOC_PROJECT_SOURCES.data.label}>
        <header className="qdoc-project-markdown-header">
          <h2>{QDOC_PROJECT_SOURCES.data.label}</h2>
          <p>{projectSourceDirectoryPath("data")}</p>
          <dl>
            <div>
              <dt>Files</dt>
              <dd>{entries.length}</dd>
            </div>
            <div>
              <dt>Items</dt>
              <dd>{totalItems}</dd>
            </div>
          </dl>
        </header>
        {entries.length > 0 ? (
          <div className="qdoc-project-data-list">
            {entries.map((item) => (
              <article className="qdoc-project-data-card" key={item.id}>
                <header>
                  <FileJson aria-hidden="true" />
                  <div>
                    <h3>{item.file}</h3>
                    <p>{item.title}</p>
                  </div>
                </header>
                <QDocProjectDataPreview item={item} />
                <details className="qdoc-project-data-raw">
                  <summary>JSON source</summary>
                  <pre tabIndex={0}><code>{item.raw}</code></pre>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <p className="qdoc-project-empty">{projectSourceDirectoryPath("data")} 尚未有可預覽資料。</p>
        )}
      </article>
    </section>
  );
}

function QDocProjectDataPreview({ item }: { item: QDocProjectDataEntry }) {
  if (!item.chartHtml) {
    return (
      <div className="qdoc-project-data-preview qdoc-project-data-preview--empty">
        <span>No previewable items</span>
      </div>
    );
  }

  return (
    <div
      className="qdoc-project-data-preview qdoc-project-data-chart-preview"
      aria-label={`${item.title} preview`}
      data-chart-type={item.chartType ?? undefined}
      data-chart-variant={item.variant}
      dangerouslySetInnerHTML={{ __html: item.chartHtml }}
    />
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
  const aliasMatch = rawPath.match(/@workspace\/components\/.*/);
  if (aliasMatch) {
    return `${__QDOC_COMPONENTS_PATH__}/${aliasMatch[0].replace("@workspace/components/", "")}`;
  }
  return rawPath.replace(/^\.\.\/\.\.\//, "");
}

function createProjectDataEntry(path: string, raw: string, index: number): QDocProjectDataEntry {
  // Strip the alias prefix or relative climb so display path is workspace-relative.
  const workspacePath = stripWorkspaceAlias(path);
  const parts = workspacePath.split("/");
  const file = parts.at(-1) ?? workspacePath;
  const directory = parts.slice(0, -1).join("/");
  const parsed = parseProjectData(raw);
  const title = readDataTitle(parsed) ?? file;
  const caption = readDataCaption(parsed);
  const chartType = readDataChartType(parsed);
  const variant = readDataVariant(parsed) ?? chartType ?? file.replace(/\.json$/i, "");
  const chartHtml = renderProjectDataChart(parsed, chartType, variant);
  const itemCount = readDataItemCount(parsed);
  return {
    id: `data-${index + 1}`,
    path: workspacePath,
    file,
    directory,
    raw,
    title,
    caption,
    chartType,
    variant,
    chartHtml,
    itemCount,
  };
}

function parseProjectData(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function readDataTitle(value: unknown) {
  if (!isRecord(value) || typeof value.title !== "string") return null;
  return value.title;
}

function readDataCaption(value: unknown) {
  if (!isRecord(value) || typeof value.caption !== "string") return null;
  return value.caption;
}

function readDataChartType(value: unknown): QDocChartType | null {
  if (!isRecord(value)) return null;
  try {
    return inferChartType(value);
  } catch {
    return null;
  }
}

function readDataVariant(value: unknown) {
  if (!isRecord(value) || typeof value.variant !== "string") return null;
  return value.variant;
}

function renderProjectDataChart(value: unknown, chartType: QDocChartType | null, variant: string) {
  if (!isRecord(value) || !chartType) return "";
  try {
    return renderChartFigure({ type: chartType, data: value, variant });
  } catch {
    return "";
  }
}

function readDataItemCount(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  return value.items.length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
