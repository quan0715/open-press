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

const EMPTY_STATE_CLASS = "openpress-shell openpress-empty-state grid min-h-screen place-items-center px-6 py-12";
const EMPTY_STATE_PANEL_CLASS = [
  "openpress-empty-state__panel max-w-[560px] rounded-lg border border-[var(--openpress-scrollbar-thumb)]",
  "bg-white/[0.03] px-8 py-9 text-[var(--openpress-text-on-dark,#f4f4f4)]",
].join(" ");
const EMPTY_STATE_EYEBROW_CLASS = [
  "openpress-empty-state__eyebrow m-0 mb-2 text-xs font-semibold uppercase tracking-[0.16em]",
  "text-[var(--openpress-text-secondary,#c6c6c6)]",
].join(" ");
const EMPTY_STATE_TITLE_CLASS = "openpress-empty-state__title m-0 mb-4 text-[22px] font-medium leading-[1.4]";
const EMPTY_STATE_BODY_CLASS = [
  "openpress-empty-state__body m-0 mb-4 text-sm leading-[1.6]",
  "text-[var(--openpress-text-secondary,#c6c6c6)]",
].join(" ");
const EMPTY_STATE_CODE_CLASS = [
  "rounded bg-white/[0.08] px-1.5 py-px font-mono text-[13px]",
].join(" ");
const EMPTY_STATE_STEPS_CLASS = [
  "openpress-empty-state__steps m-0 list-decimal pl-[1.2em] text-sm leading-[1.7]",
  "text-[var(--openpress-text-secondary,#c6c6c6)]",
].join(" ");
const EMPTY_STATE_STEP_CLASS = "mb-1";

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
  const skippedSlideIds = useMemo(
    () => new Set((document.source?.slides ?? [])
      .filter((slide) => slide.skip === true)
      .map((slide) => slide.id)),
    [document.source?.slides],
  );
  const presentationPages = useMemo(
    () => document.meta.type === "slides" && skippedSlideIds.size > 0
      ? htmlPages.filter((page) => typeof page.frameKey !== "string" || !skippedSlideIds.has(page.frameKey))
      : htmlPages,
    [document.meta.type, htmlPages, skippedSlideIds],
  );
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

  const printPages = useMemo(() => {
    if (!printMode) return htmlPages;
    const raw = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("pages") : null;
    if (!raw) return htmlPages;
    const indexes = new Set(raw.split(",").map(Number).filter((n) => Number.isInteger(n) && n >= 0));
    return htmlPages.filter((_, i) => indexes.has(i));
  }, [printMode, htmlPages, routeVersion]);

  if (htmlPages.length > 0) {
    if (printMode) {
      return <PrintDocument document={document} pages={printPages} style={style} />;
    }

    if (activeRuntimeMode === "present" && document.meta.type === "slides") {
      return (
        <SlidePresentationPage
          document={document}
          pages={presentationPages}
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
    <main className={EMPTY_STATE_CLASS} style={style}>
      <section className={EMPTY_STATE_PANEL_CLASS}>
        <p className={EMPTY_STATE_EYEBROW_CLASS}>OpenPress</p>
        <h1 className={EMPTY_STATE_TITLE_CLASS}>This document has no content yet.</h1>
        <p className={EMPTY_STATE_BODY_CLASS}>
          Add React MDX chapter files under <code className={EMPTY_STATE_CODE_CLASS}>press/&lt;slug&gt;/chapters/**/content/</code>, then re-build.
        </p>
        {workspaceMode ? (
          <ol className={EMPTY_STATE_STEPS_CLASS}>
            <li className={EMPTY_STATE_STEP_CLASS}>
              <code className={EMPTY_STATE_CODE_CLASS}>npm run build</code> &nbsp;— validates and refreshes <code className={EMPTY_STATE_CODE_CLASS}>public/openpress/workspace.json</code>
            </li>
            <li className={EMPTY_STATE_STEP_CLASS}>Reload this page</li>
          </ol>
        ) : (
          <p className={EMPTY_STATE_BODY_CLASS}>
            (If you are the document author, run <code className={EMPTY_STATE_CODE_CLASS}>npm run dev</code> locally to edit.)
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
