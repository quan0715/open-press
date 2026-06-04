import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { PrintDocument, PublicViewer, SlidePublicViewer, SlidePresentationPage } from "../reader";
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
  // Active Press slug — supplied by OpenPressApp when the active document
  // came from a multi-Press workspace. The workbench passes this through to
  // useDeploymentWorkbench so the local PDF export endpoint can target the
  // right Press instead of defaulting to the first one and producing a
  // "0 pages observed" timeout.
  activeSlug?: string;
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
  activeSlug,
  onDocumentRefresh,
  onOpenPresentation,
  onExitPresentation,
  onBackToWorkspace,
}: OpenPressRuntimeProps) {
  const style = themeToCssVariables(document.theme);
  const htmlPages = document.blocks.filter((block): block is HtmlPageBlock => block.kind === "htmlPage");
  // The mode flags below all read window.location synchronously. They
  // would otherwise stay frozen at their mount-time values when
  // OpenPressApp re-renders us in response to a client-side URL change
  // (e.g. /<slug>/present -> /<slug>/preview after exiting the slide
  // presenter), so the SlidePresentationPage exits to the wrong
  // route-driven branch (PublicViewer instead of HtmlWorkbench) and the
  // user sees stale public-viewer chrome until a hard reload.
  // Bump a version on every pathname/search change so the memos
  // re-evaluate exactly when the URL does.
  const routeVersion = useLocationVersion();
  const activeRuntimeMode = useMemo<OpenPressRuntimeMode>(() => {
    if (runtimeMode) return runtimeMode;
    if (typeof window === "undefined") return "preview";
    return isPresentationModeLocation(window.location) ? "present" : "preview";
  }, [runtimeMode, routeVersion]);
  const workspaceMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isWorkspaceModeLocation(window.location);
  }, [routeVersion]);
  const printMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isPrintModeLocation(window.location);
  }, [routeVersion]);

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

    if (!workspaceMode && document.meta.type === "slides") {
      const slideDeploymentInfo = activeSlug
        ? { ...deploymentInfo, pdf: resolvePressPdfUrl(deploymentInfo.pdf, activeSlug) }
        : deploymentInfo;
      return (
        <SlidePublicViewer
          document={document}
          pages={htmlPages}
          style={style}
          deploymentInfo={slideDeploymentInfo}
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
        workspaceMode={workspaceMode}
        deploymentInfo={deploymentInfo}
        pressSlug={activeSlug ?? null}
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
          Add React MDX chapter files under <code>press/&lt;slug&gt;/chapters/**/content/</code>, then re-build.
        </p>
        {workspaceMode ? (
          <ol className="openpress-empty-state__steps">
            <li><code>npm run build</code> &nbsp;— validates and refreshes <code>public/openpress/workspace.json</code></li>
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

// Bump a counter whenever client-side navigation changes pathname /
// search / hash, so location-derived memos in OpenPressRuntime
// re-evaluate. popstate fires on browser back/forward; we also patch
// pushState / replaceState because the SPA itself calls those when
// the user opens a Press, exits a slide presenter, or toggles between
// /<slug>/preview and /<slug>/present.
function useLocationVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const bump = () => setVersion((value) => value + 1);
    window.addEventListener("popstate", bump);
    window.addEventListener("hashchange", bump);
    const history = window.history;
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);
    history.pushState = function patchedPushState(...args) {
      const result = originalPushState(...args);
      bump();
      return result;
    } as typeof history.pushState;
    history.replaceState = function patchedReplaceState(...args) {
      const result = originalReplaceState(...args);
      bump();
      return result;
    } as typeof history.replaceState;
    return () => {
      window.removeEventListener("popstate", bump);
      window.removeEventListener("hashchange", bump);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);
  return version;
}

function resolvePressPdfUrl(basePdfUrl: string | undefined, slug: string): string | undefined {
  if (!basePdfUrl) return undefined;
  const lastSlash = basePdfUrl.lastIndexOf("/");
  const dir = lastSlash >= 0 ? basePdfUrl.slice(0, lastSlash + 1) : "";
  const filename = lastSlash >= 0 ? basePdfUrl.slice(lastSlash + 1) : basePdfUrl;
  const dot = filename.lastIndexOf(".");
  const stem = dot >= 0 ? filename.slice(0, dot) : filename;
  const ext = dot >= 0 ? filename.slice(dot) : "";
  return `${dir}${stem}-${slug}${ext}`;
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
