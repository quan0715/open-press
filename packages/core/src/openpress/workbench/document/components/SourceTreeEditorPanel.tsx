import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw, Save } from "lucide-react";
import type { DocumentRefreshOptions, SourceBlock } from "../../../document-model";
import { Button } from "@/openpress/ui/button";
import { Textarea } from "@/openpress/ui/textarea";
import { useEditStatus } from "../../WorkbenchEditStatusContext";

type SourceTreeEditorPanelProps = {
  sourceBlocksByPath: Record<string, SourceBlock[]>;
  activeBlockIds?: readonly string[];
  pressSlug?: string | null;
  fetchImpl?: typeof fetch;
  onDocumentEdited?: (options?: DocumentRefreshOptions) => void | Promise<void>;
};

type SourceFileEditResponse = {
  document?: {
    renderId?: string;
  };
};

type SourceFileEntry = {
  path: string;
  file: string;
  blocks: SourceBlock[];
};

const SOURCE_PANEL_CLASS = [
  "op-workspace-source-panel grid h-full min-h-0 grid-cols-[260px_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)]",
  "bg-[var(--op-workspace-main-bg)] text-[var(--op-workspace-text)]",
  "max-[980px]:grid-cols-[1fr] max-[980px]:grid-rows-[auto_minmax(0,1fr)]",
].join(" ");
const SOURCE_TREE_PANE_CLASS = [
  "grid min-h-0 grid-rows-[44px_minmax(0,1fr)] overflow-hidden border-r border-[var(--op-workspace-border-muted)] bg-[var(--op-workspace-panel-bg)]",
  "max-[980px]:max-h-[220px] max-[980px]:border-b max-[980px]:border-r-0",
].join(" ");
const SOURCE_EDITOR_PANE_CLASS = [
  "grid min-h-0 min-w-0 grid-rows-[36px_minmax(0,1fr)] overflow-hidden",
].join(" ");
const SOURCE_HEADER_CLASS = [
  "flex min-w-0 items-center justify-between gap-3 border-b border-[var(--op-workspace-border-muted)] bg-[var(--op-workspace-panel-bg)] px-[18px]",
].join(" ");
const SOURCE_KICKER_CLASS = [
  "font-mono text-[10px] font-semibold uppercase leading-none tracking-normal text-[var(--op-workspace-text-muted)]",
].join(" ");
const SOURCE_TITLE_CLASS = [
  "m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold leading-tight text-[var(--op-workspace-text)]",
].join(" ");
const SOURCE_DESCRIPTION_CLASS = [
  "m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-snug text-[var(--op-workspace-text-muted)]",
].join(" ");
const SOURCE_TREE_CLASS = [
  "grid min-h-0 content-start gap-1 overflow-y-auto px-[14px] py-4",
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
].join(" ");
const SOURCE_FILE_BUTTON_CLASS = [
  "grid min-h-[50px] w-full min-w-0 cursor-pointer appearance-none grid-cols-[12px_minmax(0,1fr)] items-center gap-3",
  "rounded-[var(--op-workspace-radius-sm)] border border-transparent bg-transparent px-2.5 py-2 text-left",
  "text-[var(--op-workspace-text-muted)] transition-[background,border-color,color] duration-150",
  "hover:bg-[var(--op-workspace-surface-hover)] hover:text-[var(--op-workspace-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-workspace-accent-border)]",
].join(" ");
const SOURCE_FILE_BUTTON_ACTIVE_CLASS = [
  "border-[var(--op-workspace-border-strong)] bg-[var(--op-workspace-surface-hover)] text-[var(--op-workspace-text)]",
].join(" ");
const SOURCE_FILE_TEXT_CLASS = "grid min-w-0 gap-1";
const SOURCE_FILE_NAME_CLASS = [
  "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-semibold leading-none text-[var(--op-workspace-text)]",
].join(" ");
const SOURCE_FILE_PATH_CLASS = [
  "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10px] leading-none text-[var(--op-workspace-text-muted)]",
].join(" ");
const SOURCE_EDITOR_META_CLASS = [
  "op-workspace-source-toolbar flex min-h-9 min-w-0 items-center justify-between gap-3 border-b border-[var(--op-workspace-border-muted)] bg-[var(--op-workspace-surface)] px-4 text-[10px] leading-none text-[var(--op-workspace-text-muted)]",
].join(" ");
const SOURCE_EDITOR_META_LEFT_CLASS = "flex min-w-0 items-center gap-2";
const SOURCE_EDITOR_PATH_CLASS = "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono";
const SOURCE_CODE_SHELL_CLASS = [
  "grid min-h-0 min-w-0 grid-cols-[48px_minmax(0,1fr)] overflow-hidden bg-[var(--op-workspace-main-bg)]",
].join(" ");
const SOURCE_LINE_GUTTER_CLASS = [
  "relative min-h-0 overflow-hidden border-r border-[var(--op-workspace-border-muted)] bg-[var(--op-workspace-surface)] py-3 text-right font-mono text-[12px] leading-6 text-[var(--op-workspace-text-muted)]",
].join(" ");
const SOURCE_LINE_LIST_CLASS = "m-0 list-none px-2 py-0";
const SOURCE_TEXTAREA_CLASS = [
  "h-full min-h-0 resize-none !rounded-none !border-0 !bg-[var(--op-workspace-main-bg)] p-3 font-mono text-[13px] leading-6 !text-[var(--op-workspace-text)]",
  "shadow-none outline-none field-sizing-fixed caret-[var(--op-workspace-accent)] selection:bg-[var(--op-workspace-accent-surface)]",
  "placeholder:text-[var(--op-workspace-text-muted)] focus:ring-0 focus-visible:ring-0",
].join(" ");
const SOURCE_STATUS_CLASS = "min-w-0 max-w-[34vw] overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[var(--op-workspace-text-muted)]";
const SOURCE_SAVE_STATE_CLASS = "shrink-0 font-mono text-[10px] text-[var(--op-workspace-text-muted)]";
const SOURCE_SAVE_STATE_DIRTY_CLASS = "text-[var(--op-workspace-accent)]";
const SOURCE_ACTIONS_CLASS = "inline-flex shrink-0 items-center gap-1.5";
const SOURCE_ACTION_BUTTON_CLASS = [
  "op-ui-button min-h-6 cursor-pointer rounded-[var(--op-workspace-radius-sm)] border border-[var(--op-workspace-border)] bg-transparent px-2 text-[11px] text-[var(--op-workspace-text-soft)]",
  "hover:bg-[var(--op-workspace-surface-hover)] hover:text-[var(--op-workspace-text)]",
  "disabled:cursor-progress disabled:opacity-55",
].join(" ");
const SOURCE_SAVE_BUTTON_CLASS = [
  SOURCE_ACTION_BUTTON_CLASS,
  "op-ui-button-primary border-[var(--op-workspace-accent-border)] bg-[var(--op-workspace-accent)] text-[var(--op-workspace-text-inverse)] hover:bg-[var(--op-workspace-accent-hover)] hover:text-[var(--op-workspace-text-inverse)] disabled:bg-transparent",
].join(" ");
const SOURCE_EMPTY_CLASS = [
  "m-2 border border-dashed border-[var(--op-workspace-border-muted)] p-3",
  "text-[11px] leading-snug text-[var(--op-workspace-text-muted)]",
].join(" ");
const SOURCE_WARNING_CLASS = [
  "col-span-2 grid min-w-0 gap-1 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2",
  "text-[11px] leading-snug text-amber-100 max-[980px]:col-span-1",
].join(" ");
const SOURCE_WARNING_LABEL_CLASS = "font-mono text-[10px] font-bold uppercase leading-none tracking-normal text-amber-300";

