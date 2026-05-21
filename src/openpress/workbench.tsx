import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type RefObject,
} from "react";
import { ArrowUp, BookOpen, ExternalLink, Eye, FileText, FolderOpen, MessageSquare, MousePointer2, Pencil, Plus, RefreshCw, Rocket, Trash2, X } from "lucide-react";
import {
  collectBookmarkIndex,
  collectMediaAssetIndex,
} from "./indexes";
import { appendComposerToken, useComposerMentions } from "./composerMentions";
import {
  clearInspectorComment,
  fetchInspectorComments,
  submitInspectorComment,
  updateInspectorComment,
  useInspector,
  type InspectorIntent,
  type InspectorPlacement,
  type InspectorState,
  type InspectorTarget,
  type PendingComment,
} from "./inspector";
import {
  createProjectMentionItems,
  createProjectComponentUsages,
  ProjectEntryPanel,
  type ProjectMentionItem,
} from "./projectWorkspace";
import { paginateSourcePages, type PaginatedPage } from "./pagination";
import { scheduleBrowserFrame } from "./frameScheduler";
import {
  createAnchorPageMap,
  numberSourceHeadings,
  PUBLIC_DRAWER_BREAKPOINT,
  PublicPage,
  resolveAnchorPageIndex,
  useViewMode,
} from "./publicPage";
import { getProjectIdentity } from "./projectIdentity";
import { hasBuildTimePagination } from "./reactDocumentMetadata";
import { buildPublicPreviewHref, isLocalWorkspaceHost } from "./runtimeMode";
import { useReaderRuntime } from "./readerRuntime";
import type { DeploymentInfo, ReaderDocument, HtmlPageBlock, SourceBlock } from "./types";
import { Bookmarks, CurrentPagePanel } from "./workbenchPanels";
import type { DisplayPage } from "./workbenchTypes";

type WorkspaceView = "document" | "project" | "comments";
type DeployStatus = "idle" | "deploying" | "deployed" | "unavailable" | "failed" | "setup";
type PdfActionStatus = "idle" | "generating" | "opening" | "failed";
type InspectorCommentStatus = "idle" | "submitting" | "saved" | "failed";
type CommentsWorkspaceStatus = "idle" | "loading" | "ready" | "failed" | "clearing";

interface InlineSavedComment {
  id: string;
  blockId: string;
  placement: InspectorPlacement;
  note: string;
  path?: string;
  line?: number;
  timestamp?: string;
}

function getInitialWorkspaceView(): WorkspaceView {
  if (typeof window === "undefined") return "document";
  const workspace = new URLSearchParams(window.location.search).get("workspace");
  if (workspace === "project") return "project";
  if (workspace === "comments") return "comments";
  return "document";
}

