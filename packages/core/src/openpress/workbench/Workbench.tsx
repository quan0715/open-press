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
  BOOKMARKS_NAV_CLASS,
  BOOKMARKS_RAIL_CLASS,
  BOOKMARKS_SECTION_CLASS,
  Bookmarks,
  CurrentPagePanel,
  PageThumbnails,
  PUBLIC_DRAWER_BREAKPOINT,
  PUBLIC_IDENTITY_CLASS,
  PUBLIC_IDENTITY_TITLE_CLASS,
  PUBLIC_TITLE_MAIN_CLASS,
  PUBLIC_TITLE_SUB_CLASS,
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
import { Panel, PendingCommentsPanel, WorkbenchControlPanel, type WorkbenchPanel } from "./panels";
import { WorkbenchShell } from "./shell";
import { WorkbenchToolbarActions } from "./shell/WorkbenchToolbarActions";
import { ToastProvider } from "../shared";
import { WorkbenchEditStatusProvider } from "./WorkbenchEditStatusContext";
import { WorkbenchRebuildOverlay } from "./WorkbenchRebuildOverlay";
import { WorkbenchDialog } from "./dialog";
import { useWorkbenchNavigation } from "./hooks/useWorkbenchNavigation";
import { useSlideActions } from "./hooks/useSlideActions";
import {
  formatPageGeometrySpec,
  formatInspectorSelection,
} from "./workbenchFormatters";