export function SourceTreeEditorPanel({
  sourceBlocksByPath,
  activeBlockIds,
  pressSlug,
  fetchImpl,
  onDocumentEdited,
}: SourceTreeEditorPanelProps) {
  const { startSave, completeSave, failSave } = useEditStatus();
  const sourceFiles = useMemo(() => createSourceFileEntries(sourceBlocksByPath), [sourceBlocksByPath]);
  const activeBlockIdsKey = activeBlockIds?.join("\u0000") ?? "";
  const preferredPath = useMemo(() => {
    if (!activeBlockIdsKey) return null;
    const active = new Set(activeBlockIdsKey.split("\u0000").filter(Boolean));
    return sourceFiles.find((file) => file.blocks.some((block) => active.has(block.id)))?.path ?? null;
  }, [activeBlockIdsKey, sourceFiles]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "failed">("idle");
  const [error, setError] = useState("");
  const [editorScrollTop, setEditorScrollTop] = useState(0);
  const selectedFile = sourceFiles.find((file) => file.path === selectedPath) ?? null;
  const dirty = text !== savedText;
  const lineCount = useMemo(() => Math.max(1, text.split("\n").length), [text]);

  useEffect(() => {
    if (sourceFiles.length === 0) {
      setSelectedPath(null);
      return;
    }
    if (selectedPath && sourceFiles.some((file) => file.path === selectedPath)) return;
    setSelectedPath(preferredPath ?? sourceFiles[0]?.path ?? null);
  }, [preferredPath, selectedPath, sourceFiles]);

  const loadSelectedFile = useCallback(() => {
    if (!selectedPath) {
      setText("");
      setSavedText("");
      setStatus("idle");
      setError("");
      return undefined;
    }

    const request = fetchImpl ?? globalThis.fetch?.bind(globalThis);
    if (!request) {
      setStatus("failed");
      setError("Source edit endpoint is unavailable.");
      return undefined;
    }

    let canceled = false;
    setStatus("loading");
    setError("");
    void request(sourceFileReadUrl(selectedPath), { method: "GET" })
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text().catch(() => "");
          throw new Error(message || `Source file read failed with status ${response.status}`);
        }
        return response.json() as Promise<{ source?: { text?: string } }>;
      })
      .then((result) => {
        if (canceled) return;
        const nextText = result.source?.text ?? "";
        setText(nextText);
        setSavedText(nextText);
        setStatus("idle");
      })
      .catch((readError) => {
        if (canceled) return;
        const message = readError instanceof Error ? readError.message : String(readError);
        setStatus("failed");
        setError(message);
        failSave(message);
      });

    return () => {
      canceled = true;
    };
  }, [failSave, fetchImpl, selectedPath]);

  useEffect(() => loadSelectedFile(), [loadSelectedFile]);

  const handleSave = async () => {
    if (!selectedPath) return;
    const request = fetchImpl ?? globalThis.fetch?.bind(globalThis);
    if (!request) {
      setStatus("failed");
      setError("Source edit endpoint is unavailable.");
      return;
    }

    setStatus("saving");
    setError("");
    startSave();
    try {
      const response = await request("/__openpress/source-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "source-file-edit",
          path: selectedPath,
          text,
          pressSlug,
        }),
      });
      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(message || `Source file edit failed with status ${response.status}`);
      }
      const result = await response.json() as SourceFileEditResponse;
      await onDocumentEdited?.({ expectedRenderId: result.document?.renderId });
      setSavedText(text);
      setStatus("idle");
      completeSave();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      setStatus("failed");
      setError(message);
      failSave(message);
    }
  };

  return (
    <section className={SOURCE_PANEL_CLASS} aria-label="MDX source editor" data-openpress-source-tree-panel>
      <div className={SOURCE_WARNING_CLASS} data-openpress-mdx-experimental-warning>
        <span className={SOURCE_WARNING_LABEL_CLASS}>Experimental</span>
        <span>MDX source editing is advanced and may break rendering. Use at your own risk.</span>
      </div>
      <aside className={SOURCE_TREE_PANE_CLASS} aria-label="MDX source files" data-openpress-source-file-tree-pane>
        <header className={SOURCE_HEADER_CLASS}>
          <div className="grid min-w-0 gap-1">
            <span className={SOURCE_KICKER_CLASS}>Markdown</span>
            <h2 className={SOURCE_TITLE_CLASS}>MDX Source</h2>
          </div>
        </header>

        {sourceFiles.length > 0 ? (
          <nav className={SOURCE_TREE_CLASS} aria-label="MDX source files">
            {sourceFiles.map((file) => {
              const active = file.path === selectedPath;
              const displayPath = sourceFileDisplayPath(file.path, pressSlug);
              return (
                <div key={file.path}>
                  <button
                    type="button"
                    className={`${SOURCE_FILE_BUTTON_CLASS} ${active ? SOURCE_FILE_BUTTON_ACTIVE_CLASS : ""}`}
                    data-openpress-source-file={file.path}
                    data-openpress-source-file-active={active ? "true" : "false"}
                    aria-pressed={active}
                    title={file.path}
                    onClick={() => setSelectedPath(file.path)}
                  >
                    <FileText aria-hidden="true" className="h-3 w-3" data-openpress-source-file-icon />
                    <span className={SOURCE_FILE_TEXT_CLASS}>
                      <span className={SOURCE_FILE_NAME_CLASS} data-openpress-source-file-name>{file.file}</span>
                      <span className={SOURCE_FILE_PATH_CLASS} data-openpress-source-file-path>{displayPath}</span>
                    </span>
                  </button>
                </div>
              );
            })}
          </nav>
        ) : (
          <p className={SOURCE_EMPTY_CLASS}>No MDX source files found in this Press.</p>
        )}
      </aside>

      <section className={SOURCE_EDITOR_PANE_CLASS} aria-label="Selected source file" data-openpress-source-file-editor-pane>
        <div className={SOURCE_EDITOR_META_CLASS}>
          <div className={SOURCE_EDITOR_META_LEFT_CLASS}>
            <span className={SOURCE_EDITOR_PATH_CLASS} title={selectedFile?.path ?? ""}>
              {selectedFile ? sourceFileDisplayPath(selectedFile.path, pressSlug) : "No source selected"}
            </span>
            <span className={SOURCE_STATUS_CLASS} role="status" aria-live="polite">
              {sourceEditorStatusText(status, error)}
            </span>
          </div>
          <div className={SOURCE_ACTIONS_CLASS}>
            <span className={`${SOURCE_SAVE_STATE_CLASS} ${dirty ? SOURCE_SAVE_STATE_DIRTY_CLASS : ""}`}>
              {dirty ? "Unsaved" : "Saved"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={SOURCE_ACTION_BUTTON_CLASS}
              onClick={loadSelectedFile}
              disabled={!selectedPath || status === "loading" || status === "saving"}
            >
              <RefreshCw aria-hidden="true" />
              Reload
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={SOURCE_SAVE_BUTTON_CLASS}
              onClick={handleSave}
              disabled={!selectedPath || !dirty || status === "loading" || status === "saving"}
            >
              <Save aria-hidden="true" />
              Save &amp; Render
            </Button>
          </div>
        </div>
        <div className={SOURCE_CODE_SHELL_CLASS}>
          <div className={SOURCE_LINE_GUTTER_CLASS} aria-hidden="true">
            <ol
              className={SOURCE_LINE_LIST_CLASS}
              style={{ transform: `translateY(-${editorScrollTop}px)` }}
            >
              {Array.from({ length: lineCount }, (_, index) => (
                <li key={index}>{index + 1}</li>
              ))}
            </ol>
          </div>
          <Textarea
            className={SOURCE_TEXTAREA_CLASS}
            aria-label="MDX source content"
            data-openpress-source-file-editor
            value={text}
            disabled={!selectedPath || status === "loading" || status === "saving"}
            spellCheck={false}
            onChange={(event) => setText(event.target.value)}
            onScroll={(event) => setEditorScrollTop(event.currentTarget.scrollTop)}
          />
        </div>
      </section>
    </section>
  );
}

