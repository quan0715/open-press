import { useRef, useState, type CSSProperties, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { Check, Component as ComponentIcon, Images, Palette, Pencil, Trash2, UploadCloud, type LucideIcon } from "lucide-react";
import { useComposerMentions, type ComposerMentionItem } from "./composerMentions";
import type { BookmarkItem, BookmarkSubItem, MediaAssetItem } from "./indexes";
import { projectSourceDirectoryPath, PROJECT_SOURCES } from "./projectSources";
import type { BlockSource } from "./types";
import type { DisplayPage } from "./workbenchTypes";

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

export type ProjectMentionItem = ComposerMentionItem;

type UploadedProjectMedia = {
  fileName: string;
  src: string;
  path: string;
  mention: string;
};

type ProjectPanelPreview =
  | { kind: "media"; title: string; src: string }
  | { kind: "component"; title: string; html: string };

type ProjectAssetActionStatus = "idle" | "submitting" | "done" | "failed";

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

export function ProjectEntryPanel({
  mediaAssets,
  componentUsages,
  mentionItems,
  currentSource,
  onInsertMention,
}: {
  mediaAssets: MediaAssetItem[];
  componentUsages: Map<string, ProjectComponentUsage>;
  mentionItems: ProjectMentionItem[];
  currentSource: BlockSource | undefined;
  onInsertMention: (mention: string) => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "failed">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState<UploadedProjectMedia[]>([]);
  const [preview, setPreview] = useState<ProjectPanelPreview | null>(null);
  const componentItems = Array.from(componentUsages.entries())
    .sort(([a], [b]) => a.localeCompare(b, "zh-Hant"))
    .slice(0, 8);
  const mediaItems = [
    ...uploadedMedia.map((item) => ({
      fileName: item.fileName,
      src: item.src,
      mention: item.mention,
      meta: "new",
    })),
    ...mediaAssets.slice(0, 8).map((item) => ({
      fileName: item.fileName,
      src: item.src,
      mention: mediaMention(item.fileName),
      meta: item.usageCount > 0 ? `P${String(item.pageIndex + 1).padStart(2, "0")}` : "unused",
    })),
  ].slice(0, 10);

  const uploadFiles = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files).filter((file) => file.type.startsWith("image/") || isImageFileName(file.name));
    if (selectedFiles.length === 0) return;
    setUploadStatus("uploading");
    setUploadMessage("上傳中");
    try {
      const uploaded: UploadedProjectMedia[] = [];
      for (const file of selectedFiles) {
        uploaded.push(await uploadProjectMediaFile(file));
      }
      setUploadedMedia((items) => [...uploaded, ...items]);
      setUploadStatus("done");
      setUploadMessage(`${uploaded.length} 張圖片已加入 media`);
      if (uploaded[0]) onInsertMention(uploaded[0].mention);
    } catch (error) {
      setUploadStatus("failed");
      setUploadMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(false);
    void uploadFiles(event.dataTransfer.files);
  };

  return (
    <section className="openpress-project-panel openpress-panel-section" aria-label="Project tools">
      <section className="openpress-project-tool-block" aria-label="上傳圖片">
        <header className="openpress-project-tool-header">
          <span>Upload</span>
        </header>
        <label
          className="openpress-project-upload-zone"
          data-drag-active={dragActive ? "true" : "false"}
          data-upload-status={uploadStatus}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              if (event.currentTarget.files) void uploadFiles(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
          <UploadCloud aria-hidden="true" />
          <span>上傳圖片到 media</span>
          <small>{uploadMessage || "拖放或點擊選取，完成後可用 @media mention"}</small>
        </label>
      </section>

      <section className="openpress-project-tool-block" aria-label="媒體素材">
        <header className="openpress-project-tool-header">
          <span>Media</span>
        </header>
        {mediaItems.length > 0 ? (
          <div className="openpress-project-asset-list">
            {mediaItems.map((item) => (
              <button
                type="button"
                className="openpress-project-asset"
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
          <p className="openpress-project-tool-empty">尚無圖片</p>
        )}
      </section>

      <section className="openpress-project-tool-block" aria-label="Components">
        <header className="openpress-project-tool-header">
          <span>Components</span>
        </header>
        {componentItems.length > 0 ? (
          <div className="openpress-project-component-mention-list">
            {componentItems.map(([name, usage]) => (
              <button
                type="button"
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
          <p className="openpress-project-tool-empty">尚無 component</p>
        )}
      </section>

      <section className="openpress-project-tool-block" aria-label="Style tokens">
        <header className="openpress-project-tool-header">
          <span>Style</span>
        </header>
        <div className="openpress-project-style-strip" aria-label="色票">
          {PROJECT_COLOR_SWATCHES.slice(0, 6).map((item) => (
            <span
              key={item.token}
              title={item.label}
              style={{ "--openpress-project-swatch": `var(${item.token})` } as CSSProperties}
            />
          ))}
        </div>
      </section>
      {preview ? (
        <ProjectPreviewDialog
          key={`${preview.kind}-${preview.title}`}
          preview={preview}
          mentionItems={mentionItems}
          currentSource={currentSource}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </section>
  );
}

function ProjectPreviewDialog({
  preview,
  mentionItems,
  currentSource,
  onClose,
}: {
  preview: ProjectPanelPreview;
  mentionItems: ProjectMentionItem[];
  currentSource: BlockSource | undefined;
  onClose: () => void;
}) {
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [actionMode, setActionMode] = useState<"idle" | "rename" | "delete">("idle");
  const [renameValue, setRenameValue] = useState(preview.title);
  const [actionStatus, setActionStatus] = useState<ProjectAssetActionStatus>("idle");
  const [actionMessage, setActionMessage] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentTarget, setCommentTarget] = useState<"current-page" | "asset-source">(
    preview.kind === "component" ? "asset-source" : "current-page",
  );
  const [commentStatus, setCommentStatus] = useState<ProjectAssetActionStatus>("idle");
  const [commentMessage, setCommentMessage] = useState("");
  const {
    activeMention,
    handleMentionKeyDown,
    highlightedMentionIndex,
    mentionSuggestions,
    setHighlightedMentionIndex,
    setComposerCursor,
    syncCursor,
    insertMention,
  } = useComposerMentions({
    text: commentText,
    items: mentionItems,
    textareaRef: commentTextareaRef,
    onTextChange: setCommentText,
    maxSuggestions: 8,
  });

  if (typeof document === "undefined") return null;

  const resetAction = () => {
    setActionMode("idle");
    setRenameValue(preview.title);
    setActionStatus("idle");
    setActionMessage("");
  };

  const runRename = async () => {
    setActionStatus("submitting");
    setActionMessage("");
    try {
      const result = await submitProjectAssetAction({
        action: "rename",
        kind: preview.kind,
        name: preview.title,
        nextName: renameValue,
      });
      setActionStatus("done");
      setActionMessage(`已重新命名，並更新 ${result.referenceCount ?? 0} 個引用。重新整理後會看到最新列表。`);
    } catch (error) {
      setActionStatus("failed");
      setActionMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const runDelete = async () => {
    setActionStatus("submitting");
    setActionMessage("");
    try {
      await submitProjectAssetAction({
        action: "delete",
        kind: preview.kind,
        name: preview.title,
      });
      setActionStatus("done");
      setActionMessage("已刪除。重新整理後會從列表移除。");
    } catch (error) {
      setActionStatus("failed");
      setActionMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const applyCommentTemplate = (target: "current-page" | "asset-source") => {
    setCommentTarget(target);
    if (target === "current-page") {
      const nextText = `請將 ${assetKindLabel(preview.kind)}「${preview.title}」加入 `;
      setCommentText(nextText);
      window.requestAnimationFrame(() => {
        commentTextareaRef.current?.focus();
        commentTextareaRef.current?.setSelectionRange(nextText.length, nextText.length);
        setComposerCursor(nextText.length);
      });
      return;
    }
    const nextText = `請調整 ${assetKindLabel(preview.kind)}「${preview.title}」的樣式：`;
    setCommentText(nextText);
    window.requestAnimationFrame(() => {
      commentTextareaRef.current?.focus();
      commentTextareaRef.current?.setSelectionRange(nextText.length, nextText.length);
      setComposerCursor(nextText.length);
    });
  };

  const submitComment = async () => {
    setCommentStatus("submitting");
    setCommentMessage("");
    try {
      await submitProjectAssetAction({
        action: "comment",
        kind: preview.kind,
        name: preview.title,
        note: commentText,
        commentTarget,
        currentSource: currentSource ? { path: currentSource.path, line: 1 } : undefined,
      });
      setCommentStatus("done");
      setCommentMessage("已留下註解。");
      setCommentText("");
    } catch (error) {
      setCommentStatus("failed");
      setCommentMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return createPortal(
    <div className="openpress-project-preview-dialog" role="presentation" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={preview.title}
        className="openpress-project-preview-dialog__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2>{preview.title}</h2>
          <div className="openpress-project-preview-dialog__actions" aria-label="資產操作">
            <button type="button" onClick={() => setActionMode("rename")} aria-label="重新命名">
              <Pencil aria-hidden="true" />
              <span>Rename</span>
            </button>
            <button type="button" onClick={() => setActionMode("delete")} aria-label="刪除">
              <Trash2 aria-hidden="true" />
              <span>Delete</span>
            </button>
          </div>
          <button type="button" className="openpress-project-preview-dialog__close" aria-label="關閉預覽" onClick={onClose}>×</button>
        </header>
        <div className="openpress-project-preview-dialog__body" data-preview-kind={preview.kind}>
          {preview.kind === "media" ? (
            <img src={preview.src} alt="" />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: preview.html }} />
          )}
        </div>
        <footer className="openpress-project-preview-dialog__footer">
          {actionMode === "rename" ? (
            <form
              className="openpress-project-asset-action-form"
              onSubmit={(event) => {
                event.preventDefault();
                void runRename();
              }}
            >
              <label>
                <span>重新命名</span>
                <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
              </label>
              <div>
                <button type="button" onClick={resetAction}>取消</button>
                <button type="submit" disabled={actionStatus === "submitting"}>
                  <Check aria-hidden="true" />
                  <span>{actionStatus === "submitting" ? "處理中" : "確認"}</span>
                </button>
              </div>
            </form>
          ) : null}
          {actionMode === "delete" ? (
            <div className="openpress-project-asset-action-form openpress-project-asset-action-form--delete">
              <p>確認刪除「{preview.title}」？如果文件仍有引用，系統會拒絕刪除，避免頁面破版。</p>
              <div>
                <button type="button" onClick={resetAction}>取消</button>
                <button type="button" disabled={actionStatus === "submitting"} onClick={() => void runDelete()}>
                  <Trash2 aria-hidden="true" />
                  <span>{actionStatus === "submitting" ? "處理中" : "確認刪除"}</span>
                </button>
              </div>
            </div>
          ) : null}
          {actionMessage ? (
            <p className="openpress-project-asset-action-message" data-status={actionStatus} role="status">
              {actionMessage}
            </p>
          ) : null}

          <section className="openpress-project-preview-comment" aria-label="留下註解">
            <div className="openpress-project-preview-comment__shortcuts">
              <button type="button" onClick={() => applyCommentTemplate("current-page")}>指定章節引用</button>
              {preview.kind === "component" ? (
                <button type="button" onClick={() => applyCommentTemplate("asset-source")}>調整樣式</button>
              ) : null}
            </div>
            <div className="openpress-project-preview-comment__composer">
              <textarea
                ref={commentTextareaRef}
                value={commentText}
                rows={3}
                placeholder="留下註解，輸入 @ 指定章節、子章節、media 或 component..."
                onChange={(event) => {
                  setCommentText(event.target.value);
                  setComposerCursor(event.target.selectionStart ?? event.target.value.length);
                }}
                onClick={syncCursor}
                onKeyUp={syncCursor}
                onKeyDown={handleMentionKeyDown}
              />
              {mentionSuggestions.length > 0 ? (
                <div className="openpress-project-preview-comment__suggestions" role="listbox" aria-label={activeMention?.trigger === "/" ? "Skill suggestions" : "Mention suggestions"}>
                  {mentionSuggestions.map((item, index) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === highlightedMentionIndex}
                      data-highlighted={index === highlightedMentionIndex ? "true" : undefined}
                      key={`${item.kind}-${item.value}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setHighlightedMentionIndex(index)}
                      onClick={() => insertMention(item)}
                    >
                      <span>{item.label}</span>
                      <small>{item.meta}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="openpress-project-preview-comment__bottom">
              <select value={commentTarget} onChange={(event) => setCommentTarget(event.target.value as "current-page" | "asset-source")}>
                <option value="current-page">文件位置</option>
                <option value="asset-source">資產來源</option>
              </select>
              {commentMessage ? (
                <span data-status={commentStatus} role="status">{commentMessage}</span>
              ) : null}
              <button type="button" disabled={commentStatus === "submitting" || !commentText.trim()} onClick={() => void submitComment()}>
                <span>{commentStatus === "submitting" ? "送出中" : "送出"}</span>
              </button>
            </div>
          </section>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

export function ProjectWorkspace({
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
    <section className="openpress-project-workspace" aria-label="專案">
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
    <section className="openpress-project-workspace" aria-label="專案">
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
    <section className="openpress-project-workspace" aria-label="專案">
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

function isImageFileName(name: string) {
  return /\.(png|jpe?g|gif|svg|webp)$/i.test(name);
}

async function uploadProjectMediaFile(file: File): Promise<UploadedProjectMedia> {
  const response = await fetch("/__openpress/media-upload", {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-OpenPress-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  });
  const result = await response.json().catch(() => null) as { ok?: boolean; asset?: UploadedProjectMedia; message?: string } | null;
  if (!response.ok || !result?.ok || !result.asset) {
    throw new Error(result?.message ?? `Upload failed with status ${response.status}`);
  }
  return result.asset;
}

async function submitProjectAssetAction(body: {
  action: "rename" | "delete" | "comment";
  kind: "media" | "component";
  name: string;
  nextName?: string;
  note?: string;
  commentTarget?: "current-page" | "asset-source";
  currentSource?: { path: string; line: number };
}) {
  const response = await fetch("/__openpress/project-asset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as {
    ok?: boolean;
    message?: string;
    referenceCount?: number;
    fileCount?: number;
  } | null;
  if (!response.ok || !result?.ok) {
    throw new Error(result?.message ?? `Project asset action failed with status ${response.status}`);
  }
  return result;
}

function assetKindLabel(kind: "media" | "component") {
  return kind === "media" ? "圖片" : "Component";
}

const PROJECT_SKILL_MENTIONS: ProjectMentionItem[] = [
  { trigger: "/", value: "/insert-image", label: "insert-image", meta: "skill", kind: "skill" },
  { trigger: "/", value: "/redraw-figure", label: "redraw-figure", meta: "skill", kind: "skill" },
  { trigger: "/", value: "/rewrite-section", label: "rewrite-section", meta: "skill", kind: "skill" },
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
