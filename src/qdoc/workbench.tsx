import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { BookOpen, ExternalLink, Eye, FileText, FolderOpen, Rocket, X } from "lucide-react";
import {
  collectBookmarkIndex,
  collectContentSourceIndex,
  collectMediaAssetIndex,
} from "./indexes";
import {
  createProjectComponentEntries,
  createProjectComponentUsages,
  createProjectMarkdownEntries,
  QDOC_PROJECT_COMPONENT_LIBRARY_KEY,
  QDOC_PROJECT_IMAGE_GALLERY_KEY,
  QDocProjectEntryPanel,
  QDocProjectWorkspace,
} from "./projectWorkspace";
import { paginateQDocSourcePages, type PaginatedQDocPage } from "./pagination";
import {
  numberQDocSourceHeadings,
  PUBLIC_DRAWER_BREAKPOINT,
  QDocPublicPage,
  useQDocViewMode,
} from "./publicPage";
import { getQDocProjectIdentity } from "./projectIdentity";
import { buildPublicPreviewHref, isLocalWorkspaceHost } from "./runtimeMode";
import { useQDocReaderRuntime } from "./readerRuntime";
import type { QDocDeploymentInfo, QDocDocument, QDocHtmlPageBlock } from "./types";
import { QDocBookmarks, QDocCurrentPagePanel } from "./workbenchPanels";
import type { QDocDisplayPage } from "./workbenchTypes";

type QDocWorkspaceView = "document" | "project";
type DeployStatus = "idle" | "deploying" | "deployed" | "unavailable" | "failed" | "setup";
type PdfActionStatus = "idle" | "generating" | "opening" | "failed";

function getInitialWorkspaceView(): QDocWorkspaceView {
  if (typeof window === "undefined") return "document";
  const workspace = new URLSearchParams(window.location.search).get("workspace");
  if (workspace === "project") return "project";
  return "document";
}