function createSourceFileEntries(sourceBlocksByPath: Record<string, SourceBlock[]>): SourceFileEntry[] {
  return Object.entries(sourceBlocksByPath)
    .filter(([sourcePath]) => /\.(md|mdx)$/i.test(sourcePath))
    .map(([sourcePath, blocks]) => ({
      path: sourcePath,
      file: sourcePath.split("/").pop() ?? sourcePath,
      blocks: [...blocks].sort((a, b) => (a.source?.line ?? 0) - (b.source?.line ?? 0)),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function sourceFileReadUrl(sourcePath: string) {
  const params = new URLSearchParams();
  params.set("type", "source-file");
  params.set("path", sourcePath);
  return `/__openpress/source-edit?${params.toString()}`;
}

function sourceFileDisplayPath(sourcePath: string, pressSlug?: string | null) {
  const normalizedPath = sourcePath.replace(/^\/+/, "");
  const normalizedSlug = pressSlug?.trim().replace(/^\/+|\/+$/g, "");
  if (!normalizedSlug) return normalizedPath;
  const prefix = `${normalizedSlug}/`;
  return normalizedPath.startsWith(prefix) ? normalizedPath.slice(prefix.length) : normalizedPath;
}

function sourceEditorStatusText(status: "idle" | "loading" | "saving" | "failed", error: string) {
  if (status === "loading") return "Loading source";
  if (status === "saving") return "Saving and rendering";
  if (status === "failed") return error || "Save and render failed";
  return "Source ready";
}