function WorkspaceSwitcher({
  workspaceView,
  onOpenWorkspace,
}: {
  workspaceView: WorkspaceView;
  onOpenWorkspace: (view: WorkspaceView) => void;
}) {
  const items: Array<{ view: WorkspaceView; label: string; icon: typeof FileText }> = [
    { view: "document", label: "文件", icon: FileText },
    { view: "project", label: "專案", icon: FolderOpen },
    { view: "comments", label: "註解", icon: MessageSquare },
  ];

  return (
    <nav className="openpress-dev-workspace-switcher" data-openpress-dev-workspace-switcher aria-label="Workspace">
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

export function HtmlWorkbench({
  document,
  pages,
  style,
  devMode,
  deploymentInfo,
}: {
  document: ReaderDocument;
  pages: Array<HtmlPageBlock>;
  style: CSSProperties;
  devMode: boolean;
  deploymentInfo: DeploymentInfo;
}) {
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);
  const numberedPages = useMemo(() => numberSourceHeadings(pages), [pages]);
  const viewModeState = useViewMode();
  const { viewMode } = viewModeState;
  const buildTimePaginated = hasBuildTimePagination(document);
  const [paginatedPages, setPaginatedPages] = useState<PaginatedPage[] | null>(null);
  const displayPages: DisplayPage[] = viewMode === "paged" && !buildTimePaginated
    ? (paginatedPages ?? numberedPages)
    : numberedPages;
  const mediaAssets = useMemo(() => collectMediaAssetIndex(displayPages), [displayPages]);
  const anchorPageMap = useMemo(() => createAnchorPageMap(displayPages), [displayPages]);
  const projectComponentUsages = useMemo(() => createProjectComponentUsages(displayPages), [displayPages]);
  const bookmarks = useMemo(() => collectBookmarkIndex(displayPages), [displayPages]);
  const projectMentionItems = useMemo(
    () => createProjectMentionItems(mediaAssets, projectComponentUsages, bookmarks),
    [bookmarks, mediaAssets, projectComponentUsages],
  );
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(getInitialWorkspaceView);
  const inspector = useInspector(document, { enabled: devMode && (workspaceView === "document" || workspaceView === "project") });
  const reader = useReaderRuntime({ pageCount: Math.max(displayPages.length, 1), rightPanelBreakpoint: PUBLIC_DRAWER_BREAKPOINT });
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("idle");
  const [pdfActionStatus, setPdfActionStatus] = useState<PdfActionStatus>("idle");
  const [inspectorCommentText, setInspectorCommentText] = useState("");
  const [inspectorCommentStatus, setInspectorCommentStatus] = useState<InspectorCommentStatus>("idle");
  const [inspectorCommentError, setInspectorCommentError] = useState("");
  const [inlineSavedComment, setInlineSavedComment] = useState<InlineSavedComment | null>(null);
  const [pendingComments, setPendingComments] = useState<PendingComment[]>([]);
  const [commentsStatus, setCommentsStatus] = useState<CommentsWorkspaceStatus>("idle");
  const [commentsError, setCommentsError] = useState("");
  const [currentDeploymentInfo, setCurrentDeploymentInfo] = useState(deploymentInfo);
  const staticPdfHref = currentDeploymentInfo.pdf;
  const projectIdentity = getProjectIdentity(document.meta);
  const localDeployEnabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isLocalWorkspaceHost(window.location.hostname);
  }, []);
  const deploymentStatusDescription = deploymentStatusText(currentDeploymentInfo, deployStatus);
  const deploymentStatusLabelText = deploymentStatusSummary(currentDeploymentInfo, deployStatus);
  const pdfButtonText = workbenchPdfButtonText(localDeployEnabled, pdfActionStatus, staticPdfHref);
  const pdfStatusMessage = workbenchPdfStatusMessage(localDeployEnabled, pdfActionStatus);
  const pdfButtonDisabled = localDeployEnabled ? pdfActionStatus === "generating" || pdfActionStatus === "opening" : !staticPdfHref;
  const activePaginatedReady = viewMode === "reading" || buildTimePaginated || Boolean(paginatedPages);
  const inspectorSelectionLabel = formatInspectorSelection(inspector.selectedBlock);
  const activeInlineSavedComment = getInlineSavedCommentForTarget(inlineSavedComment, inspector.selectedTarget);
  const inspectorCommentDisabled = !inspector.selectedBlock || !inspectorCommentText.trim() || inspectorCommentStatus === "submitting";
  const inspectorCommentStatusMessage = formatInspectorCommentStatus(inspectorCommentStatus, inspectorCommentError);
  const publicPreviewHref = useMemo(() => {
    if (typeof window === "undefined") return "/";
    return buildPublicPreviewHref(window.location.href, reader.currentPageIndex);
  }, [reader.currentPageIndex]);

  const refreshPendingComments = useCallback(async () => {
    if (!devMode) return;
    setCommentsStatus("loading");
    setCommentsError("");
    try {
      const comments = await fetchInspectorComments();
      setPendingComments(comments);
      setCommentsStatus("ready");
    } catch (error) {
      setCommentsStatus("failed");
      setCommentsError(error instanceof Error ? error.message : String(error));
    }
  }, [devMode]);

  const clearPendingComment = useCallback(async (id: string) => {
    setCommentsStatus("clearing");
    setCommentsError("");
    try {
      await clearInspectorComment({ id });
      setPendingComments((comments) => comments.filter((comment) => comment.id !== id));
      setInlineSavedComment((comment) => comment?.id === id ? null : comment);
      setCommentsStatus("ready");
    } catch (error) {
      setCommentsStatus("failed");
      setCommentsError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const clearAllPendingComments = useCallback(async () => {
    setCommentsStatus("clearing");
    setCommentsError("");
    try {
      await clearInspectorComment({ all: true });
      setPendingComments([]);
      setInlineSavedComment(null);
      setCommentsStatus("ready");
    } catch (error) {
      setCommentsStatus("failed");
      setCommentsError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const handleDeploy = async () => {
    if (deployStatus === "deploying") return;
    if (currentDeploymentInfo.configured === false) {
      setDeployStatus("setup");
      return;
    }
    setDeployStatus("deploying");
    try {
      const response = await fetch("/__openpress/deploy", { method: "POST" });
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
        console.error("OpenPress deploy failed", text);
        setDeployStatus("failed");
        return;
      }
      const result = (await response.json().catch(() => null)) as { deployed_at?: string; pdf?: string; public_url?: string } | null;
      setCurrentDeploymentInfo((info) => ({
        online: true,
        deployedAt: result?.deployed_at ?? new Date().toISOString(),
        pdf: result?.pdf ?? info.pdf ?? __OPENPRESS_PDF_HREF__,
        publicUrl: result?.public_url ?? info.publicUrl,
        dirty: false,
      }));
      setDeployStatus("deployed");
      setTimeout(() => setDeployStatus("idle"), 3200);
    } catch (error) {
      console.error("OpenPress deploy unavailable", error);
      setDeployStatus("unavailable");
    }
  };

  const handleOpenLatestLocalPdf = async () => {
    if (pdfActionStatus === "generating") return;
    setPdfActionStatus("generating");
    try {
      const response = await fetch("/__openpress/local-pdf-export", { method: "POST" });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Local PDF export failed with status ${response.status}`);
      }
      const result = (await response.json().catch(() => null)) as { pdf?: string } | null;
      const pdfHref = result?.pdf ?? "/__openpress/local-pdf-file";
      setPdfActionStatus("opening");
      window.setTimeout(() => window.location.assign(pdfHref), 180);
    } catch (error) {
      console.error("OpenPress local PDF export failed", error);
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

  const handleSubmitInspectorComment = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (inspectorCommentDisabled || !inspector.selectedBlock) return;
    setInspectorCommentStatus("submitting");
    setInspectorCommentError("");
    try {
      const note = inspectorCommentText.trim();
      const placement = inspector.selectedTarget?.placement ?? "block";
      if (activeInlineSavedComment) {
        const result = await updateInspectorComment({
          id: activeInlineSavedComment.id,
          note,
          intent: "edit",
          placement,
        });
        setInlineSavedComment({
          ...activeInlineSavedComment,
          note,
          path: result.comment?.path ?? activeInlineSavedComment.path,
          line: result.comment?.line ?? activeInlineSavedComment.line,
          timestamp: result.comment?.timestamp ?? activeInlineSavedComment.timestamp,
        });
      } else {
        const result = await submitInspectorComment({
          block: inspector.selectedBlock,
          note,
          intent: inspector.commentIntent,
          placement,
        });
        if (result.comment?.id && inspector.selectedTarget) {
          setInlineSavedComment({
            id: result.comment.id,
            blockId: inspector.selectedTarget.blockId,
            placement,
            note,
            path: result.comment.path,
            line: result.comment.line,
            timestamp: result.comment.timestamp,
          });
        }
      }
      setInspectorCommentText("");
      setInspectorCommentStatus("saved");
      void refreshPendingComments();
    } catch (error) {
      setInspectorCommentStatus("failed");
      setInspectorCommentError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleOpenInlineSavedComment = (comment: InlineSavedComment) => {
    setInlineSavedComment(comment);
    setInspectorCommentText(comment.note);
    setInspectorCommentStatus("idle");
    setInspectorCommentError("");
    inspector.setCommentIntent("edit");
  };

  const handleRemoveInlineSavedComment = async (comment: InlineSavedComment) => {
    setInspectorCommentStatus("submitting");
    setInspectorCommentError("");
    try {
      await clearInspectorComment({ id: comment.id });
      setPendingComments((comments) => comments.filter((item) => item.id !== comment.id));
      setInlineSavedComment((current) => current?.id === comment.id ? null : current);
      setInspectorCommentText("");
      setInspectorCommentStatus("idle");
      inspector.selectTarget(null);
      void refreshPendingComments();
    } catch (error) {
      setInspectorCommentStatus("failed");
      setInspectorCommentError(error instanceof Error ? error.message : String(error));
    }
  };

  const selectWorkspacePage = (pageIndex: number, options?: { behavior?: ScrollBehavior }) => {
    reader.setPage(pageIndex, options);
    if (typeof window !== "undefined" && window.innerWidth < PUBLIC_DRAWER_BREAKPOINT && reader.rightPanelOpen) {
      reader.toggleRightPanel();
    }
  };

  const selectWorkspaceAnchor = (anchorId: string, pageIndex?: number) => {
    const targetPageIndex = resolveAnchorPageIndex(anchorPageMap, displayPages.length, anchorId, pageIndex);
    if (targetPageIndex === null) return false;
    selectWorkspacePage(targetPageIndex, { behavior: "smooth" });
    return true;
  };

  const insertProjectMention = useCallback((mention: string) => {
    setInspectorCommentText((text) => appendComposerToken(text, mention));
    setInspectorCommentStatus("idle");
    setInspectorCommentError("");
  }, []);

  const openWorkspace = (view: WorkspaceView) => {
    setWorkspaceView(view);
    if (typeof window === "undefined") return;
    scheduleBrowserFrame(() => reader.setPage(reader.currentPageIndex, { behavior: "auto" }));
  };

  useLayoutEffect(() => {
    setPaginatedPages(null);
  }, [numberedPages]);

  useEffect(() => {
    setInspectorCommentStatus("idle");
    setInspectorCommentError("");
    setInspectorCommentText("");
  }, [inspector.selectedBlockId, inspector.selectedTarget?.placement]);

  useEffect(() => {
    if (!devMode || workspaceView !== "comments") return;
    void refreshPendingComments();
  }, [devMode, refreshPendingComments, workspaceView]);

  useLayoutEffect(() => {
    if (buildTimePaginated) return undefined;
    if (viewMode !== "paged" || paginatedPages) return undefined;
    const sourceContainer = sourceContainerRef.current;
    if (!sourceContainer) return undefined;

    let cancelled = false;
    const cancelFrame = scheduleBrowserFrame(() => {
      const nextPages = paginateSourcePages(sourceContainer, numberedPages);
      if (!cancelled) setPaginatedPages(nextPages);
    });

    return () => {
      cancelled = true;
      cancelFrame();
    };
  }, [buildTimePaginated, numberedPages, paginatedPages, viewMode]);

  const actionSection = (
    <section className="openpress-public-action-section" aria-label="輸出">
      <span className="openpress-public-action-heading">輸出</span>
      <div className="openpress-public-action-list" aria-label="輸出操作">
        <a
          className="openpress-public-action-entry openpress-public-preview-link"
          data-openpress-open-public-preview
          href={publicPreviewHref}
          target="_blank"
          rel="noreferrer"
          aria-label="開啟公開預覽"
        >
          <Eye aria-hidden="true" />
          <span className="openpress-public-action-entry__label">公開預覽</span>
        </a>
        <button
          type="button"
          className="openpress-public-action-entry"
          data-openpress-public-export
          disabled={pdfButtonDisabled}
          onClick={handleOpenWorkbenchPdf}
        >
          <ExternalLink aria-hidden="true" />
          <span className="openpress-public-action-entry__label">{pdfButtonText}</span>
          {pdfStatusMessage ? (
            <span className="openpress-dev-pdf-status" data-openpress-pdf-status={pdfActionStatus} role="status" aria-live="polite">
              <span className="openpress-dev-pdf-status__spinner" aria-hidden="true" />
              <span>{pdfStatusMessage}</span>
            </span>
          ) : null}
        </button>
        {devMode && (workspaceView === "document" || workspaceView === "project") ? (
          <button
            type="button"
            className="openpress-public-action-entry"
            data-openpress-inspector-toggle
            data-openpress-inspector-active={inspector.inspectorMode ? "true" : "false"}
            onClick={inspector.toggleInspectorMode}
            aria-pressed={inspector.inspectorMode}
            title={inspector.inspectorMode ? "關閉註解" : "開啟註解"}
            aria-label={inspector.inspectorMode ? "關閉註解" : "開啟註解"}
          >
            <MousePointer2 aria-hidden="true" />
            <span className="openpress-public-action-entry__label">{inspector.inspectorMode ? "註解中" : "註解"}</span>
            <span className="openpress-dev-inspector-status">{inspectorSelectionLabel}</span>
          </button>
        ) : null}
        {devMode && (workspaceView === "document" || workspaceView === "project") && inspector.inspectorMode ? (
          <span className="openpress-dev-inspector-status" role="status" aria-live="polite" data-openpress-inspector-comment-status={inspectorCommentStatus}>
            {inspectorCommentStatusMessage}
          </span>
        ) : null}
        {localDeployEnabled ? (
          <button
            type="button"
            className="openpress-public-action-entry"
            data-openpress-deploy
            data-openpress-deploy-status={deploymentStatusKind(currentDeploymentInfo, deployStatus)}
            data-deploy-status={deployStatus}
            disabled={deployStatus === "deploying" || deployStatus === "unavailable" || currentDeploymentInfo.configured === false}
            onClick={handleDeploy}
            title={deploymentStatusDescription}
            aria-label={deploymentStatusDescription}
          >
            <Rocket aria-hidden="true" />
            <span className="openpress-public-action-entry__label">{deployButtonText(currentDeploymentInfo, deployStatus)}</span>
            <span
              className="openpress-dev-deploy-status"
              data-openpress-deploy-status={deploymentStatusKind(currentDeploymentInfo, deployStatus)}
              role="status"
              aria-live="polite"
            >
              <span className="openpress-dev-deploy-status__dot" aria-hidden="true" />
              <span>{deploymentStatusLabelText}</span>
            </span>
          </button>
        ) : null}
      </div>
    </section>
  );

  return (
    <main className="openpress-workbench" style={style} data-dev-mode={devMode ? "true" : "false"}>
      <div
        className={`reader-app openpress-reader-app openpress-public-viewer openpress-dev-public-viewer is-ready${reader.rightPanelOpen ? "" : " is-closed-right"}`}
        data-openpress-react-runtime="true"
        data-openpress-view-mode={viewMode}
        data-openpress-pagination={activePaginatedReady ? "ready" : "pending"}
        data-openpress-inspector-mode={inspector.inspectorMode ? "on" : "off"}
        data-active-workspace={workspaceView}
      >
        {reader.rightPanelOpen ? (
          <div className="openpress-public-scrim" aria-hidden="true" onClick={reader.toggleRightPanel} />
        ) : null}
        <button type="button" className="openpress-public-fab" aria-label="開啟目錄" onClick={reader.toggleRightPanel}>
          <BookOpen size={20} aria-hidden="true" />
        </button>

        <section
          className="openpress-workbench__stage openpress-public-viewer__stage openpress-dev-main-content"
          aria-label="Workspace content"
          data-workspace-view={workspaceView}
        >
          <main className="reader-stage" tabIndex={-1} ref={reader.stageRef}>
            <PublicPage
              pages={displayPages}
              currentPageIndex={reader.currentPageIndex}
              devMode={devMode}
              paginatedReady={activePaginatedReady}
              sourceContainerRef={sourceContainerRef}
              registerPage={reader.registerPage}
              exposeSourceData={devMode}
              inspector={inspector}
              onInternalAnchorNavigate={selectWorkspaceAnchor}
            />
            {devMode && (workspaceView === "document" || workspaceView === "project") ? (
              <InlineInspectorLayer
                sourceContainerRef={sourceContainerRef}
                inspector={inspector}
                savedComment={activeInlineSavedComment}
                commentText={inspectorCommentText}
                commentStatus={inspectorCommentStatus}
                commentStatusMessage={inspectorCommentStatusMessage}
                submitDisabled={inspectorCommentDisabled}
                mentionItems={projectMentionItems}
                onOpenSavedComment={handleOpenInlineSavedComment}
                onRemoveSavedComment={handleRemoveInlineSavedComment}
                onCommentTextChange={setInspectorCommentText}
                onSubmitComment={handleSubmitInspectorComment}
              />
            ) : null}
          </main>
        </section>

        <aside className="reader-side-nav openpress-workspace-panel openpress-public-navigation openpress-dev-public-navigation" aria-label="Workspace panel">
          <button type="button" className="openpress-public-drawer-close" aria-label="關閉目錄" onClick={reader.toggleRightPanel}>
            <X size={16} aria-hidden="true" />
          </button>
          <section className="openpress-public-identity" aria-label="文件資訊">
            <strong>
              <span className="openpress-public-title-main">{projectIdentity.name}</span>
              {projectIdentity.subtitle ? <span className="openpress-public-title-sub">{projectIdentity.subtitle}</span> : null}
            </strong>
            {projectIdentity.label ? <span>{projectIdentity.label}</span> : null}
          </section>
          <div className="openpress-dev-public-tools" aria-label="Workspace">
            <WorkspaceSwitcher workspaceView={workspaceView} onOpenWorkspace={openWorkspace} />
          </div>
          {workspaceView === "document" ? (
            <>
              <section id="openpress-bookmarks" className="openpress-panel-section openpress-panel-section--bookmarks" aria-label="章節書籤">
                <nav className="reader-bookmarks" aria-label="章節導覽" data-openpress-react-bookmarks="true">
                  <div className="reader-bookmarks-rail" aria-hidden="true" />
                  <Bookmarks items={bookmarks} currentPageIndex={reader.currentPageIndex} onSelectPage={selectWorkspacePage} />
                </nav>
              </section>
              {actionSection}
              <CurrentPagePanel
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
              <ProjectEntryPanel
                mediaAssets={mediaAssets}
                componentUsages={projectComponentUsages}
                mentionItems={projectMentionItems}
                currentSource={displayPages[reader.currentPageIndex]?.source}
                onInsertMention={insertProjectMention}
              />
              {actionSection}
            </>
          ) : null}
          {workspaceView === "comments" ? (
            <>
              <CommentsWorkspace
                comments={pendingComments}
                status={commentsStatus}
                error={commentsError}
                onRefresh={refreshPendingComments}
                onClear={clearPendingComment}
                onClearAll={clearAllPendingComments}
                panel
              />
              {actionSection}
            </>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

interface InspectorLayerRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface InspectorInsertTargetView {
  blockId: string;
  rect: InspectorLayerRect;
}

const INSPECTOR_INTENTS: Array<{ intent: InspectorIntent; label: string; icon: typeof Plus }> = [
  { intent: "add", label: "Add", icon: Plus },
  { intent: "edit", label: "Edit", icon: Pencil },
  { intent: "delete", label: "Remove", icon: Trash2 },
];

function InlineInspectorLayer({
  sourceContainerRef,
  inspector,
  savedComment,
  commentText,
  commentStatus,
  commentStatusMessage,
  submitDisabled,
  mentionItems,
  onOpenSavedComment,
  onRemoveSavedComment,
  onCommentTextChange,
  onSubmitComment,
}: {
  sourceContainerRef: RefObject<HTMLDivElement | null>;
  inspector: InspectorState;
  savedComment: InlineSavedComment | null;
  commentText: string;
  commentStatus: InspectorCommentStatus;
  commentStatusMessage: string;
  submitDisabled: boolean;
  mentionItems: ProjectMentionItem[];
  onOpenSavedComment: (comment: InlineSavedComment) => void;
  onRemoveSavedComment: (comment: InlineSavedComment) => Promise<void>;
  onCommentTextChange: (value: string) => void;
  onSubmitComment: (event?: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const active = inspector.enabled && inspector.inspectorMode;
  const selectedTarget = inspector.selectedTarget;
  const selectedTargetKey = selectedTarget ? `${selectedTarget.blockId}:${selectedTarget.placement}` : null;
  const savedCommentForTarget = getInlineSavedCommentForTarget(savedComment, selectedTarget);
  const [insertTargets, setInsertTargets] = useState<InspectorInsertTargetView[]>([]);
  const [selectionRect, setSelectionRect] = useState<InspectorLayerRect | null>(null);
  const [composerTargetKey, setComposerTargetKey] = useState<string | null>(null);
  const composerOpen = Boolean(selectedTargetKey && composerTargetKey === selectedTargetKey);
  const markerOnly = Boolean(savedCommentForTarget && !composerOpen);
  const {
    activeMention,
    handleMentionKeyDown,
    highlightedMentionIndex,
    mentionSuggestions,
    setHighlightedMentionIndex,
    setComposerCursor,
    syncCursor,
    insertMention,
  } = useComposerMentions({
    text: commentText,
    items: mentionItems,
    textareaRef,
    onTextChange: onCommentTextChange,
    enabled: composerOpen,
  });

  const updateLayer = useCallback(() => {
    const root = sourceContainerRef.current;
    if (!active || !root) {
      setInsertTargets([]);
      setSelectionRect(null);
      if (root) syncInspectorSelectedBlock(root, null);
      return;
    }

    const blockElements = collectInspectorBlockElements(root);
    const nextInsertTargets = createInspectorInsertTargets(blockElements);
    setInsertTargets(nextInsertTargets);
    setSelectionRect(resolveInspectorSelectionRect(root, selectedTarget, nextInsertTargets));
    syncInspectorSelectedBlock(root, markerOnly ? null : selectedTarget);
  }, [active, markerOnly, selectedTarget, sourceContainerRef]);

  const scheduleLayerUpdate = useCallback(() => {
    if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      updateLayer();
    });
  }, [updateLayer]);

  useLayoutEffect(() => {
    updateLayer();
  }, [updateLayer]);

  useEffect(() => {
    if (!active) return undefined;
    const root = sourceContainerRef.current;
    const resizeObserver = typeof ResizeObserver === "undefined" || !root
      ? null
      : new ResizeObserver(scheduleLayerUpdate);
    if (root && resizeObserver) resizeObserver.observe(root);
    window.addEventListener("resize", scheduleLayerUpdate);
    window.addEventListener("scroll", scheduleLayerUpdate, true);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleLayerUpdate);
      window.removeEventListener("scroll", scheduleLayerUpdate, true);
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active, scheduleLayerUpdate, sourceContainerRef]);

  useEffect(() => {
    if (!selectedTarget || composerTargetKey !== selectedTargetKey) return;
    const frame = window.requestAnimationFrame(() => textareaRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [composerTargetKey, selectedTarget, selectedTargetKey]);

  useEffect(() => {
    setComposerTargetKey(null);
  }, [selectedTargetKey]);

  useEffect(() => {
    if (commentStatus === "saved") setComposerTargetKey(null);
  }, [commentStatus]);

  if (!active) return null;

  const composerStyle = selectionRect ? createInspectorComposerStyle(selectionRect, composerOpen) : undefined;
  const markerStyle = selectionRect ? createInspectorMarkerStyle(selectionRect) : undefined;
  const visibleIntentItems = savedCommentForTarget
    ? INSPECTOR_INTENTS.filter((item) => item.intent !== "add")
    : INSPECTOR_INTENTS;
  const chooseIntent = (intent: InspectorIntent) => {
    if (!selectedTargetKey) return;
    inspector.setCommentIntent(intent);
    setComposerTargetKey(selectedTargetKey);
  };
  const openSavedComment = () => {
    if (!selectedTargetKey || !savedCommentForTarget) return;
    onOpenSavedComment(savedCommentForTarget);
    setComposerTargetKey(selectedTargetKey);
  };
  const handleMarkerClick = () => {
    if (!selectedTargetKey) return;
    if (savedCommentForTarget) {
      openSavedComment();
      return;
    }
    setComposerTargetKey(selectedTargetKey);
  };

  return (
    <div className="openpress-inline-inspector-layer" data-openpress-inline-inspector-layer>
      {insertTargets.map((target) => {
        const isSelected = selectedTarget?.blockId === target.blockId && selectedTarget.placement === "before";
        return (
          <button
            type="button"
            className={`openpress-inline-insert-target${isSelected ? " is-selected" : ""}`}
            data-openpress-insert-before-block-id={target.blockId}
            style={rectToFixedStyle(target.rect)}
            aria-label="在此新增註解"
            key={target.blockId}
            onClick={() => inspector.selectTarget({ blockId: target.blockId, placement: "before" })}
          />
        );
      })}

      {selectionRect && selectedTarget ? (
        <>
          <button
            type="button"
            className="openpress-inline-comment-marker"
            data-openpress-inline-comment-marker
            data-openpress-marker-state={savedCommentForTarget ? "saved" : "draft"}
            style={markerStyle}
            aria-label={savedCommentForTarget ? "編輯註解 1" : "目前選取區塊 1"}
            onClick={handleMarkerClick}
          >
            1
          </button>
          {!markerOnly ? (
            <form
              className="openpress-inline-comment-composer"
              data-openpress-inline-comment-composer
              data-openpress-comment-placement={selectedTarget.placement}
              data-openpress-comment-intent={inspector.commentIntent}
              data-openpress-composer-open={composerOpen ? "true" : "false"}
              data-openpress-composer-saved={savedCommentForTarget ? "true" : "false"}
              style={composerStyle}
              onSubmit={(event) => void onSubmitComment(event)}
            >
              <div className="openpress-inline-comment-composer__intents" aria-label="註解意圖">
                {visibleIntentItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      className={composerOpen && inspector.commentIntent === item.intent ? "is-active" : ""}
                      aria-label={item.label}
                      title={item.label}
                      aria-pressed={composerOpen && inspector.commentIntent === item.intent}
                      key={item.intent}
                      onClick={() => {
                        if (savedCommentForTarget && item.intent === "delete") {
                          void onRemoveSavedComment(savedCommentForTarget);
                          return;
                        }
                        chooseIntent(item.intent);
                      }}
                    >
                      <Icon aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
              {composerOpen ? (
                <div className="openpress-inline-comment-composer__body">
                  <textarea
                    ref={textareaRef}
                    value={commentText}
                    disabled={commentStatus === "submitting"}
                    onChange={(event) => {
                      onCommentTextChange(event.target.value);
                      setComposerCursor(event.target.selectionStart ?? event.target.value.length);
                    }}
                    onClick={syncCursor}
                    onKeyUp={syncCursor}
                    onKeyDown={(event) => {
                      if (handleMentionKeyDown(event)) return;
                      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                        event.preventDefault();
                        void onSubmitComment();
                      }
                    }}
                    aria-label={savedCommentForTarget ? "編輯註解" : "新增註解"}
                    placeholder="新增註解..."
                    rows={3}
                  />
                  <button type="submit" disabled={submitDisabled} aria-label="送出註解">
                    <ArrowUp aria-hidden="true" />
                  </button>
                </div>
              ) : null}
              {composerOpen && mentionSuggestions.length > 0 ? (
                <div className="openpress-inline-comment-composer__suggestions" role="listbox" aria-label={activeMention?.trigger === "/" ? "Skill suggestions" : "Mention suggestions"}>
                  {mentionSuggestions.map((item, index) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === highlightedMentionIndex}
                      data-highlighted={index === highlightedMentionIndex ? "true" : undefined}
                      key={`${item.kind}-${item.value}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setHighlightedMentionIndex(index)}
                      onClick={() => insertMention(item)}
                    >
                      <span>{item.label}</span>
                      <small>{item.meta}</small>
                    </button>
                  ))}
                </div>
              ) : null}
              {composerOpen && commentStatusMessage ? (
                <p role="status" aria-live="polite" data-openpress-inspector-comment-status={commentStatus}>
                  {commentStatusMessage}
                </p>
              ) : null}
            </form>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function CommentsWorkspace({
  comments,
  status,
  error,
  onRefresh,
  onClear,
  onClearAll,
  panel = false,
}: {
  comments: PendingComment[];
  status: CommentsWorkspaceStatus;
  error: string;
  onRefresh: () => Promise<void>;
  onClear: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  panel?: boolean;
}) {
  const busy = status === "loading" || status === "clearing";

  return (
    <section
      className={`openpress-comments-workspace${panel ? " openpress-comments-workspace--panel" : ""}`}
      data-openpress-comments-workspace
      data-openpress-comments-panel={panel ? "true" : undefined}
      aria-label="待處理註解"
    >
      <header className="openpress-comments-workspace__header">
        <div>
          <span className="openpress-comments-workspace__eyebrow">Comments</span>
          <h1>待處理註解</h1>
          <p>{formatCommentsCount(comments.length, status)}</p>
        </div>
        <div className="openpress-comments-workspace__actions" aria-label="註解操作">
          <button type="button" onClick={() => void onRefresh()} disabled={busy}>
            <RefreshCw aria-hidden="true" />
            <span>{status === "loading" ? "讀取中" : "重新整理"}</span>
          </button>
          <button type="button" onClick={() => void onClearAll()} disabled={busy || comments.length === 0}>
            <Trash2 aria-hidden="true" />
            <span>{status === "clearing" ? "清除中" : "清空全部"}</span>
          </button>
        </div>
      </header>

      {error ? (
        <p className="openpress-comments-workspace__error" role="alert">
          {error}
        </p>
      ) : null}

      {comments.length === 0 && status !== "loading" ? (
        <div className="openpress-comments-workspace__empty" role="status">
          目前沒有註解
        </div>
      ) : (
        <ol className="openpress-comments-list" aria-label="待處理註解列表">
          {comments.map((comment) => {
            const hintMeta = parseCommentHint(comment.hint);
            return (
              <li className="openpress-comment-entry" data-openpress-comment-id={comment.id} key={comment.id}>
                <div className="openpress-comment-entry__body">
                  <div className="openpress-comment-entry__topline">
                    <p className="openpress-comment-entry__note">{comment.note}</p>
                    {hintMeta ? (
                      <span className="openpress-comment-entry__intent" data-openpress-comment-intent={hintMeta.intent}>
                        {hintMeta.intentLabel}
                      </span>
                    ) : null}
                  </div>
                  <p className="openpress-comment-entry__meta">
                    <code>{comment.path}:{comment.line}</code>
                    {comment.timestamp ? <span>{formatCommentTimestamp(comment.timestamp)}</span> : null}
                  </p>
                  {hintMeta ? (
                    <p className="openpress-comment-entry__hint">
                      {hintMeta.placementLabel}
                    </p>
                  ) : comment.hint ? (
                    <p className="openpress-comment-entry__hint">{comment.hint}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void onClear(comment.id)}
                  disabled={busy}
                  aria-label={`清除註解 ${comment.id}`}
                >
                  <Trash2 aria-hidden="true" />
                  <span>清除</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function collectInspectorBlockElements(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-openpress-block-id]")).filter((element) => {
    if (!element.dataset.openpressBlockId) return false;
    if (element.parentElement?.closest("[data-openpress-block-id]")) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

function createInspectorInsertTargets(elements: HTMLElement[]): InspectorInsertTargetView[] {
  const targets: InspectorInsertTargetView[] = [];
  const seen = new Set<string>();

  for (let index = 1; index < elements.length; index += 1) {
    const previous = elements[index - 1];
    const current = elements[index];
    const blockId = current.dataset.openpressBlockId;
    if (!blockId || seen.has(blockId)) continue;

    const previousPage = previous.closest<HTMLElement>(".openpress-html-page");
    const currentPage = current.closest<HTMLElement>(".openpress-html-page");
    if (!previousPage || previousPage !== currentPage) continue;

    const previousRect = previous.getBoundingClientRect();
    const currentRect = current.getBoundingClientRect();
    const gap = currentRect.top - previousRect.bottom;
    if (gap < 10) continue;

    const pageRect = currentPage.getBoundingClientRect();
    const inset = Math.min(56, Math.max(20, pageRect.width * 0.07));
    const height = Math.min(28, Math.max(14, gap - 4));
    const rect = {
      top: previousRect.bottom + ((gap - height) / 2),
      left: pageRect.left + inset,
      width: Math.max(96, pageRect.width - (inset * 2)),
      height,
    };
    if (!isInspectorRectNearViewport(rect)) continue;

    targets.push({ blockId, rect });
    seen.add(blockId);
  }

  return targets;
}

function resolveInspectorSelectionRect(
  root: HTMLElement,
  target: InspectorTarget | null,
  insertTargets: InspectorInsertTargetView[],
): InspectorLayerRect | null {
  if (!target) return null;
  if (target.placement === "before") {
    const insertTarget = insertTargets.find((item) => item.blockId === target.blockId);
    if (insertTarget) return insertTarget.rect;
    const block = findInspectorBlockElement(root, target.blockId);
    if (!block) return null;
    const rect = block.getBoundingClientRect();
    return {
      top: rect.top - 22,
      left: rect.left,
      width: rect.width,
      height: 22,
    };
  }

  const block = findInspectorBlockElement(root, target.blockId);
  if (!block) return null;
  const rect = block.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function findInspectorBlockElement(root: HTMLElement, blockId: string) {
  return collectInspectorBlockElements(root).find((element) => element.dataset.openpressBlockId === blockId) ?? null;
}

function getInlineSavedCommentForTarget(comment: InlineSavedComment | null, target: InspectorTarget | null) {
  if (!comment || !target) return null;
  return comment.blockId === target.blockId && comment.placement === target.placement ? comment : null;
}

function syncInspectorSelectedBlock(root: HTMLElement, target: InspectorTarget | null) {
  root.querySelectorAll<HTMLElement>('[data-openpress-inspector-selected="true"]').forEach((element) => {
    delete element.dataset.openpressInspectorSelected;
  });
  if (!target || target.placement !== "block") return;
  const selected = findInspectorBlockElement(root, target.blockId);
  if (selected) selected.dataset.openpressInspectorSelected = "true";
}

function rectToFixedStyle(rect: InspectorLayerRect): CSSProperties {
  return {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

function createInspectorComposerStyle(rect: InspectorLayerRect, expanded: boolean): CSSProperties {
  if (typeof window === "undefined") return {};
  const targetWidth = expanded ? 460 : 292;
  const width = Math.min(targetWidth, Math.max(240, window.innerWidth - 32));
  const preferredLeft = rect.left + (rect.width / 2) - (width / 2);
  const left = clampNumber(preferredLeft, 16, Math.max(16, window.innerWidth - width - 16));
  const topAbove = rect.top - 66;
  const top = topAbove > 12 ? topAbove : rect.top + rect.height + 14;
  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
  };
}

function createInspectorMarkerStyle(rect: InspectorLayerRect): CSSProperties {
  if (typeof window === "undefined") return {};
  return {
    top: `${clampNumber(rect.top - 16, 8, Math.max(8, window.innerHeight - 34))}px`,
    left: `${clampNumber(rect.left - 18, 8, Math.max(8, window.innerWidth - 34))}px`,
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function isInspectorRectNearViewport(rect: InspectorLayerRect, margin = 240) {
  if (typeof window === "undefined") return true;
  return rect.top + rect.height >= -margin
    && rect.top <= window.innerHeight + margin
    && rect.left + rect.width >= -margin
    && rect.left <= window.innerWidth + margin;
}

function deployButtonText(info: DeploymentInfo, status: DeployStatus) {
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

function deploymentStatusKind(info: DeploymentInfo, status: DeployStatus) {
  if (info.configured === false || status === "setup") return "failed";
  if (status === "deploying") return "deploying";
  if (status === "failed") return "failed";
  if (status === "unavailable") return "unavailable";
  if (isDeploymentDirty(info, status)) return "dirty";
  if (status === "deployed" || hasOnlineDeployment(info)) return "online";
  return "offline";
}

function deploymentStatusLabel(info: DeploymentInfo, status: DeployStatus) {
  if (info.configured === false || status === "setup") return "缺少設定";
  if (status === "deploying") return "正在部署";
  if (status === "failed") return "部署失敗";
  if (status === "unavailable") return "本機限定";
  if (isDeploymentDirty(info, status)) return "有更新";
  if (status === "deployed" || hasOnlineDeployment(info)) return "已上線";
  return "未上線";
}

function deploymentStatusSummary(info: DeploymentInfo, status: DeployStatus) {
  const label = deploymentStatusLabel(info, status);
  if ((status === "deployed" || hasOnlineDeployment(info)) && info.deployedAt) {
    return `${label} · ${formatDeployTime(info.deployedAt)}`;
  }
  return label;
}

function deploymentStatusText(info: DeploymentInfo, status: DeployStatus) {
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

function hasOnlineDeployment(info: DeploymentInfo) {
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

function isDeploymentDirty(info: DeploymentInfo, status: DeployStatus) {
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

function formatInspectorSelection(block: SourceBlock | null) {
  if (!block) return "未選取";
  const line = block.source?.line;
  return line ? `${block.path}:${line}` : block.path;
}

function formatInspectorCommentStatus(status: InspectorCommentStatus, error: string) {
  if (status === "submitting") return "寫入中";
  if (status === "saved") return "已寫入 source";
  if (status === "failed") return error || "寫入失敗";
  return "";
}

function formatCommentsCount(count: number, status: CommentsWorkspaceStatus) {
  if (status === "loading") return "正在讀取";
  if (status === "clearing") return "正在清除";
  return `${count} 則待處理`;
}

function parseCommentHint(hint?: string) {
  if (!hint?.startsWith("openpress-react-inspector")) return null;
  const intent = hint.match(/\bintent=(add|edit|delete)\b/)?.[1] as InspectorIntent | undefined;
  const placement = hint.match(/\bplacement=(block|before)\b/)?.[1] as InspectorPlacement | undefined;
  const intentLabel = intent === "add" ? "Add" : intent === "delete" ? "Remove" : "Edit";
  const placementLabel = placement === "before" ? "插入於區塊前" : "針對目前區塊";
  return { intent: intent ?? "edit", intentLabel, placement: placement ?? "block", placementLabel };
}

function formatCommentTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
