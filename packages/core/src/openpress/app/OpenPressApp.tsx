import { useCallback, useEffect, useState } from "react";
import { OpenPressRuntime } from "./OpenPressRuntime";
import { WorkspaceGalleryPage } from "./WorkspaceGalleryPage";
import { isLocalWorkspaceHost } from "../shared";
import type {
  DeploymentInfo,
  ReaderDocument,
  WorkspaceManifest,
  WorkspaceManifestPress,
} from "../document-model";
import { manifestHasMultiplePresses } from "../document-model";

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

  const refreshDocument = useCallback(async () => {
    const current = await Promise.resolve(state);
    if (current.status !== "ready") return;
    const url = pressDocumentUrl(current.manifest);
    const document = await loadReaderDocument(url);
    setState((latest) => {
      if (latest.status !== "ready") return latest;
      return { ...latest, document };
    });
  }, [state]);

  const enterPress = useCallback(async (press: WorkspaceManifestPress) => {
    setState({ status: "loading" });
    try {
      const [document, deploymentInfo, manifest] = await Promise.all([
        loadReaderDocument(press.documentUrl),
        loadDeploymentInfo(),
        loadWorkspaceManifest(),
      ]);
      setState({ status: "ready", document, deploymentInfo, manifest });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to load OpenPress document.",
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const [manifest, deploymentInfo] = await Promise.all([
          loadWorkspaceManifest(),
          loadDeploymentInfo(),
        ]);
        if (cancelled) return;

        // Multi-Press workspace at root URL → show gallery first.
        // Single-Press workspaces (and multi-Press at /:slug — routing
        // lands in a follow-up) load straight into the document.
        if (manifest && manifestHasMultiplePresses(manifest)) {
          setState({ status: "gallery", manifest, deploymentInfo });
          return;
        }

        const documentUrl = pressDocumentUrl(manifest);
        const document = await loadReaderDocument(documentUrl);
        if (cancelled) return;
        setState({ status: "ready", document, deploymentInfo, manifest });
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
  }, []);

  if (state.status === "loading") return <LoadingScreen />;

  if (state.status === "error") {
    return <div className="openpress-load-state openpress-load-state--error">{state.message}</div>;
  }

  if (state.status === "gallery") {
    return <WorkspaceGalleryPage manifest={state.manifest} onSelectPress={enterPress} />;
  }

  return (
    <OpenPressRuntime
      document={state.document}
      deploymentInfo={state.deploymentInfo}
      onDocumentRefresh={refreshDocument}
    />
  );
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

function pressDocumentUrl(manifest: WorkspaceManifest | null): string {
  if (!manifest || manifest.presses.length === 0) return "/openpress/document.json";
  return manifest.presses[0].documentUrl ?? "/openpress/document.json";
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
