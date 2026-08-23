import { useCallback, useEffect, useState } from "react";
import { OpenPressRuntime, type OpenPressRuntimeMode } from "./OpenPressRuntime";
import { WorkspaceGalleryPage } from "./WorkspaceGalleryPage";
import { isLocalWorkspaceHost, ToastProvider } from "../shared";
import type {
  DeploymentInfo,
  DocumentRefreshOptions,
  ReaderDocument,
  WorkspaceManifest,
  WorkspaceManifestPress,
} from "../document-model";
import { findManifestPress, manifestHasMultiplePresses } from "../document-model";
import {
  buildWorkspaceDestination,
  normalizeWorkspaceSlug,
  parseWorkspaceDestination,
  type WorkspaceDestination,
} from "./workspaceRoute";

type LoadState =
  | { status: "loading" }
  | {
      status: "workspace";
      view: "documents" | "settings";
      manifest: WorkspaceManifest;
      deploymentInfo: DeploymentInfo;
    }
  | {
      status: "ready";
      document: ReaderDocument;
      deploymentInfo: DeploymentInfo;
      manifest: WorkspaceManifest | null;
      // Active Press slug, used by refresh/back/forward to re-resolve.
      activeSlug: string;
      runtimeMode: OpenPressRuntimeMode;
    }
  | { status: "error"; message: string };

interface DeployConfig {
  pdf?: string;
  deployed_at?: string;
  public_url?: string;
  dirty?: boolean;
  deploy_configured?: boolean;
  deploy_adapter?: string;
  deploy_source?: string;
  deploy_project_name?: string | null;
  deploy_setup_message?: string;
}

const offlineDeploymentInfo: DeploymentInfo = { online: false };

const LOADING_SCREEN_CLASS = "openpress-loading-screen fixed inset-0 flex items-center justify-center bg-[#141414]";
const LOADING_SCREEN_INNER_CLASS = "openpress-loading-screen__inner flex flex-col items-center gap-5";
const LOADING_DOTS_CLASS = "openpress-loading-dots flex gap-2";
const LOADING_DOT_CLASS = "h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--openpress-accent,#e5c97a)]";
const LOADING_LABEL_CLASS = "openpress-loading-screen__label text-xs uppercase tracking-[0.12em] text-[rgb(200_200_200_/_0.40)]";
const LOAD_STATE_CLASS = [
  "openpress-load-state openpress-load-state--error fixed left-1/2 top-4 z-20 -translate-x-1/2",
  "border border-white/15 bg-[#141414]/85 px-3 py-2 text-[13px] text-[#d8dadd]",
].join(" ");
const REFRESH_RENDER_TIMEOUT_MS = 15_000;
const REFRESH_RENDER_POLL_MS = 160;

function LoadingScreen() {
  return (
    <div className={LOADING_SCREEN_CLASS} aria-label="載入中" role="status">
      <div className={LOADING_SCREEN_INNER_CLASS}>
        <div className={LOADING_DOTS_CLASS} aria-hidden="true">
          <span className={LOADING_DOT_CLASS} />
          <span className={`${LOADING_DOT_CLASS} [animation-delay:0.2s]`} />
          <span className={`${LOADING_DOT_CLASS} [animation-delay:0.4s]`} />
        </div>
        <span className={LOADING_LABEL_CLASS}>載入文件</span>
      </div>
    </div>
  );
}

