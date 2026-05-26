import { useEffect, useMemo, useState } from "react";
import type {
  InlineDocumentEditStatus,
  InlineDocumentSourceTarget,
} from "../hooks/useInlineDocumentEditor";

export function InlineSourceEditorLayer({
  target,
  fetchImpl,
  onClose,
  onStatusChange,
  geometryVersion,
}: {
  target: InlineDocumentSourceTarget | null;
  fetchImpl?: typeof fetch;
  onClose: () => void;
  onStatusChange?: (status: InlineDocumentEditStatus) => void;
  geometryVersion?: unknown;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "failed">("idle");
  const [error, setError] = useState("");
  const sourceRequestUrl = useMemo(() => target ? sourceReadUrl(target) : "", [target]);
  const targetRect = useMemo(() => target ? resolveSourceEditorTargetRect(target) : null, [geometryVersion, target]);

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
        onStatusChange?.({ state: "editing", blockId: target.block.id });
      })
      .catch((readError) => {
        if (canceled) return;
        const message = readError instanceof Error ? readError.message : String(readError);
        setStatus("failed");
        setError(message);
        onStatusChange?.({ state: "failed", blockId: target.block.id, message });
      });

    return () => {
      canceled = true;
    };
  }, [fetchImpl, onStatusChange, sourceRequestUrl, target]);

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
    onStatusChange?.({ state: "saving", blockId: block.id });
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
      onStatusChange?.({ state: "saved", blockId: block.id });
      onClose();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      setStatus("failed");
      setError(message);
      onStatusChange?.({ state: "failed", blockId: block.id, message });
    }
  };

  const statusText = sourceEditorStatusText(status, error);

  return (
    <div className="openpress-inline-source-editor-layer" onMouseDown={(event) => event.stopPropagation()}>
      <section
        className="openpress-inline-source-editor"
        role="dialog"
        aria-label="Source 編輯"
        style={position}
      >
        <header className="openpress-inline-source-editor__header">
          <div>
            <span className="openpress-inline-source-editor__eyebrow">SOURCE</span>
            <strong>{block.name ?? block.kind ?? "Block"}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="關閉 source 編輯">
            ×
          </button>
        </header>
        <textarea
          aria-label="Source 內容"
          value={text}
          disabled={status === "loading" || status === "saving"}
          spellCheck={false}
          onChange={(event) => {
            setText(event.target.value);
            onStatusChange?.({ state: "editing", blockId: block.id });
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              onClose();
            }
          }}
        />
        <footer className="openpress-inline-source-editor__footer">
          <span data-openpress-source-editor-status={status} role="status" aria-live="polite">
            {statusText}
          </span>
          <div>
            <button type="button" onClick={onClose}>
              取消
            </button>
            <button type="button" onClick={handleSave} disabled={!canSave}>
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
  const left = Math.min(Math.max(rect.left, margin), Math.max(margin, viewportWidth - width - margin));
  const top = rect.bottom + 12 + 280 < viewportHeight
    ? rect.bottom + 12
    : Math.max(margin, rect.top - 292);
  return {
    left,
    top,
    width,
  };
}

function sourceEditorStatusText(status: "idle" | "loading" | "saving" | "failed", error: string) {
  if (status === "loading") return "讀取中";
  if (status === "saving") return "儲存中";
  if (status === "failed") return error || "儲存失敗";
  return "可編輯 source";
}
