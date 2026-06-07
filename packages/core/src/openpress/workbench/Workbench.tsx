import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  getProjectIdentity,
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
  type InlineDocumentSourceTarget,
} from "./document";
import {
  useDeploymentWorkbench,
} from "./actions";
import { PendingCommentsPanel, WorkbenchControlPanel, type WorkbenchPanel } from "./panels";
import { WorkbenchShell } from "./shell";
import { WorkbenchToolbarActions } from "./shell/WorkbenchToolbarActions";
import { ToastProvider } from "../shared";
import { WorkbenchEditStatusProvider } from "./WorkbenchEditStatusContext";
import { WorkbenchRebuildOverlay } from "./WorkbenchRebuildOverlay";
import { useWorkbenchNavigation } from "./hooks/useWorkbenchNavigation";
import { useSlideReorder } from "./hooks/useSlideReorder";
import {
  formatPageGeometrySpec,
  formatInspectorSelection,
} from "./workbenchFormatters";

type HtmlWorkbenchProps = {
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
};

export function HtmlWorkbench(props: HtmlWorkbenchProps) {
  return (
    <ToastProvider>
      <WorkbenchEditStatusProvider>
        <HtmlWorkbenchInner {...props} />
      </WorkbenchEditStatusProvider>
    </ToastProvider>
  );
}

function HtmlWorkbenchInner({
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
}: HtmlWorkbenchProps) {
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
    onOpenSourceBlock: setSourceEditorTarget,
    onDocumentEdited: onDocumentRefresh,
  });

  const { selectWorkspaceAnchor, selectWorkspacePage } = useWorkbenchNavigation({
    anchorPageMap,
    pages: displayPages,
    rightPanelOpen: reader.rightPanelOpen,
    setPage: reader.setPage,
    toggleRightPanel: reader.toggleRightPanel,
  });

  const { reorder: reorderSlides } = useSlideReorder(pressSlug ?? "", onDocumentRefresh);
  const handleReorderPages = useCallback(
    (fromIndex: number, toIndex: number) => {
      const reordered = [...displayPages];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      const order = reordered
        .map((p) => p.frameKey)
        .filter((k): k is string => typeof k === "string");
      if (order.length !== reordered.length) return;
      reorderSlides(order);
    },
    [displayPages, reorderSlides],
  );

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
    <WorkbenchToolbarActions
      pages={displayPages}
      currentPageIndex={reader.currentPageIndex}
      pressTitle={projectIdentity.name}
      theme={document.theme}
      workspaceMode={workspaceMode}
      sourceBlocksByPath={sourceBlocksByPath}
      onSelectPage={selectWorkspacePage}
      onBackToWorkspace={onBackToWorkspace}
      isSlidePress={isSlidePress}
      onOpenPresentation={onOpenPresentation}
      pageGeometry={pageGeometry}
      scaleMode={pageViewport.scaleMode}
      scaleLabel={pageViewport.scaleLabel}
      pageLayoutMode={pageLayoutMode}
      onScaleModeChange={pageViewport.setScaleMode}
      onPageLayoutModeChange={setPageLayoutMode}
      inspectorMode={inspector.inspectorMode}
      inspectorToolbarExpanded={inspectorToolbarExpanded}
      inspectorSelectionLabel={inspectorSelectionLabel}
      onInspectorModeChange={inspector.setInspectorMode}
      inspectorCommentStatus={comments.inspectorCommentStatus}
      inspectorCommentStatusMessage={comments.inspectorCommentStatusMessage}
      deploymentInfo={deployment.currentDeploymentInfo}
      deploymentStatus={deployment.status}
      localDeployEnabled={deployment.localDeployEnabled}
      onDeploy={deployment.handleDeploy}
      onExportPdf={deployment.handleOpenWorkbenchPdf}
      pdfDisabled={deployment.pdfButtonDisabled}
      pdfLabel={deployment.pdfButtonText}
      pdfStatusMessage={deployment.pdfStatusMessage}
      pdfActionStatus={deployment.pdfActionStatus}
    />
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
    deployment.status,
    displayPages,
    document.theme,
    workspaceMode,
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
              onReorderPages={workspaceMode && isSlidePress && document.source?.type !== "mdx"
                ? handleReorderPages
                : undefined}
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
        <WorkbenchRebuildOverlay />
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
              geometryVersion={`${pageViewport.scaleMode}:${pageViewport.scale}:${pageLayoutMode}`}
            />
          ) : null}
        </ReaderStage>
      </WorkbenchShell.MainContent>
    </WorkbenchShell>
  );
}

function normalizePressType(value: ReaderDocument["meta"]["type"]) {
  return value === "slides" ? "slides" : "pages";
}
