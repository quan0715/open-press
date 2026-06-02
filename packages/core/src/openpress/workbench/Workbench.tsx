import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ExternalLink, Home, MousePointer2, Play, Ruler } from "lucide-react";
import {
  getProjectIdentity,
  resolveAnchorPageIndex,
  type DeploymentInfo,
  type HtmlPageBlock,
  type ReaderDocument,
} from "../document-model";
import { InlineInspectorLayer, useInspector, useInspectorComments } from "./inspector";
import { ProjectEntryPanel } from "./project";
import {
  Bookmarks,
  CurrentPagePanel,
  PageThumbnails,
  PUBLIC_DRAWER_BREAKPOINT,
  PublicPage,
  useReaderRuntime,
  usePageViewportScale,
  useViewMode,
  type PageLayoutMode,
} from "../reader";
import {
  ReaderStage,
  InlineSourceEditorLayer,
  useDocumentWorkbenchModel,
  useInlineDocumentEditor,
  type InlineDocumentEditStatus,
  type InlineDocumentSourceTarget,
} from "./document";
import {
  DeploymentControl,
  ExportImageControl,
  PageZoomControl,
  SearchControl,
  useDeploymentWorkbench,
} from "./actions";
import { PendingCommentsPanel, WorkbenchControlPanel, type WorkbenchPanel } from "./panels";
import { WorkbenchShell } from "./shell";
import {
  formatPageGeometrySpec,
  formatInspectorSelection,
} from "./workbenchFormatters";

