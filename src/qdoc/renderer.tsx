import { useMemo, type CSSProperties } from "react";
import { QDocPrintDocument, QDocPublicViewer } from "./publicPage";
import { isPrintModeLocation, isWorkspaceModeLocation } from "./runtimeMode";
import { QDocHtmlWorkbench } from "./workbench";
import type {
  QDocDeploymentInfo,
  QDocDocument,
  QDocHtmlPageBlock,
  QDocTheme,
} from "./types";

interface QDocRendererProps {
  document: QDocDocument;
  deploymentInfo?: QDocDeploymentInfo;
}

export function QDocRenderer({
  document,
  deploymentInfo = { online: false },
}: QDocRendererProps) {
  const style = themeToCssVariables(document.theme);
  const htmlPages = document.blocks.filter((block): block is QDocHtmlPageBlock => block.kind === "htmlPage");
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
      return <QDocPrintDocument document={document} pages={htmlPages} style={style} />;
    }

    if (!workspaceMode) {
      return <QDocPublicViewer document={document} pages={htmlPages} style={style} deploymentInfo={deploymentInfo} />;
    }

    return (
      <QDocHtmlWorkbench
        document={document}
        pages={htmlPages}
        style={style}
        devMode={workspaceMode}
        deploymentInfo={deploymentInfo}
      />
    );
  }

  return <QDocEmptyState style={style} workspaceMode={workspaceMode} />;
}

function QDocEmptyState({ style, workspaceMode }: { style: CSSProperties; workspaceMode: boolean }) {
  return (
    <main className="qdoc-shell qdoc-empty-state" style={style}>
      <section className="qdoc-empty-state__panel">
        <p className="qdoc-empty-state__eyebrow">QDoc</p>
        <h1 className="qdoc-empty-state__title">This document has no content yet.</h1>
        <p className="qdoc-empty-state__body">
          Add React MDX chapter files under <code>document/chapters/**/content/</code>, then re-export.
        </p>
        {workspaceMode ? (
          <ol className="qdoc-empty-state__steps">
            <li><code>npm run qdoc:export</code> &nbsp;— refreshes <code>public/qdoc/document.json</code></li>
            <li>Reload this page</li>
          </ol>
        ) : (
          <p className="qdoc-empty-state__body">
            (If you are the document author, run <code>npm run dev</code> locally to edit.)
          </p>
        )}
      </section>
    </main>
  );
}

function themeToCssVariables(theme?: QDocTheme) {
  return {
    "--qdoc-page-width": theme?.pageWidth ?? "1120px",
    "--qdoc-page-height": theme?.pageHeight ?? "1584px",
    "--qdoc-page-padding": theme?.pagePadding ?? "84px",
    "--qdoc-font-family": theme?.fontFamily ?? "'Noto Sans TC', 'PingFang TC', sans-serif",
    "--qdoc-accent": theme?.accentColor ?? "#df4b21",
    "--qdoc-text": theme?.textColor ?? "#20242a",
  } as CSSProperties;
}