function QDocDevWorkspaceSwitcher({
  workspaceView,
  onOpenWorkspace,
}: {
  workspaceView: QDocWorkspaceView;
  onOpenWorkspace: (view: QDocWorkspaceView) => void;
}) {
  const items: Array<{ view: QDocWorkspaceView; label: string; icon: typeof FileText }> = [
    { view: "document", label: "文件", icon: FileText },
    { view: "project", label: "專案", icon: FolderOpen },
  ];

  return (
    <nav className="qdoc-dev-workspace-switcher" data-qdoc-dev-workspace-switcher aria-label="Workspace">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            type="button"
            className={workspaceView === item.view ? "is-active" : ""}
            aria-pressed={workspaceView === item.view}
            onClick={() => onOpenWorkspace(item.view)}
            key={item.view}
          >
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function QDocHtmlWorkbench({
  document,
  pages,
  style,
  devMode,
  deploymentInfo,
}: {
  document: QDocDocument;
  pages: Array<QDocHtmlPageBlock>;
  style: CSSProperties;
  devMode: boolean;
  deploymentInfo: QDocDeploymentInfo;
}) {
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);
  const numberedPages = useMemo(() => numberQDocSourceHeadings(pages), [pages]);
  const viewModeState = useQDocViewMode();
  const { viewMode } = viewModeState;
  const [paginatedPages, setPaginatedPages] = useState<PaginatedQDocPage[] | null>(null);
  const displayPages: QDocDisplayPage[] = viewMode === "paged" ? (paginatedPages ?? numberedPages) : numberedPages;
  const contentItems = useMemo(() => collectContentSourceIndex(displayPages), [displayPages]);
  const mediaAssets = useMemo(() => collectMediaAssetIndex(displayPages), [displayPages]);
  const projectEntries = useMemo(() => createProjectMarkdownEntries(contentItems), [contentItems]);
  const projectComponentEntries = useMemo(() => createProjectComponentEntries(), []);
  const projectComponentUsages = useMemo(() => createProjectComponentUsages(displayPages), [displayPages]);
  const [workspaceView, setWorkspaceView] = useState<QDocWorkspaceView>(getInitialWorkspaceView);
  const bookmarks = useMemo(() => collectBookmarkIndex(displayPages), [displayPages]);
  const reader = useQDocReaderRuntime({ pageCount: Math.max(displayPages.length, 1), rightPanelBreakpoint: PUBLIC_DRAWER_BREAKPOINT });
  const [projectSelectedKey, setProjectSelectedKey] = useState<string | null>(null);
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("idle");
  const [pdfActionStatus, setPdfActionStatus] = useState<PdfActionStatus>("idle");
  const [currentDeploymentInfo, setCurrentDeploymentInfo] = useState(deploymentInfo);
  const projectSelectedKeyExists = projectSelectedKey === QDOC_PROJECT_IMAGE_GALLERY_KEY
    || projectSelectedKey === QDOC_PROJECT_COMPONENT_LIBRARY_KEY
    || projectEntries.some((item) => item.path === projectSelectedKey);
  const activeProjectKey = projectSelectedKeyExists
    ? projectSelectedKey
    : (projectEntries[0]?.path ?? (mediaAssets.length > 0 ? QDOC_PROJECT_IMAGE_GALLERY_KEY : QDOC_PROJECT_COMPONENT_LIBRARY_KEY));
  const selectedProjectEntry = projectEntries.find((item) => item.path === activeProjectKey) ?? projectEntries[0];
  const staticPdfHref = currentDeploymentInfo.pdf;
  const projectIdentity = getQDocProjectIdentity(document.meta);
  const localDeployEnabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isLocalWorkspaceHost(window.location.hostname);
  }, []);
  const deploymentStatusDescription = deploymentStatusText(currentDeploymentInfo, deployStatus);
  const deploymentStatusLabelText = deploymentStatusSummary(currentDeploymentInfo, deployStatus);
  const pdfButtonText = workbenchPdfButtonText(localDeployEnabled, pdfActionStatus, staticPdfHref);
  const pdfStatusMessage = workbenchPdfStatusMessage(localDeployEnabled, pdfActionStatus);
  const pdfButtonDisabled = localDeployEnabled ? pdfActionStatus === "generating" || pdfActionStatus === "opening" : !staticPdfHref;
  const activePaginatedReady = viewMode === "reading" || Boolean(paginatedPages);
  const publicPreviewHref = useMemo(() => {
    if (typeof window === "undefined") return "/";
    return buildPublicPreviewHref(window.location.href, workspaceView === "document" ? reader.currentPageIndex : undefined);
  }, [reader.currentPageIndex, workspaceView]);

  const handleDeploy = async () => {
    if (deployStatus === "deploying") return;
    if (currentDeploymentInfo.configured === false) {
      setDeployStatus("setup");
      return;
    }
    setDeployStatus("deploying");
    try {
      const response = await fetch("/__qdoc/deploy", { method: "POST" });
      if (response.status === 404 || response.status === 405) {
        setDeployStatus("unavailable");
        return;
      }
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const result = parseDeployError(text);
        if (result?.deploy_configured === false) {
          setCurrentDeploymentInfo((info) => ({
            ...info,
            configured: false,
            adapter: result.deploy_adapter ?? info.adapter,
            source: result.deploy_source ?? info.source,
            projectName: result.deploy_project_name ?? info.projectName,
            setupMessage: result.message ?? info.setupMessage,
          }));
          setDeployStatus("setup");
          return;
        }
        console.error("QDoc deploy failed", text);
        setDeployStatus("failed");
        return;
      }
      const result = (await response.json().catch(() => null)) as { deployed_at?: string; pdf?: string; public_url?: string } | null;
      setCurrentDeploymentInfo((info) => ({
        online: true,
        deployedAt: result?.deployed_at ?? new Date().toISOString(),
        pdf: result?.pdf ?? info.pdf ?? __QDOC_PDF_HREF__,
        publicUrl: result?.public_url ?? info.publicUrl,
        dirty: false,
      }));
      setDeployStatus("deployed");
      setTimeout(() => setDeployStatus("idle"), 3200);
    } catch (error) {
      console.error("QDoc deploy unavailable", error);
      setDeployStatus("unavailable");
    }
  };

  const handleOpenLatestLocalPdf = async () => {
    if (pdfActionStatus === "generating") return;
    setPdfActionStatus("generating");
    try {
      const response = await fetch("/__qdoc/local-pdf-export", { method: "POST" });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Local PDF export failed with status ${response.status}`);
      }
      const result = (await response.json().catch(() => null)) as { pdf?: string } | null;
      const pdfHref = result?.pdf ?? "/__qdoc/local-pdf-file";
      setPdfActionStatus("opening");
      window.setTimeout(() => window.location.assign(pdfHref), 180);
    } catch (error) {
      console.error("QDoc local PDF export failed", error);
      setPdfActionStatus("failed");
    }
  };

  const handleOpenWorkbenchPdf = () => {
    if (localDeployEnabled) {
      void handleOpenLatestLocalPdf();
      return;
    }
    if (!staticPdfHref) return;
    window.open(staticPdfHref, "_blank", "noopener,noreferrer");
  };

  const selectWorkspacePage = (pageIndex: number, options?: { behavior?: ScrollBehavior }) => {
    reader.setPage(pageIndex, options);
    if (typeof window !== "undefined" && window.innerWidth < PUBLIC_DRAWER_BREAKPOINT && reader.rightPanelOpen) {
      reader.toggleRightPanel();
    }
  };

  const openWorkspace = (view: QDocWorkspaceView) => {
    setWorkspaceView(view);
    if (view !== "document" || typeof window === "undefined") return;
    window.requestAnimationFrame(() => reader.setPage(reader.currentPageIndex, { behavior: "auto" }));
  };

  useLayoutEffect(() => {
    setPaginatedPages(null);
  }, [numberedPages]);

  useLayoutEffect(() => {
    if (workspaceView !== "document" || viewMode !== "paged" || paginatedPages) return undefined;
    const sourceContainer = sourceContainerRef.current;
    if (!sourceContainer) return undefined;

    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      const nextPages = paginateQDocSourcePages(sourceContainer, numberedPages);
      if (!cancelled) setPaginatedPages(nextPages);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [numberedPages, paginatedPages, viewMode, workspaceView]);

  const actionSection = (
    <section className="qdoc-public-action-section" aria-label="輸出">
      <span className="qdoc-public-action-heading">輸出</span>
      <div className="qdoc-public-action-list" aria-label="輸出操作">
        <a
          className="qdoc-public-action-entry qdoc-public-preview-link"
          data-qdoc-open-public-preview
          href={publicPreviewHref}
          target="_blank"
          rel="noreferrer"
          aria-label="開啟公開預覽"
        >
          <Eye aria-hidden="true" />
          <span className="qdoc-public-action-entry__label">公開預覽</span>
        </a>
        <button
          type="button"
          className="qdoc-public-action-entry"
          data-qdoc-public-export
          disabled={pdfButtonDisabled}
          onClick={handleOpenWorkbenchPdf}
        >
          <ExternalLink aria-hidden="true" />
          <span className="qdoc-public-action-entry__label">{pdfButtonText}</span>
          {pdfStatusMessage ? (
            <span className="qdoc-dev-pdf-status" data-qdoc-pdf-status={pdfActionStatus} role="status" aria-live="polite">
              <span className="qdoc-dev-pdf-status__spinner" aria-hidden="true" />
              <span>{pdfStatusMessage}</span>
            </span>
          ) : null}
        </button>
        {localDeployEnabled ? (
          <button
            type="button"
            className="qdoc-public-action-entry"
            data-qdoc-deploy
            data-qdoc-deploy-status={deploymentStatusKind(currentDeploymentInfo, deployStatus)}
            data-deploy-status={deployStatus}
            disabled={deployStatus === "deploying" || deployStatus === "unavailable" || currentDeploymentInfo.configured === false}
            onClick={handleDeploy}
            title={deploymentStatusDescription}
            aria-label={deploymentStatusDescription}
          >
            <Rocket aria-hidden="true" />
            <span className="qdoc-public-action-entry__label">{deployButtonText(currentDeploymentInfo, deployStatus)}</span>
            <span
              className="qdoc-dev-deploy-status"
              data-qdoc-deploy-status={deploymentStatusKind(currentDeploymentInfo, deployStatus)}
              role="status"
              aria-live="polite"
            >
              <span className="qdoc-dev-deploy-status__dot" aria-hidden="true" />
              <span>{deploymentStatusLabelText}</span>
            </span>
          </button>
        ) : null}
      </div>
    </section>
  );

  return (
    <main className="qdoc-workbench" style={style} data-dev-mode={devMode ? "true" : "false"}>
      <div
        className={`reader-app qdoc-reader-app qdoc-public-viewer qdoc-dev-public-viewer is-ready${reader.rightPanelOpen ? "" : " is-closed-right"}`}
        data-qdoc-react-runtime="true"
        data-qdoc-view-mode={workspaceView === "document" ? viewMode : "project"}
        data-qdoc-pagination={activePaginatedReady ? "ready" : "pending"}
        data-active-workspace={workspaceView}
      >
        {reader.rightPanelOpen ? (
          <div className="qdoc-public-scrim" aria-hidden="true" onClick={reader.toggleRightPanel} />
        ) : null}
        <button type="button" className="qdoc-public-fab" aria-label="開啟目錄" onClick={reader.toggleRightPanel}>
          <BookOpen size={20} aria-hidden="true" />
        </button>

        <section
          className="qdoc-workbench__stage qdoc-public-viewer__stage qdoc-dev-main-content"
          aria-label="Workspace content"
          data-workspace-view={workspaceView}
        >
          <main className="reader-stage" tabIndex={-1} ref={reader.stageRef}>
            {workspaceView === "document" ? (
              <QDocPublicPage
                pages={displayPages}
                currentPageIndex={reader.currentPageIndex}
                devMode={devMode}
                paginatedReady={Boolean(paginatedPages)}
                sourceContainerRef={sourceContainerRef}
                registerPage={reader.registerPage}
                exposeSourceData={devMode}
              />
            ) : null}
            {workspaceView === "project" ? (
              <QDocProjectWorkspace
                entry={selectedProjectEntry}
                mediaAssets={mediaAssets}
                componentEntries={projectComponentEntries}
                componentUsages={projectComponentUsages}
                selectedKey={activeProjectKey}
              />
            ) : null}
          </main>
        </section>

        <aside className="reader-side-nav qdoc-workspace-panel qdoc-public-navigation qdoc-dev-public-navigation" aria-label="Workspace panel">
          <button type="button" className="qdoc-public-drawer-close" aria-label="關閉目錄" onClick={reader.toggleRightPanel}>
            <X size={16} aria-hidden="true" />
          </button>
          <section className="qdoc-public-identity" aria-label="文件資訊">
            <strong>
              <span className="qdoc-public-title-main">{projectIdentity.name}</span>
              {projectIdentity.subtitle ? <span className="qdoc-public-title-sub">{projectIdentity.subtitle}</span> : null}
            </strong>
            {projectIdentity.label ? <span>{projectIdentity.label}</span> : null}
          </section>
          <div className="qdoc-dev-public-tools" aria-label="Workspace">
            <QDocDevWorkspaceSwitcher workspaceView={workspaceView} onOpenWorkspace={openWorkspace} />
          </div>
          {workspaceView !== "project" ? (
            <>
              <section id="qdoc-bookmarks" className="qdoc-panel-section qdoc-panel-section--bookmarks" aria-label="章節書籤">
                <nav className="reader-bookmarks" aria-label="章節導覽" data-qdoc-react-bookmarks="true">
                  <div className="reader-bookmarks-rail" aria-hidden="true" />
                  <QDocBookmarks items={bookmarks} currentPageIndex={reader.currentPageIndex} onSelectPage={selectWorkspacePage} />
                </nav>
              </section>
              {actionSection}
              <QDocCurrentPagePanel
                currentPageLabel={reader.currentPageLabel}
                totalPageLabel={reader.totalPageLabel}
                progressPercent={reader.progressPercent}
                title={displayPages[reader.currentPageIndex]?.title || document.meta.title}
                pageLabelPrefix={viewMode === "reading" ? "節" : "頁"}
                showHeading={false}
                showTitle={false}
              />
            </>
          ) : null}
          {workspaceView === "project" ? (
            <>
              <QDocProjectEntryPanel
                entries={projectEntries}
                mediaAssets={mediaAssets}
                componentEntries={projectComponentEntries}
                selectedKey={activeProjectKey}
                onSelectKey={setProjectSelectedKey}
              />
              {actionSection}
            </>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function deployButtonText(info: QDocDeploymentInfo, status: DeployStatus) {
  if (info.configured === false || status === "setup") return "設定部署";
  if (status === "deploying") return "部署中";
  if (status === "failed") return "重試部署";
  if (status === "unavailable") return "本機限定";
  if (isDeploymentDirty(info, status)) return "重新部署";
  return "部署";
}

function workbenchPdfButtonText(localPdfEnabled: boolean, status: PdfActionStatus, staticPdfHref?: string) {
  if (localPdfEnabled) {
    if (status === "generating") return "產生中";
    if (status === "opening") return "正在開啟";
    if (status === "failed") return "重試 PDF";
    return "產生 PDF";
  }
  return !staticPdfHref ? "PDF 未部署" : "開啟 PDF";
}

function workbenchPdfStatusMessage(localPdfEnabled: boolean, status: PdfActionStatus) {
  if (!localPdfEnabled) return null;
  if (status === "generating") return "正在產生 PDF";
  if (status === "opening") return "PDF 已完成，正在開啟";
  if (status === "failed") return "PDF 產生失敗，請重試";
  return null;
}

function deploymentStatusKind(info: QDocDeploymentInfo, status: DeployStatus) {
  if (info.configured === false || status === "setup") return "failed";
  if (status === "deploying") return "deploying";
  if (status === "failed") return "failed";
  if (status === "unavailable") return "unavailable";
  if (isDeploymentDirty(info, status)) return "dirty";
  if (status === "deployed" || hasOnlineDeployment(info)) return "online";
  return "offline";
}

function deploymentStatusLabel(info: QDocDeploymentInfo, status: DeployStatus) {
  if (info.configured === false || status === "setup") return "缺少設定";
  if (status === "deploying") return "正在部署";
  if (status === "failed") return "部署失敗";
  if (status === "unavailable") return "本機限定";
  if (isDeploymentDirty(info, status)) return "有更新";
  if (status === "deployed" || hasOnlineDeployment(info)) return "已上線";
  return "未上線";
}

function deploymentStatusSummary(info: QDocDeploymentInfo, status: DeployStatus) {
  const label = deploymentStatusLabel(info, status);
  if ((status === "deployed" || hasOnlineDeployment(info)) && info.deployedAt) {
    return `${label} · ${formatDeployTime(info.deployedAt)}`;
  }
  return label;
}

function deploymentStatusText(info: QDocDeploymentInfo, status: DeployStatus) {
  if (info.configured === false || status === "setup") {
    return info.setupMessage ?? "部署設定尚未完成，請先設定 deploy.projectName";
  }
  if (status === "deploying") return "部署中";
  if (status === "failed") return "部署失敗，請查看終端機";
  if (status === "unavailable") return "目前環境沒有本地部署服務";
  if (isDeploymentDirty(info, status)) return "已上線但內容有更動，點擊重新部署";
  if (status === "deployed" || hasOnlineDeployment(info)) {
    return `已上線${info.deployedAt ? `，更新：${formatDeployTime(info.deployedAt)}` : ""}`;
  }
  return "未上線";
}

function hasOnlineDeployment(info: QDocDeploymentInfo) {
  if (info.configured === false) return false;
  return Boolean(info.online || info.deployedAt || info.publicUrl || (info.pdf && /^https?:\/\//i.test(info.pdf)));
}

function parseDeployError(text: string): {
  message?: string;
  deploy_configured?: boolean;
  deploy_adapter?: string;
  deploy_source?: string;
  deploy_project_name?: string;
} | null {
  try {
    return JSON.parse(text) as {
      message?: string;
      deploy_configured?: boolean;
      deploy_adapter?: string;
      deploy_source?: string;
      deploy_project_name?: string;
    };
  } catch {
    return null;
  }
}

function isDeploymentDirty(info: QDocDeploymentInfo, status: DeployStatus) {
  return status === "idle" && hasOnlineDeployment(info) && info.dirty === true;
}

function formatDeployTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "時間未知";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
