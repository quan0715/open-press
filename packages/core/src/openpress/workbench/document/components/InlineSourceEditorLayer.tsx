import { useEffect, useMemo, useState } from "react";
import type { InlineDocumentSourceTarget } from "../hooks/useInlineDocumentEditor";
import { useEditStatus } from "../../WorkbenchEditStatusContext";

const EDITOR_LAYER_CLASS = "pointer-events-none fixed inset-0 z-[980]";
const EDITOR_PANEL_CLASS = [
  "pointer-events-auto fixed grid max-w-[calc(100vw-28px)] gap-[10px]",
  "rounded-[var(--openpress-workbench-radius-md)] border border-[var(--openpress-workbench-border)]",
  "bg-[var(--openpress-workbench-dialog-bg)] p-3 text-[var(--openpress-workbench-text)]",
  "shadow-[0_18px_46px_rgb(0_0_0_/_0.34)]",
].join(" ");
const EDITOR_ROW_CLASS = "flex min-w-0 items-center justify-between gap-[10px]";
const EDITOR_BUTTON_CLASS = [
  "min-h-7 cursor-pointer rounded-[var(--openpress-workbench-radius-sm)] border",
  "border-[var(--openpress-workbench-border)] bg-transparent text-[11px] text-[rgb(242_242_238_/_0.82)]",
  "[font:inherit] disabled:cursor-progress disabled:opacity-55",
].join(" ");
const EDITOR_STATUS_CLASS = {
  idle: "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[rgb(174_179_184_/_0.7)]",
  loading: "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[rgb(174_179_184_/_0.7)]",
  saving: "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[rgb(240_182_76_/_0.88)]",
  failed: "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[var(--openpress-workbench-danger)]",
} satisfies Record<"idle" | "loading" | "saving" | "failed", string>;

export function InlineSourceEditorLayer({
  target,
  fetchImpl,
  onClose,
  geometryVersion,
}: {
  target: InlineDocumentSourceTarget | null;
  fetchImpl?: typeof fetch;
  onClose: () => void;
  geometryVersion?: unknown;
}) {
  const { startSave, completeSave, failSave } = useEditStatus();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "failed">("idle");
  const [error, setError] = useState("");
  const sourceRequestUrl = useMemo(() => (target ? sourceReadUrl(target) : ""), [target]);
  const targetRect = useMemo(
    () => (target ? resolveSourceEditorTargetRect(target) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geometryVersion, target],
  );

  useEffect(() => {
    if (!target) {
      setText("");
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
    void request(sourceRequestUrl, { method: "GET" })
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text().catch(() => "");
          throw new Error(message || `Source read failed with status ${response.status}`);
        }
        return response.json() as Promise<{ source?: { text?: string } }>;
      })
      .then((result) => {
        if (canceled) return;
        setText(result.source?.text ?? "");
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
  }, [failSave, fetchImpl, sourceRequestUrl, target]);

  if (!target) return null;

  const block = target.block;
  const position = sourceEditorPosition(targetRect ?? target.rect);
  const canSave = status !== "loading" && status !== "saving" && text.trim().length > 0;

  const handleSave = async () => {
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
          blockId: block.id,
          path: block.path,
          kind: block.kind,
          name: block.name,
          source: block.source,
          sourceMode: true,
          text,
        }),
      });
      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(message || `Source edit failed with status ${response.status}`);
      }
      setStatus("idle");
      completeSave();
      onClose();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      setStatus("failed");
      setError(message);
      failSave(message);
    }
  };

  const statusText = sourceEditorStatusText(status, error);

  return (
    <div className={EDITOR_LAYER_CLASS} onMouseDown={(event) => event.stopPropagation()}>
      <section
        className={EDITOR_PANEL_CLASS}
        role="dialog"
        aria-label="Source 編輯"
        style={position}
      >
        <header className={EDITOR_ROW_CLASS}>
          <div className="grid min-w-0 gap-1">
            <span className="text-[9px] font-bold tracking-[0.08em] text-[rgb(174_179_184_/_0.58)] [font-family:var(--openpress-font-mono)]">
              SOURCE
            </span>
            <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-[650] leading-[1.1]">
              {block.name ?? block.kind ?? "Block"}
            </strong>
          </div>
          <button
            type="button"
            className={`${EDITOR_BUTTON_CLASS} w-7 p-0 text-[15px]`}
            onClick={onClose}
            aria-label="關閉 source 編輯"
          >
            ×
          </button>
        </header>
        <textarea
          className={[
            "min-h-[126px] w-full resize-y rounded-[var(--openpress-workbench-radius-sm)]",
            "border border-[var(--openpress-workbench-border)] bg-black/25 p-[10px]",
            "text-[11px] leading-[1.55] text-[rgb(242_242_238_/_0.92)] outline-none",
            "[font-family:var(--openpress-font-mono)]",
            "focus:border-[rgb(240_182_76_/_0.42)] focus:shadow-[0_0_0_1px_rgb(240_182_76_/_0.16)]",
          ].join(" ")}
          aria-label="Source 內容"
          value={text}
          disabled={status === "loading" || status === "saving"}
          spellCheck={false}
          onChange={(event) => {
            setText(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              onClose();
            }
          }}
        />
        <footer className={EDITOR_ROW_CLASS}>
          <span
            className={EDITOR_STATUS_CLASS[status]}
            data-openpress-source-editor-status={status}
            role="status"
            aria-live="polite"
          >
            {statusText}
          </span>
          <div className="inline-flex shrink-0 gap-1.5">
            <button type="button" className={`${EDITOR_BUTTON_CLASS} px-[10px]`} onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className={[
                EDITOR_BUTTON_CLASS,
                "border-[rgb(240_182_76_/_0.28)] bg-[rgb(240_182_76_/_0.09)] px-[10px]",
                "text-[var(--openpress-workbench-accent)]",
              ].join(" ")}
              onClick={handleSave}
              disabled={!canSave}
            >
              儲存 source
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function sourceReadUrl(target: InlineDocumentSourceTarget) {
  const params = new URLSearchParams();
  params.set("path", target.block.path);
  params.set("line", String(target.block.source?.line ?? 1));
  params.set("column", String(target.block.source?.column ?? 1));
  params.set("endLine", String(target.block.source?.endLine ?? target.block.source?.line ?? 1));
  params.set("endColumn", String(target.block.source?.endColumn ?? target.block.source?.column ?? 1));
  return `/__openpress/source-edit?${params.toString()}`;
}

function resolveSourceEditorTargetRect(target: InlineDocumentSourceTarget) {
  const rect = target.element.getBoundingClientRect();
  if (rect.width > 0 || rect.height > 0 || rect.left !== 0 || rect.top !== 0) return rect;
  return target.rect;
}

function sourceEditorPosition(rect: DOMRect) {
  const width = 420;
  const margin = 14;
  const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 900 : window.innerHeight;
  const left = Math.min(
    Math.max(rect.left, margin),
    Math.max(margin, viewportWidth - width - margin),
  );
  const top =
    rect.bottom + 12 + 280 < viewportHeight
      ? rect.bottom + 12
      : Math.max(margin, rect.top - 292);
  return { left, top, width };
}

function sourceEditorStatusText(status: "idle" | "loading" | "saving" | "failed", error: string) {
  if (status === "loading") return "讀取中";
  if (status === "saving") return "儲存中";
  if (status === "failed") return error || "儲存失敗";
  return "可編輯 source";
}
