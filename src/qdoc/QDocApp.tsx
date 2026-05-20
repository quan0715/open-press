import { useEffect, useState } from "react";
import { QDocRenderer } from "./renderer";
import { isLocalWorkspaceHost } from "./runtimeMode";
import type { QDocDeploymentInfo, QDocDocument } from "./types";

type LoadState =
  | { status: "loading" }
  | {
      status: "ready";
      document: QDocDocument;
      deploymentInfo: QDocDeploymentInfo;
    }
  | { status: "error"; message: string };

interface QDocDeployConfig {
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

const offlineDeploymentInfo: QDocDeploymentInfo = { online: false };

function QDocLoadingScreen() {
  return (
    <div className="qdoc-loading-screen" aria-label="載入中" role="status">
      <div className="qdoc-loading-screen__inner">
        <div className="qdoc-loading-dots" aria-hidden="true">
          <span /><span /><span />
        </div>
        <span className="qdoc-loading-screen__label">載入文件</span>
      </div>
    </div>
  );
}

export function QDocApp() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      try {
        const [response, deploymentInfo] = await Promise.all([
          fetch("/qdoc/document.json", { cache: "no-store" }),
          loadDeploymentInfo(),
        ]);
        if (!response.ok) {
          throw new Error(`Unable to load /qdoc/document.json (${response.status})`);
        }
        const document = (await response.json()) as QDocDocument;
        if (!cancelled) {
          setState({ status: "ready", document, deploymentInfo });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Unable to load QDoc document.",
          });
        }
      }
    }

    void loadDocument();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") return <QDocLoadingScreen />;

  if (state.status === "error") {
    return <div className="qdoc-load-state qdoc-load-state--error">{state.message}</div>;
  }

  return (
    <QDocRenderer
      document={state.document}
      deploymentInfo={state.deploymentInfo}
    />
  );
}

async function loadDeploymentInfo(): Promise<QDocDeploymentInfo> {
  if (typeof window !== "undefined" && isLocalWorkspaceHost(window.location.hostname)) {
    const localInfo = await loadDeploymentInfoFrom("/__qdoc/status");
    if (localInfo) return localInfo;
  }

  return (await loadDeploymentInfoFrom("/qdoc/deploy.json")) ?? offlineDeploymentInfo;
}

async function loadDeploymentInfoFrom(path: string): Promise<QDocDeploymentInfo | null> {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const config = (await response.json()) as QDocDeployConfig;
    return deploymentConfigToInfo(config);
  } catch {
    return null;
  }
}

function deploymentConfigToInfo(config: QDocDeployConfig): QDocDeploymentInfo {
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
