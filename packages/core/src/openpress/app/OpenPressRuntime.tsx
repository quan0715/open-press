import { useMemo, type CSSProperties } from "react";
import { PrintDocument, PublicViewer, SlidePresentationPage } from "../reader";
import { isPresentationModeLocation, isPrintModeLocation, isWorkspaceModeLocation } from "../shared";
import { HtmlWorkbench } from "../workbench";
import type {
  DeploymentInfo,
  ReaderDocument,
  HtmlPageBlock,
  Theme,
} from "../document-model";

export type OpenPressRuntimeMode = "preview" | "present";

interface OpenPressRuntimeProps {
  document: ReaderDocument;
  runtimeMode?: OpenPressRuntimeMode;
  deploymentInfo?: DeploymentInfo;
  onDocumentRefresh?: () => void | Promise<void>;
  onOpenPresentation?: (pageIndex: number) => void;
  onExitPresentation?: (pageIndex: number) => void;
  // Optional — supplied by OpenPressApp when this Press was entered from
  // a multi-Press gallery. Renders a "工作台" home button in the toolbar
  // that returns to the gallery without a full page reload.
  onBackToWorkspace?: () => void;
}

export function OpenPressRuntime({
  document,
  runtimeMode,
  deploymentInfo = { online: false },
  onDocumentRefresh,
  onOpenPresentation,
  onExitPresentation,
  onBackToWorkspace,
}: OpenPressRuntimeProps) {
  const style = themeToCssVariables(document.theme);
  const htmlPages = document.blocks.filter((block): block is HtmlPageBlock => block.kind === "htmlPage");
  const activeRuntimeMode = useMemo<OpenPressRuntimeMode>(() => {
    if (runtimeMode) return runtimeMode;
    if (typeof window === "undefined") return "preview";
    return isPresentationModeLocation(window.location) ? "present" : "preview";
  }, [runtimeMode]);
  const workspaceMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isWorkspaceModeLocation(window.location);
  }, []);
  const printMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isPrintModeLocation(window.location);
  }, []);

  if (htmlPages.length > 0) {
    if (printMode) {
      return <PrintDocument document={document} pages={htmlPages} style={style} />;
    }

    if (activeRuntimeMode === "present" && document.meta.type === "slides") {
      return (
        <SlidePresentationPage
          document={document}
          pages={htmlPages}
          style={style}
          onExitPresentation={onExitPresentation}
        />
      );
    }

    if (!workspaceMode) {
      return <PublicViewer document={document} pages={htmlPages} style={style} deploymentInfo={deploymentInfo} />;
    }

    return (
      <HtmlWorkbench
        document={document}
        pages={htmlPages}
        style={style}
        devMode={workspaceMode}
        deploymentInfo={deploymentInfo}
        onDocumentRefresh={onDocumentRefresh}
        onOpenPresentation={onOpenPresentation}
        onBackToWorkspace={onBackToWorkspace}
      />
    );
  }

  return <EmptyState style={style} workspaceMode={workspaceMode} />;
}

function EmptyState({ style, workspaceMode }: { style: CSSProperties; workspaceMode: boolean }) {
  return (
    <main className="openpress-shell openpress-empty-state" style={style}>
      <section className="openpress-empty-state__panel">
        <p className="openpress-empty-state__eyebrow">OpenPress</p>
        <h1 className="openpress-empty-state__title">This document has no content yet.</h1>
        <p className="openpress-empty-state__body">
          Add React MDX chapter files under <code>press/chapters/**/content/</code>, then re-build.
        </p>
        {workspaceMode ? (
          <ol className="openpress-empty-state__steps">
            <li><code>npm run build</code> &nbsp;— validates and refreshes <code>public/openpress/document.json</code></li>
            <li>Reload this page</li>
          </ol>
        ) : (
          <p className="openpress-empty-state__body">
            (If you are the document author, run <code>npm run dev</code> locally to edit.)
          </p>
        )}
      </section>
    </main>
  );
}

function themeToCssVariables(theme?: Theme) {
  const style: CSSProperties & Record<`--${string}`, string> = {
    "--openpress-font-family": theme?.fontFamily ?? "'Noto Sans TC', 'PingFang TC', sans-serif",
    "--openpress-accent": theme?.accentColor ?? "#df4b21",
    "--openpress-text": theme?.textColor ?? "#20242a",
  };

  if (theme?.pageWidth) style["--openpress-page-width"] = theme.pageWidth;
  if (theme?.pageHeight) style["--openpress-page-height"] = theme.pageHeight;
  if (theme?.pageAspectRatio) style["--openpress-page-aspect-ratio"] = theme.pageAspectRatio;
  if (theme?.pageHeightRatio) style["--openpress-page-height-ratio"] = theme.pageHeightRatio;
  if (theme?.pagePadding) style["--openpress-page-padding"] = theme.pagePadding;

  return style;
}