export function OpenPressApp() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  // Single resolution function — same code path for "boot from URL",
  // "click gallery card", and "browser back button". Given a manifest
  // + route, decides whether to render gallery or load a press.
  const resolveFromRoute = useCallback(async (
    manifest: WorkspaceManifest | null,
    destination: WorkspaceDestination,
    deploymentInfo: DeploymentInfo,
  ) => {
    if (!manifest || manifest.presses.length === 0) {
      setState({
        status: "error",
        message: "OpenPress workspace manifest is missing or empty. Run open-press render to generate /openpress/workspace.json.",
      });
      return;
    }

    if (destination.kind === "settings") {
      setState({ status: "workspace", view: "settings", manifest, deploymentInfo });
      return;
    }

    if (destination.kind === "documents" && manifestHasMultiplePresses(manifest)) {
      setState({ status: "workspace", view: "documents", manifest, deploymentInfo });
      return;
    }

    const normalizedSlug = destination.kind === "press"
      ? normalizeWorkspaceSlug(destination.slug)
      : "";
    const press = normalizedSlug
      ? findManifestPress(manifest, normalizedSlug)
      : manifest.presses[0];
    if (!press) {
      setState({
        status: "error",
        message: `Unknown document slug "/${normalizedSlug}". Known: ${manifest.presses.map((p) => `/${p.slug}`).join(", ")}.`,
      });
      return;
    }
    const document = await loadReaderDocument(press.documentUrl);
    setState({
      status: "ready",
      document,
      deploymentInfo,
      manifest,
      activeSlug: press.slug,
      runtimeMode: resolveRuntimeMode(document, destination.kind === "press" ? destination.mode : "preview"),
    });
  }, []);

  const refreshDocument = useCallback(async (options?: DocumentRefreshOptions) => {
    if (state.status !== "ready") return;
    const press = state.manifest
      ? findManifestPress(state.manifest, state.activeSlug)
      : null;
    if (!press) return;
    const nextDocument = await loadReaderDocumentWhenReady(press.documentUrl, options);
    setState((latest) => {
      if (latest.status !== "ready") return latest;
      // Preserve block object references when html is unchanged so that
      // PageHtmlContent (memoized by html string) can bail out and avoid
      // resetting innerHTML — which would destroy running CSS animation state.
      const prevBlocks = latest.document.blocks;
      const stableBlocks = nextDocument.blocks.map((block) => {
        if (block.kind !== "htmlPage") return block;
        const prev = prevBlocks.find((b) => b.kind === "htmlPage" && b.id === block.id);
        if (prev && prev.kind === "htmlPage" && prev.html === block.html) return prev;
        return block;
      });
      const document = stableBlocks === nextDocument.blocks
        ? nextDocument
        : { ...nextDocument, blocks: stableBlocks };
      return { ...latest, document };
    });
  }, [state]);

  // Gallery click → pushState + load. Bypasses resolveFromRoute's
  // "empty slug + multi-Press → gallery" branch.
  const enterPress = useCallback(async (press: WorkspaceManifestPress) => {
    if (state.status !== "workspace") return;
    pushPressRoute(press.slug, "preview");
    setState({ status: "loading" });
    try {
      const document = await loadReaderDocument(press.documentUrl);
      setState({
        status: "ready",
        document,
        deploymentInfo: state.deploymentInfo,
        manifest: state.manifest,
        activeSlug: press.slug,
        runtimeMode: "preview",
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to load OpenPress document.",
      });
    }
  }, [state]);

  const switchPress = useCallback(async (press: WorkspaceManifestPress) => {
    if (state.status !== "ready" || !state.manifest) return;
    if (press.slug === state.activeSlug) return;
    pushPressRoute(press.slug, "preview");
    setState({ status: "loading" });
    try {
      const document = await loadReaderDocument(press.documentUrl);
      setState({
        status: "ready",
        document,
        deploymentInfo: state.deploymentInfo,
        manifest: state.manifest,
        activeSlug: press.slug,
        runtimeMode: "preview",
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to load OpenPress document.",
      });
    }
  }, [state]);

  const openWorkspaceView = useCallback(async (view: "documents" | "settings") => {
    const workspaceState = state.status === "workspace" || state.status === "ready" ? state : null;
    if (!workspaceState?.manifest) return;
    const destination: WorkspaceDestination = { kind: view };
    pushWorkspaceRoute(destination);

    if (view === "settings" || manifestHasMultiplePresses(workspaceState.manifest)) {
      setState({
        status: "workspace",
        view,
        manifest: workspaceState.manifest,
        deploymentInfo: workspaceState.deploymentInfo,
      });
      return;
    }

    setState({ status: "loading" });
    await resolveFromRoute(workspaceState.manifest, destination, workspaceState.deploymentInfo);
  }, [resolveFromRoute, state]);

  // Bootstrap: read URL → load manifest + deploy info → resolve.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const [manifest, deploymentInfo] = await Promise.all([
          loadWorkspaceManifest(),
          loadDeploymentInfo(),
        ]);
        if (cancelled) return;
        await resolveFromRoute(manifest, currentRouteFromLocation(), deploymentInfo);
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Unable to load OpenPress document.",
          });
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [resolveFromRoute]);

  // Back / forward button — re-resolve from the new URL.
  useEffect(() => {
    function onPopState() {
      if (state.status === "loading") return;
      const manifest = state.status === "workspace"
        ? state.manifest
        : state.status === "ready"
        ? state.manifest
        : null;
      const deploymentInfo = state.status === "workspace" || state.status === "ready"
        ? state.deploymentInfo
        : offlineDeploymentInfo;
      void resolveFromRoute(manifest, currentRouteFromLocation(), deploymentInfo);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [state, resolveFromRoute]);

  if (state.status === "loading") return <LoadingScreen />;

  if (state.status === "error") {
    return <div className={LOAD_STATE_CLASS}>{state.message}</div>;
  }

  if (state.status === "workspace") {
    return (
      <ToastProvider>
        <WorkspaceGalleryPage
          manifest={state.manifest}
          view={state.view}
          onSelectPress={enterPress}
          onOpenDocuments={() => void openWorkspaceView("documents")}
          onOpenSettings={() => void openWorkspaceView("settings")}
        />
      </ToastProvider>
    );
  }

  // Only multi-Press workspaces have a gallery to go back to. Single-Press
  // workspaces don't render the button (no destination exists).
  const backToWorkspace = state.manifest && manifestHasMultiplePresses(state.manifest)
    ? () => {
        if (state.status !== "ready" || !state.manifest) return;
        void openWorkspaceView("documents");
      }
    : undefined;

  const currentDestination = currentRouteFromLocation();
  const routeSlug = currentDestination.kind === "press" ? currentDestination.slug : "";
  const presentationSlug = state.activeSlug || routeSlug;
  const openPresentation = state.document.meta.type === "slides" && presentationSlug
    ? (pageIndex: number) => {
        const slug = normalizeWorkspaceSlug(presentationSlug);
        pushPressRoute(slug, "present", pageIndex);
        setState((latest) => latest.status === "ready"
          ? { ...latest, runtimeMode: "present" }
          : latest);
      }
    : undefined;

  const exitPresentation = state.document.meta.type === "slides"
    ? (pageIndex: number) => {
        if (state.status !== "ready") return;
        // Exit fullscreen before returning to the workbench.
        const activeDoc = globalThis.document;
        if (activeDoc?.fullscreenElement && activeDoc?.exitFullscreen) {
          void activeDoc.exitFullscreen().catch(() => {});
        }
        const destination = currentRouteFromLocation();
        const slug = state.activeSlug || (destination.kind === "press" ? destination.slug : "");
        if (slug) pushPressRoute(slug, "preview", pageIndex);
        setState((latest) => latest.status === "ready"
          ? { ...latest, runtimeMode: "preview" }
          : latest);
      }
    : undefined;

  return (
    <OpenPressRuntime
      document={state.document}
      runtimeMode={state.runtimeMode}
      deploymentInfo={state.deploymentInfo}
      activeSlug={state.activeSlug}
      workspacePresses={state.manifest?.presses}
      onSelectWorkspacePress={switchPress}
      onDocumentRefresh={refreshDocument}
      onOpenPresentation={openPresentation}
      onExitPresentation={exitPresentation}
      onBackToWorkspace={backToWorkspace}
      onOpenWorkspaceSettings={() => void openWorkspaceView("settings")}
    />
  );
}

function currentRouteFromLocation(): WorkspaceDestination {
  if (typeof window === "undefined") return { kind: "documents" };
  return parseWorkspaceDestination(window.location.pathname);
}

function pushWorkspaceRoute(destination: WorkspaceDestination) {
  if (typeof window === "undefined") return;
  const target = buildWorkspaceDestination(destination);
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` === target) return;
  window.history.pushState({}, "", target);
}

function pushPressRoute(slug: string, mode: OpenPressRuntimeMode, pageIndex?: number) {
  if (typeof window === "undefined") return;
  const target = buildPressRoute(slug, mode, pageIndex);
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` === target) return;
  window.history.pushState({}, "", target);
}