export function HtmlWorkbench({
  document,
  pages,
  style,
  workspaceMode,
  deploymentInfo,
  pressSlug = null,
  onDocumentRefresh,
  onBackToWorkspace,
  onOpenPresentation,
  extraControlPanels,
}: {
  document: ReaderDocument;
  pages: Array<HtmlPageBlock>;
  style: CSSProperties;
  workspaceMode: boolean;
  deploymentInfo: DeploymentInfo;
  // Active Press slug — threaded down to useDeploymentWorkbench so the
  // local PDF export endpoint can pick the right Press in multi-Press
  // workspaces. Null when the workspace is at the gallery root.
  pressSlug?: string | null;
  onDocumentRefresh?: () => void | Promise<void>;
  onBackToWorkspace?: () => void;
  onOpenPresentation?: (pageIndex: number) => void;
  // Append extra panels into the right-side control panel. Built-in panels
  // (pending comments + project entry) render first; extra panels render
  // after them in the supplied order.
  extraControlPanels?: WorkbenchPanel[];
}) {
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);
  const displayPages = pages;
  const { viewMode } = useViewMode();
  const {
    mediaAssets,
    anchorPageMap,
    projectComponentUsages,
    bookmarks,
    sourceBlockMap,
    sourceBlocksByPath,
    projectMentionItems,
  } = useDocumentWorkbenchModel(document, displayPages);
  const inspector = useInspector(document, { enabled: workspaceMode });
  const reader = useReaderRuntime({
    pageCount: Math.max(displayPages.length, 1),
    leftPanelBreakpoint: PUBLIC_DRAWER_BREAKPOINT,
    rightPanelBreakpoint: PUBLIC_DRAWER_BREAKPOINT,
  });
  const [pageLayoutMode, setPageLayoutMode] = useState<PageLayoutMode>("single");
  const pageViewport = usePageViewportScale({
    stageRef: reader.stageRef,
    pageContainerRef: sourceContainerRef,
    pageCount: displayPages.length,
    layoutMode: pageLayoutMode,
  });
  const deployment = useDeploymentWorkbench({ deploymentInfo, pressSlug });
  const [inlineEditStatus, setInlineEditStatus] = useState<InlineDocumentEditStatus>({ state: "idle" });
  const [sourceEditorTarget, setSourceEditorTarget] = useState<InlineDocumentSourceTarget | null>(null);

  const projectIdentity = getProjectIdentity(document.meta);
  const pressType = normalizePressType(document.meta.type);
  const isSlidePress = pressType === "slides";
  const pageGeometry = formatPageGeometrySpec(document.theme);
  const inspectorSelectionLabel = formatInspectorSelection(
    inspector.selectedBlock,
    inspector.selectedObjectEntity,
  );
  const inspectorToolbarExpanded = inspector.inspectorMode;
  const editStatusMessage = formatInlineEditStatus(inlineEditStatus);

  // Inline source editing and inspector commenting are mutually exclusive
  // interaction modes on the same blocks. While inspector mode is on, the
  // user is selecting blocks to comment on — keeping contenteditable + the
  // text cursor active would (a) show the I-beam instead of the inspector
  // crosshair, (b) allow accidental text selection that paints the whole
  // page (notably covers) with the browser ::selection color.
  const inlineEditEnabled = workspaceMode && !inspector.inspectorMode;
  useInlineDocumentEditor({
    enabled: inlineEditEnabled,
    sourceContainerRef,
    sourceBlockMap,
    onStatusChange: setInlineEditStatus,
    onOpenSourceBlock: setSourceEditorTarget,
    onDocumentEdited: onDocumentRefresh,
  });

  const selectWorkspacePage = (pageIndex: number, options?: { behavior?: ScrollBehavior }) => {
    reader.setPage(pageIndex, options);
    if (
      typeof window !== "undefined"
      && window.innerWidth < PUBLIC_DRAWER_BREAKPOINT
      && reader.rightPanelOpen
    ) {
      reader.toggleRightPanel();
    }
  };

  const selectWorkspaceAnchor = (anchorId: string, pageIndex?: number) => {
    const targetPageIndex = resolveAnchorPageIndex(anchorPageMap, displayPages.length, anchorId, pageIndex);
    if (targetPageIndex === null) return false;
    selectWorkspacePage(targetPageIndex, { behavior: "smooth" });
    return true;
  };

  const comments = useInspectorComments({
    workspaceMode,
    inspector,
    sourceBlockMap,
    sourceBlocksByPath,
    sourceContainerRef,
    onSelectWorkspacePage: selectWorkspacePage,
  });

  // Stabilize the controller objects so memoized InlineInspectorLayer can skip
  // re-rendering when nothing observable changed.
  const inspectorLayerComments = useMemo(() => ({
    saved: comments.inlineSavedComments,
    active: comments.activeInlineSavedComment ?? null,
    status: comments.inspectorCommentStatus,
    statusMessage: comments.inspectorCommentStatusMessage,
    totalCount: comments.pendingComments.length,
    onOpenSaved: comments.handleOpenInlineSavedComment,
    onRemoveSaved: comments.handleRemoveInlineSavedComment,
  }), [
    comments.activeInlineSavedComment,
    comments.handleOpenInlineSavedComment,
    comments.handleRemoveInlineSavedComment,
    comments.inlineSavedComments,
    comments.inspectorCommentStatus,
    comments.inspectorCommentStatusMessage,
    comments.pendingComments.length,
  ]);
  const inspectorLayerComposer = useMemo(() => ({
    text: comments.inspectorCommentText,
    submitDisabled: comments.inspectorCommentDisabled,
    mentionItems: projectMentionItems,
    onTextChange: comments.setInspectorCommentText,
    onSubmit: comments.handleSubmitInspectorComment,
  }), [
    comments.handleSubmitInspectorComment,
    comments.inspectorCommentDisabled,
    comments.inspectorCommentText,
    comments.setInspectorCommentText,
    projectMentionItems,
  ]);

  const currentSourcePath = displayPages[reader.currentPageIndex]?.source;
  // Stabilize the panel registry across keystrokes in the inspector
  // composer. Without `useMemo` the registry array (and the JSX closures
  // inside) would be recreated on every Workbench render, so typing a
  // single character would force WorkbenchControlPanel + every panel to
  // diff fresh React elements.
  const builtInControlPanels = useMemo<WorkbenchPanel[]>(() => [
    {
      id: "pending-comments",
      render: () => (
        <PendingCommentsPanel
          comments={comments.pendingComments}
          status={comments.commentsStatus}
          error={comments.commentsError}
          onClear={comments.clearPendingComment}
          onSelect={comments.handleSelectPendingComment}
        />
      ),
    },
    {
      id: "project-entry",
      render: () => (
        <ProjectEntryPanel
          mediaAssets={mediaAssets}
          componentUsages={projectComponentUsages}
          mentionItems={projectMentionItems}
          currentSource={currentSourcePath}
          onCommentSubmitted={comments.refreshPendingComments}
        />
      ),
    },
  ], [
    comments.clearPendingComment,
    comments.commentsError,
    comments.commentsStatus,
    comments.handleSelectPendingComment,
    comments.pendingComments,
    comments.refreshPendingComments,
    currentSourcePath,
    mediaAssets,
    projectComponentUsages,
    projectMentionItems,
  ]);
  const controlPanels = useMemo(
    () => (extraControlPanels ? [...builtInControlPanels, ...extraControlPanels] : builtInControlPanels),
    [builtInControlPanels, extraControlPanels],
  );

  // Memoize so composer keystrokes (which only flip `comments.inspectorCommentText`)
  // don't rebuild the toolbar JSX. The toolbar depends on deploy/page/zoom
  // state and inspector mode, but never on the composer draft text.
  const toolbarActions = useMemo(() => (
    <>
      {onBackToWorkspace ? (
        <div className="openpress-workbench-toolbar__group" aria-label="工作台導覽">
          <button
            type="button"
            className="openpress-workbench-toolbar-action openpress-workbench-toolbar-action--back"
            data-openpress-back-to-workspace
            onClick={onBackToWorkspace}
            title="回到工作台"
            aria-label="回到工作台"
          >
            <Home aria-hidden="true" />
            <span className="openpress-workbench-toolbar-action__label">工作台</span>
          </button>
        </div>
      ) : null}
      <div className="openpress-workbench-toolbar__group" aria-label="輸出">
        <button
          type="button"
          className="openpress-workbench-toolbar-action"
          data-openpress-public-export
          data-openpress-toolbar-expanded={deployment.pdfToolbarExpanded ? "true" : "false"}
          data-openpress-toolbar-active={deployment.pdfToolbarExpanded ? "true" : "false"}
          disabled={deployment.pdfButtonDisabled}
          onClick={deployment.handleOpenWorkbenchPdf}
          title={deployment.pdfButtonText}
          aria-label={deployment.pdfButtonText}
        >
          <ExternalLink aria-hidden="true" />
          <span className="openpress-workbench-toolbar-action__label">{deployment.pdfButtonText}</span>
          {deployment.pdfStatusMessage ? (
            <span
              className="openpress-dev-pdf-status"
              data-openpress-pdf-status={deployment.pdfActionStatus}
              role="status"
              aria-live="polite"
            >
              <span className="openpress-dev-pdf-status__spinner" aria-hidden="true" />
              <span>{deployment.pdfStatusMessage}</span>
            </span>
          ) : null}
        </button>
        <ExportImageControl
          currentPageIndex={reader.currentPageIndex}
          currentPageLabel={reader.currentPageLabel}
          pressTitle={projectIdentity.name}
        />
      </div>
      <div className="openpress-workbench-toolbar__group openpress-workbench-toolbar__group--page" aria-label="頁面規格">
        {isSlidePress && onOpenPresentation ? (
          <button
            type="button"
            className="openpress-workbench-toolbar-action"
            data-openpress-slide-present
            data-openpress-toolbar-expanded="false"
            data-openpress-toolbar-active="false"
            aria-pressed="false"
            title="進入放映模式"
            aria-label="進入放映模式"
            onClick={() => onOpenPresentation?.(reader.currentPageIndex)}
          >
            <Play aria-hidden="true" />
            <span className="openpress-workbench-toolbar-action__label">放映</span>
          </button>
        ) : null}
        <button
          type="button"
          className="openpress-workbench-page-geometry"
          data-openpress-page-geometry
          title={pageGeometry.title}
          aria-label={`頁面規格 ${pageGeometry.title}`}
        >
          <Ruler aria-hidden="true" />
          <span className="openpress-workbench-page-geometry__label">{pageGeometry.label}</span>
          <span className="openpress-workbench-page-geometry__dimensions">{pageGeometry.dimensions}</span>
        </button>
        <PageZoomControl
          scaleMode={pageViewport.scaleMode}
          scaleLabel={pageViewport.scaleLabel}
          pageLayoutMode={pageLayoutMode}
          onScaleModeChange={pageViewport.setScaleMode}
          onPageLayoutModeChange={setPageLayoutMode}
        />
      </div>
      <div className="openpress-workbench-toolbar__group openpress-workbench-toolbar__group--right" aria-label="工作台狀態與發布">
        {workspaceMode ? (
          <SearchControl
            sourceBlocksByPath={sourceBlocksByPath}
            onSelectPage={selectWorkspacePage}
          />
        ) : null}
        {workspaceMode && editStatusMessage ? (
          <span
            className="openpress-dev-edit-status openpress-dev-edit-status--toolbar"
            data-openpress-edit-status={inlineEditStatus.state}
            role="status"
            aria-live="polite"
          >
            {inlineEditStatus.state === "saving" ? <span className="openpress-dev-edit-status__spinner" aria-hidden="true" /> : null}
            <span>{editStatusMessage}</span>
          </span>
        ) : null}
        {workspaceMode ? (
          <button
            type="button"
            className="openpress-workbench-toolbar-action"
            data-openpress-inspector-toggle
            data-openpress-inspector-active={inspector.inspectorMode ? "true" : "false"}
            data-openpress-toolbar-expanded={inspectorToolbarExpanded ? "true" : "false"}
            data-openpress-toolbar-active={inspectorToolbarExpanded ? "true" : "false"}
            onClick={() => inspector.setInspectorMode(!inspector.inspectorMode)}
            aria-pressed={inspector.inspectorMode}
            title={inspector.inspectorMode ? "關閉註解" : "開啟註解"}
            aria-label={inspector.inspectorMode ? "關閉註解" : "開啟註解"}
          >
            <MousePointer2 aria-hidden="true" />
            <span className="openpress-workbench-toolbar-action__label">{inspector.inspectorMode ? "註解中" : "註解"}</span>
            <span className="openpress-dev-inspector-status">{inspectorSelectionLabel}</span>
          </button>
        ) : null}
        {workspaceMode && inspector.inspectorMode ? (
          <span
            className="openpress-dev-inspector-status"
            role="status"
            aria-live="polite"
            data-openpress-inspector-comment-status={comments.inspectorCommentStatus}
          >
            {comments.inspectorCommentStatusMessage}
          </span>
        ) : null}
        {deployment.localDeployEnabled ? (
          <DeploymentControl
            info={deployment.currentDeploymentInfo}
            status={deployment.status}
            onDeploy={deployment.handleDeploy}
          />
        ) : null}
      </div>
    </>
  ), [
    comments.inspectorCommentStatus,
    comments.inspectorCommentStatusMessage,
    deployment.currentDeploymentInfo,
    deployment.handleDeploy,
    deployment.handleOpenWorkbenchPdf,
    deployment.localDeployEnabled,
    deployment.pdfActionStatus,
    deployment.pdfButtonDisabled,
    deployment.pdfButtonText,
    deployment.pdfStatusMessage,
    deployment.pdfToolbarExpanded,
    deployment.status,
    workspaceMode,
    editStatusMessage,
    inlineEditStatus.state,
    inspector.inspectorMode,
    inspector.setInspectorMode,
    inspectorSelectionLabel,
    inspectorToolbarExpanded,
    pageGeometry.dimensions,
    pageGeometry.label,
    pageGeometry.title,
    pageLayoutMode,
    pageViewport.scaleLabel,
    pageViewport.scaleMode,
    pageViewport.setScaleMode,
    selectWorkspacePage,
    isSlidePress,
    sourceBlocksByPath,
    onBackToWorkspace,
    onOpenPresentation,
    reader.currentPageIndex,
    reader.currentPageLabel,
    projectIdentity.name,
  ]);

  return (
    <WorkbenchShell
      style={style}
      viewMode={viewMode}
      pressType={pressType}
      presentationMode={false}
      inspectorMode={inspector.inspectorMode}
      editMode={inlineEditEnabled}
      leftPanelOpen={reader.leftPanelOpen}
      rightPanelOpen={reader.rightPanelOpen}
      onToggleLeftPanel={reader.toggleLeftPanel}
      onToggleRightPanel={reader.toggleRightPanel}
    >
      <WorkbenchShell.Toolbar>
        {toolbarActions}
      </WorkbenchShell.Toolbar>

      <WorkbenchShell.LeftPanel>
        <section className="openpress-public-identity" aria-label="文件資訊">
          <strong>
            <span className="openpress-public-title-main">{projectIdentity.name}</span>
            {projectIdentity.subtitle ? <span className="openpress-public-title-sub">{projectIdentity.subtitle}</span> : null}
          </strong>
          {projectIdentity.label ? <span>{projectIdentity.label}</span> : null}
        </section>

        {!isSlidePress && bookmarks.length > 0 ? (
          <section
            id="openpress-bookmarks"
            className="openpress-panel-section openpress-panel-section--bookmarks"
            aria-label="章節書籤"
          >
            <nav className="reader-bookmarks" aria-label="章節導覽" data-openpress-react-bookmarks="true">
              <div className="reader-bookmarks-rail" aria-hidden="true" />
              <Bookmarks
                items={bookmarks}
                currentPageIndex={reader.currentPageIndex}
                onSelectPage={selectWorkspacePage}
              />
            </nav>
          </section>
        ) : (
          <section
            id="openpress-thumbnails"
            className="openpress-panel-section openpress-panel-section--thumbnails"
            aria-label="頁面縮圖"
          >
            <PageThumbnails
              pages={displayPages}
              currentPageIndex={reader.currentPageIndex}
              onSelectPage={selectWorkspacePage}
              theme={document.theme}
            />
          </section>
        )}
        <CurrentPagePanel
          currentPageLabel={reader.currentPageLabel}
          totalPageLabel={reader.totalPageLabel}
          progressPercent={reader.progressPercent}
          title={displayPages[reader.currentPageIndex]?.title || document.meta.title}
          pageLabelPrefix="頁"
          showHeading={false}
          showTitle={false}
        />
      </WorkbenchShell.LeftPanel>

      <WorkbenchShell.RightPanel>
        <WorkbenchControlPanel panels={controlPanels} />
      </WorkbenchShell.RightPanel>

      <WorkbenchShell.MainContent>
        <ReaderStage ref={reader.stageRef}>
          <PublicPage
            pages={displayPages}
            currentPageIndex={reader.currentPageIndex}
            sourceContainerRef={sourceContainerRef}
            registerPage={reader.registerPage}
            exposeSourceData={workspaceMode}
            inspector={inspector}
            onInternalAnchorNavigate={selectWorkspaceAnchor}
            pageLayoutMode={pageLayoutMode}
          />
          {workspaceMode ? (
            <InlineInspectorLayer
              sourceContainerRef={sourceContainerRef}
              inspector={inspector}
              comments={inspectorLayerComments}
              composer={inspectorLayerComposer}
              geometryVersion={`${pageViewport.scaleMode}:${pageViewport.scale}:${pageLayoutMode}`}
            />
          ) : null}
          {workspaceMode ? (
            <InlineSourceEditorLayer
              target={sourceEditorTarget}
              onClose={() => setSourceEditorTarget(null)}
              onStatusChange={setInlineEditStatus}
              geometryVersion={`${pageViewport.scaleMode}:${pageViewport.scale}:${pageLayoutMode}`}
            />
          ) : null}
        </ReaderStage>
      </WorkbenchShell.MainContent>
    </WorkbenchShell>
  );
}

function formatInlineEditStatus(status: InlineDocumentEditStatus) {
  if (status.state === "saving") return "儲存中";
  if (status.state === "saved") return "已儲存";
  if (status.state === "failed") return "儲存失敗";
  return "";
}

function normalizePressType(value: ReaderDocument["meta"]["type"]) {
  return value === "slides" ? "slides" : "pages";
}