const WORKBENCH_THUMBNAILS_SECTION_CLASS = [
  "openpress-panel-section openpress-panel-section--thumbnails",
  "grid min-h-0 grid-rows-[minmax(0,1fr)] overflow-hidden px-[14px] pb-3 pt-2",
].join(" ");

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
  const [deleteSlideTarget, setDeleteSlideTarget] = useState<{ id: string; pageIndex: number } | null>(null);

  const projectIdentity = getProjectIdentity(document.meta);
  const pressType = normalizePressType(document.meta.type);
  const isSlidePress = pressType === "slides";
  const pageGeometry = formatPageGeometrySpec(document.theme);
  const inspectorSelectionLabel = formatInspectorSelection(
    inspector.selectedBlock,
    inspector.selectedObjectEntity,
  );
  const inspectorToolbarExpanded = inspector.inspectorMode;
  const { selectWorkspaceAnchor, selectWorkspacePage } = useWorkbenchNavigation({
    anchorPageMap,
    pages: displayPages,
    rightPanelOpen: reader.rightPanelOpen,
    setPage: reader.setPage,
    toggleRightPanel: reader.toggleRightPanel,
  });
  const skippedSlideIds = useMemo(
    () => new Set((document.source?.slides ?? [])
      .filter((slide) => slide.skip === true)
      .map((slide) => slide.id)),
    [document.source?.slides],
  );
  const pageByFrameKey = useMemo(() => {
    const next = new Map<string, HtmlPageBlock>();
    for (const page of displayPages) {
      if (typeof page.frameKey === "string") next.set(page.frameKey, page);
    }
    return next;
  }, [displayPages]);
  const thumbnailPages = useMemo(() => {
    if (!isSlidePress || !document.source?.slides?.length) return displayPages;
    return document.source.slides.map((slide, index): HtmlPageBlock & { skipped?: boolean; missingPreview?: boolean } => {
      const rendered = pageByFrameKey.get(slide.id);
      if (rendered) return { ...rendered, skipped: slide.skip === true };
      return {
        id: `slide-source-${slide.id}`,
        kind: "htmlPage",
        title: slide.id,
        pageNumber: index + 1,
        html: "",
        frameKey: slide.id,
        className: "openpress-slide-source-placeholder",
        skipped: slide.skip === true,
        missingPreview: true,
      };
    });
  }, [displayPages, document.source?.slides, isSlidePress, pageByFrameKey]);
  const currentThumbnailIndex = useMemo(() => {
    const frameKey = displayPages[reader.currentPageIndex]?.frameKey;
    if (typeof frameKey !== "string") return reader.currentPageIndex;
    const index = thumbnailPages.findIndex((page) => page.frameKey === frameKey);
    return index >= 0 ? index : reader.currentPageIndex;
  }, [displayPages, reader.currentPageIndex, thumbnailPages]);
  const selectThumbnailPage = useCallback((pageIndex: number, options?: { behavior?: ScrollBehavior }) => {
    const frameKey = thumbnailPages[pageIndex]?.frameKey;
    const renderedIndex = displayPages.findIndex((page) => page.frameKey === frameKey);
    if (renderedIndex < 0) return;
    selectWorkspacePage(renderedIndex, options);
  }, [displayPages, selectWorkspacePage, thumbnailPages]);
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

  const slideActions = useSlideActions(pressSlug ?? "", onDocumentRefresh);
  const handleReorderPages = useCallback(
    (fromIndex: number, toIndex: number) => {
      const reordered = [...thumbnailPages];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      const order = reordered
        .map((p) => p.frameKey)
        .filter((k): k is string => typeof k === "string");
      if (order.length !== reordered.length) return;
      slideActions.reorder(order);
    },
    [slideActions, thumbnailPages],
  );
  const handleAddSlide = useCallback(() => {
    slideActions.add();
  }, [slideActions]);
  const handleDeleteSlide = useCallback((pageIndex: number) => {
    const slideId = thumbnailPages[pageIndex]?.frameKey;
    if (!slideId || thumbnailPages.length <= 1) return;
    setDeleteSlideTarget({ id: slideId, pageIndex });
  }, [thumbnailPages]);
  const handleCancelDeleteSlide = useCallback(() => {
    setDeleteSlideTarget(null);
  }, []);
  const handleConfirmDeleteSlide = useCallback(() => {
    if (!deleteSlideTarget) return;
    slideActions.remove(deleteSlideTarget.id);
    setDeleteSlideTarget(null);
  }, [deleteSlideTarget, slideActions]);
  const handleToggleSkipSlide = useCallback((pageIndex: number) => {
    const slideId = thumbnailPages[pageIndex]?.frameKey;
    if (!slideId) return;
    if (skippedSlideIds.has(slideId)) {
      slideActions.unskip(slideId);
      return;
    }
    slideActions.skip(slideId);
  }, [skippedSlideIds, slideActions, thumbnailPages]);

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
  const currentSlideFrameKey = displayPages[reader.currentPageIndex]?.frameKey;
  const currentSlideNotes = isSlidePress && typeof currentSlideFrameKey === "string"
    ? document.source?.slides?.find((slide) => slide.id === currentSlideFrameKey)?.notes?.trim() ?? ""
    : "";
  // Stabilize the panel registry across keystrokes in the inspector
  // composer. Without `useMemo` the registry array (and the JSX closures
  // inside) would be recreated on every Workbench render, so typing a
  // single character would force WorkbenchControlPanel + every panel to
  // diff fresh React elements.
  const builtInControlPanels = useMemo<WorkbenchPanel[]>(() => [
    ...(isSlidePress ? [{
      id: "slide-notes",
      render: () => (
        <SlideNotesPanel
          frameKey={currentSlideFrameKey}
          notes={currentSlideNotes}
        />
      ),
    }] : []),
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
    currentSlideFrameKey,
    currentSlideNotes,
    isSlidePress,
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
        <section className={PUBLIC_IDENTITY_CLASS} aria-label="文件資訊">
          <strong className={PUBLIC_IDENTITY_TITLE_CLASS}>
            <span className={PUBLIC_TITLE_MAIN_CLASS}>{projectIdentity.name}</span>
            {projectIdentity.subtitle ? <span className={PUBLIC_TITLE_SUB_CLASS}>{projectIdentity.subtitle}</span> : null}
          </strong>
          {projectIdentity.label ? <span>{projectIdentity.label}</span> : null}
        </section>

        {!isSlidePress && bookmarks.length > 0 ? (
          <section
            id="openpress-bookmarks"
            className={BOOKMARKS_SECTION_CLASS}
            aria-label="章節書籤"
          >
            <nav className={BOOKMARKS_NAV_CLASS} aria-label="章節導覽" data-openpress-react-bookmarks="true">
              <div className={BOOKMARKS_RAIL_CLASS} aria-hidden="true" />
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
            className={WORKBENCH_THUMBNAILS_SECTION_CLASS}
            aria-label="頁面縮圖"
          >
            <PageThumbnails
              pages={thumbnailPages}
              currentPageIndex={currentThumbnailIndex}
              onSelectPage={selectThumbnailPage}
              onReorderPages={workspaceMode && isSlidePress && document.source?.type !== "mdx"
                ? handleReorderPages
                : undefined}
              onAddPage={workspaceMode && isSlidePress && document.source?.type !== "mdx"
                ? handleAddSlide
                : undefined}
              onDeletePage={workspaceMode && isSlidePress && document.source?.type !== "mdx"
                ? handleDeleteSlide
                : undefined}
              onToggleSkipPage={workspaceMode && isSlidePress && document.source?.type !== "mdx"
                ? handleToggleSkipSlide
                : undefined}
              skippedPageIds={workspaceMode && isSlidePress ? skippedSlideIds : undefined}
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
        {deleteSlideTarget ? (
          <WorkbenchDialog
            titleId="openpress-delete-slide-dialog-title"
            title="Delete slide?"
            eyebrow="Slide action"
            closeLabel="Cancel delete slide"
            onClose={handleCancelDeleteSlide}
            className="openpress-delete-slide-dialog"
            footer={(
              <>
                <button type="button" onClick={handleCancelDeleteSlide}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="openpress-workbench-dialog__danger"
                  onClick={handleConfirmDeleteSlide}
                >
                  Delete slide
                </button>
              </>
            )}
          >
            <div className="openpress-workbench-dialog__body">
              <p>
                Delete <strong>{deleteSlideTarget.id}</strong> from this deck?
              </p>
              <p>
                This removes the slide folder from source. You can still recover it from version control if needed.
              </p>
            </div>
          </WorkbenchDialog>
        ) : null}
      </WorkbenchShell.MainContent>
    </WorkbenchShell>
  );
}

function SlideNotesPanel({
  frameKey,
  notes,
}: {
  frameKey?: string;
  notes: string;
}) {
  return (
    <Panel
      className="openpress-slide-notes-panel openpress-panel--compact"
      data-openpress-slide-notes-panel
      aria-label="Speaker notes"
    >
      <Panel.Header>
        <Panel.HeadingStack>
          <Panel.Kicker>Notes</Panel.Kicker>
          <Panel.Title>Speaker Notes</Panel.Title>
          <Panel.Description>{frameKey ? `Slide: ${frameKey}` : "Current slide"}</Panel.Description>
        </Panel.HeadingStack>
      </Panel.Header>
      <Panel.Body>
        {notes ? (
          <p className="openpress-slide-notes-panel__text">{notes}</p>
        ) : (
          <Panel.Empty role="status">No notes for this slide</Panel.Empty>
        )}
      </Panel.Body>
    </Panel>
  );
}

function normalizePressType(value: ReaderDocument["meta"]["type"]) {
  return value === "slides" ? "slides" : "pages";
}