function buildPressRoute(
  slug: string,
  mode: OpenPressRuntimeMode,
  pageIndex?: number,
  options: { fullscreen?: boolean } = {},
) {
  const normalizedSlug = normalizeWorkspaceSlug(slug);
  const pathname = normalizedSlug
    ? buildWorkspaceDestination({ kind: "press", slug: normalizedSlug, mode })
    : buildWorkspaceDestination({ kind: "documents" });
  const search = mode === "present" && options.fullscreen ? "?fullscreen=1" : "";
  const pageHash = typeof pageIndex === "number"
    ? `#page-${String(pageIndex + 1).padStart(2, "0")}`
    : "";
  return `${pathname}${search}${pageHash}`;
}

function resolveRuntimeMode(document: ReaderDocument, requestedMode: OpenPressRuntimeMode): OpenPressRuntimeMode {
  if (requestedMode === "present" && document.meta.type === "slides") return "present";
  return "preview";
}

async function loadWorkspaceManifest(): Promise<WorkspaceManifest | null> {
  try {
    const response = await fetch("/openpress/workspace.json", { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as WorkspaceManifest;
  } catch {
    return null;
  }
}

async function loadReaderDocument(url: string): Promise<ReaderDocument> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load ${url} (${response.status})`);
  }
  return (await response.json()) as ReaderDocument;
}

async function loadReaderDocumentWhenReady(
  url: string,
  options?: DocumentRefreshOptions,
): Promise<ReaderDocument> {
  const expectedRenderId = options?.expectedRenderId?.trim();
  if (!expectedRenderId) return loadReaderDocument(url);

  const startedAt = Date.now();
  let attempt = 0;
  let lastRenderId = "";
  let lastError = "";
  while (Date.now() - startedAt <= REFRESH_RENDER_TIMEOUT_MS) {
    try {
      const document = await loadReaderDocument(cacheBustedDocumentUrl(url, `${expectedRenderId}-${attempt}`));
      lastRenderId = document.meta.renderId ?? "";
      lastError = "";
      if (lastRenderId === expectedRenderId) return document;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    attempt += 1;
    await wait(REFRESH_RENDER_POLL_MS);
  }

  const lastObserved = lastRenderId || (lastError ? `error: ${lastError}` : "none");
  throw new Error(
    `Rendered document did not reach ${expectedRenderId}. Last observed: ${lastObserved}.`,
  );
}

function cacheBustedDocumentUrl(url: string, token: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}openpress_render_wait=${encodeURIComponent(token)}`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadDeploymentInfo(): Promise<DeploymentInfo> {
  if (typeof window !== "undefined" && isLocalWorkspaceHost(window.location.hostname)) {
    const localInfo = await loadDeploymentInfoFrom("/__openpress/status");
    if (localInfo) return localInfo;
  }

  return (await loadDeploymentInfoFrom("/openpress/deploy.json")) ?? offlineDeploymentInfo;
}

async function loadDeploymentInfoFrom(path: string): Promise<DeploymentInfo | null> {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const config = (await response.json()) as DeployConfig;
    return deploymentConfigToInfo(config);
  } catch {
    return null;
  }
}

function deploymentConfigToInfo(config: DeployConfig): DeploymentInfo {
  const configured = config.deploy_configured !== false;
  return {
    online: configured && Boolean(config.deployed_at || config.public_url),
    deployedAt: config.deployed_at,
    pdf: typeof config.pdf === "string" ? config.pdf : undefined,
    publicUrl: typeof config.public_url === "string" ? config.public_url : undefined,
    dirty: config.dirty === true,
    configured,
    adapter: typeof config.deploy_adapter === "string" ? config.deploy_adapter : undefined,
    source: typeof config.deploy_source === "string" ? config.deploy_source : undefined,
    projectName: typeof config.deploy_project_name === "string" ? config.deploy_project_name : undefined,
    setupMessage: typeof config.deploy_setup_message === "string" ? config.deploy_setup_message : undefined,
  };
}
