import { useCallback, useEffect, useState } from "react";
import { OpenPressRuntime, type OpenPressRuntimeMode } from "./OpenPressRuntime";
import { WorkspaceGalleryPage } from "./WorkspaceGalleryPage";
import { isLocalWorkspaceHost } from "../shared";
import type {
  DeploymentInfo,
  ReaderDocument,
  WorkspaceManifest,
  WorkspaceManifestPress,
} from "../document-model";
import { findManifestPress, manifestHasMultiplePresses } from "../document-model";

type LoadState =
  | { status: "loading" }
  | {
      // Gallery state — shown for multi-Press workspaces at the root URL.
      // Single-Press workspaces never reach this state.
      status: "gallery";
      manifest: WorkspaceManifest;
      deploymentInfo: DeploymentInfo;
    }
  | {
      status: "ready";
      document: ReaderDocument;
      deploymentInfo: DeploymentInfo;
      manifest: WorkspaceManifest | null;
      // Empty string for single-Press workspaces (no slug routing needed)
      // or for the root entry of a multi-Press workspace. Otherwise the
      // active press's slug — used by refresh/back/forward to re-resolve.
      activeSlug: string;
      runtimeMode: OpenPressRuntimeMode;
    }
  | { status: "error"; message: string };

interface WorkspaceRoute {
  slug: string;
  mode: OpenPressRuntimeMode;
}

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

function LoadingScreen() {
  return (
    <div className="openpress-loading-screen" aria-label="載入中" role="status">
      <div className="openpress-loading-screen__inner">
        <div className="openpress-loading-dots" aria-hidden="true">
          <span /><span /><span />
        </div>
        <span className="openpress-loading-screen__label">載入文件</span>
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
    route: WorkspaceRoute,
    deploymentInfo: DeploymentInfo,
  ) => {
    // No manifest (legacy deploy): always load /openpress/document.json.
    if (!manifest || manifest.presses.length === 0) {
      const document = await loadReaderDocument("/openpress/document.json");
      setState({
        status: "ready",
        document,
        deploymentInfo,
        manifest,
        activeSlug: "",
        runtimeMode: resolveRuntimeMode(document, route.mode),
      });
      return;
    }

    // Empty slug + multi-Press: show gallery. Empty slug + single-Press:
    // load the only press. Same expression handles both — array length
    // is the only thing that matters.
    const normalizedSlug = normalizeSlug(route.slug);
    if (!normalizedSlug && manifestHasMultiplePresses(manifest)) {
      setState({ status: "gallery", manifest, deploymentInfo });
      return;
    }

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
      runtimeMode: resolveRuntimeMode(document, route.mode),
    });
  }, []);

  const refreshDocument = useCallback(async () => {
    if (state.status !== "ready") return;
    const press = state.manifest
      ? findManifestPress(state.manifest, state.activeSlug)
      : null;
    const url = press?.documentUrl ?? "/openpress/document.json";
    const document = await loadReaderDocument(url);
    setState((latest) => {
      if (latest.status !== "ready") return latest;
      return { ...latest, document };
    });
  }, [state]);

  // Gallery click → pushState + load. Bypasses resolveFromRoute's
  // "empty slug + multi-Press → gallery" branch: an explicit click on
  // the unslugged root Press must enter it, not bounce back to gallery.
  const enterPress = useCallback(async (press: WorkspaceManifestPress) => {
    if (state.status !== "gallery") return;
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
      const manifest = state.status === "gallery"
        ? state.manifest
        : state.status === "ready"
        ? state.manifest
        : null;
      const deploymentInfo = state.status === "gallery" || state.status === "ready"
        ? state.deploymentInfo
        : offlineDeploymentInfo;
      void resolveFromRoute(manifest, currentRouteFromLocation(), deploymentInfo);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [state, resolveFromRoute]);

  if (state.status === "loading") return <LoadingScreen />;

  if (state.status === "error") {
    return <div className="openpress-load-state openpress-load-state--error">{state.message}</div>;
  }

  if (state.status === "gallery") {
    return <WorkspaceGalleryPage manifest={state.manifest} onSelectPress={enterPress} />;
  }

  // Only multi-Press workspaces have a gallery to go back to. Single-Press
  // workspaces don't render the button (no destination exists).
  const backToWorkspace = state.manifest && manifestHasMultiplePresses(state.manifest)
    ? () => {
        if (state.status !== "ready" || !state.manifest) return;
        pushPressRoute("", "preview");
        setState({
          status: "gallery",
          manifest: state.manifest,
          deploymentInfo: state.deploymentInfo,
        });
      }
    : undefined;

  const presentationSlug = state.activeSlug || currentRouteFromLocation().slug;
  const openPresentation = state.document.meta.type === "slides" && presentationSlug
    ? (pageIndex: number) => {
        openPressRoute(presentationSlug, "present", pageIndex, { fullscreen: true });
      }
    : undefined;

  const exitPresentation = state.document.meta.type === "slides"
    ? (pageIndex: number) => {
        if (state.status !== "ready") return;
        const slug = state.activeSlug || currentRouteFromLocation().slug;
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
      onDocumentRefresh={refreshDocument}
      onOpenPresentation={openPresentation}
      onExitPresentation={exitPresentation}
      onBackToWorkspace={backToWorkspace}
    />
  );
}

function currentRouteFromLocation(): WorkspaceRoute {
  if (typeof window === "undefined") return { slug: "", mode: "preview" };
  return routeFromWorkspacePathname(window.location.pathname);
}

function normalizeSlug(raw: string): string {
  return raw.replace(/^\/+|\/+$/g, "");
}

function routeFromWorkspacePathname(pathname: string): WorkspaceRoute {
  const normalized = normalizeSlug(pathname);
  if (!normalized || normalized === "workspace") return { slug: "", mode: "preview" };

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 2 && (segments[1] === "preview" || segments[1] === "present")) {
    return { slug: segments[0] ?? "", mode: segments[1] };
  }

  // Legacy static/public route compatibility. New workspace navigation
  // writes /workspace and /<press-slug>/preview.
  return { slug: normalized, mode: "preview" };
}

function pushPressRoute(slug: string, mode: OpenPressRuntimeMode, pageIndex?: number) {
  if (typeof window === "undefined") return;
  const target = buildPressRoute(slug, mode, pageIndex);
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` === target) return;
  window.history.pushState({}, "", target);
}

function openPressRoute(
  slug: string,
  mode: OpenPressRuntimeMode,
  pageIndex?: number,
  options: { fullscreen?: boolean } = {},
) {
  if (typeof window === "undefined") return;
  window.open(buildPressRoute(slug, mode, pageIndex, options), "_blank", "noopener,noreferrer");
}

function buildPressRoute(
  slug: string,
  mode: OpenPressRuntimeMode,
  pageIndex?: number,
  options: { fullscreen?: boolean } = {},
) {
  const normalizedSlug = normalizeSlug(slug);
  const pathname = normalizedSlug ? `/${normalizedSlug}/${mode}` : "/workspace";
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
  // Optional — older deployments don't ship workspace.json. The reader
  // falls back to /openpress/document.json directly when missing, which
  // matches pre-v1.0 behavior.
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
