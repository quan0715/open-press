import {
  useCallback,
  useEffect,
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
  type SlideSourceEntry,
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
import { cn } from "../core/cn";
import { WorkbenchEditStatusProvider } from "./WorkbenchEditStatusContext";
import { WorkbenchRebuildOverlay } from "./WorkbenchRebuildOverlay";
import {
  WorkbenchDialog,
  WorkbenchDialogAction,
  WorkbenchDialogBody,
  WorkbenchDialogStrong,
  WorkbenchDialogText,
} from "./dialog";
import { useWorkbenchNavigation } from "./hooks/useWorkbenchNavigation";
import { useSlideActions } from "./hooks/useSlideActions";
import { SlideTemplateBrowser } from "./templates/SlideTemplateBrowser";
import { Button } from "@/openpress/ui/button";
import {
  formatPageGeometrySpec,
  formatInspectorSelection,
} from "./workbenchFormatters";

const WORKBENCH_THUMBNAILS_SECTION_CLASS = [
  "openpress-panel-section openpress-panel-section--thumbnails",
  "grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden px-[14px] pb-3 pt-2",
].join(" ");

const WORKBENCH_PANEL_TABS_CLASS = [
  "op-workspace-panel-tabs !grid !h-auto !w-full !grid-cols-2 gap-1 rounded-[var(--op-workspace-radius-md)]",
  "border border-[var(--op-workspace-border-muted)] bg-[var(--op-workspace-surface-muted)] p-1",
].join(" ");

const WORKBENCH_PANEL_TAB_CLASS = [
  "op-ui-button min-w-0 cursor-pointer rounded-[var(--op-workspace-radius-sm)] border border-transparent",
  "bg-transparent px-2 py-1.5 text-[11px] font-bold leading-none text-[var(--op-workspace-text-muted)]",
  "hover:bg-[var(--op-workspace-surface-hover)] hover:text-[var(--op-workspace-text-soft)]",
].join(" ");

const WORKBENCH_PANEL_TAB_ACTIVE_CLASS = [
  "border-[var(--op-workspace-border-strong)] bg-[var(--op-workspace-surface-hover)] text-[var(--op-workspace-text)]",
].join(" ");

type SlideLeftPanelMode = "slides" | "templates";

type OptimisticAddedSlide = {
  id: string;
  page: HtmlPageBlock;
};

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
  const pendingAddedSlideIdRef = useRef<string | null>(null);
  const pendingSelectSlideIndexRef = useRef<number | null>(null);
  const previousTemplateModeActiveRef = useRef(false);
  const deckPageIndexBeforeTemplateRef = useRef<number | null>(null);
  const [optimisticAddedSlides, setOptimisticAddedSlides] = useState<OptimisticAddedSlide[]>([]);
  const [optimisticRemovedSlideIds, setOptimisticRemovedSlideIds] = useState<string[]>([]);
  const [optimisticSkippedSlideIds, setOptimisticSkippedSlideIds] = useState<string[]>([]);
  const [optimisticUnskippedSlideIds, setOptimisticUnskippedSlideIds] = useState<string[]>([]);
  const { viewMode } = useViewMode();
  const projectIdentity = getProjectIdentity(document.meta);
  const pressType = normalizePressType(document.meta.type);
  const panelStateStorageKey = useMemo(
    () => `openpress:${workspaceMode ? "workspace" : "preview"}:panels:${pressType}:${pressSlug ?? "root"}`,
    [pressSlug, pressType, workspaceMode],
  );
  const isSlidePress = pressType === "slides";
  const slideTemplates = useMemo(
    () => (isSlidePress ? document.source?.slideTemplates ?? [] : []),
    [document.source?.slideTemplates, isSlidePress],
  );
  const defaultTemplateName = useMemo(() => {
    if (slideTemplates.length === 0) return null;
    return slideTemplates.find((template) => template.default)?.name ?? slideTemplates[0]?.name ?? null;
  }, [slideTemplates]);
  const [leftPanelMode, setLeftPanelMode] = useState<SlideLeftPanelMode>("slides");
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(defaultTemplateName);
  useEffect(() => {
    if (slideTemplates.length === 0) {
      setLeftPanelMode("slides");
      setSelectedTemplateName(null);
      return;
    }
    if (!selectedTemplateName || !slideTemplates.some((template) => template.name === selectedTemplateName)) {
      setSelectedTemplateName(defaultTemplateName);
    }
  }, [defaultTemplateName, selectedTemplateName, slideTemplates]);
  const templatePreviewPages = useMemo(
    (): HtmlPageBlock[] => {
      const out: HtmlPageBlock[] = [];
      for (const template of slideTemplates) {
        if (!template.preview) continue;
        out.push({
          ...template.preview,
          id: `openpress-template-stage-${template.name}`,
          title: template.preview.title || template.name,
          pageNumber: out.length + 1,
          frameKey: `template:${template.name}`,
        });
      }
      return out;
    },
    [slideTemplates],
  );
  const templatePageNames = useMemo(
    () => slideTemplates
      .filter((template) => Boolean(template.preview))
      .map((template) => template.name),
    [slideTemplates],
  );
  const templateModeActive = isSlidePress && leftPanelMode === "templates" && templatePreviewPages.length > 0;
  const baseSourceSlides = useMemo(
    () => document.source?.slides ?? [],
    [document.source?.slides],
  );
  useEffect(() => {
    if (!isSlidePress) return;
    const baseSlideIds = new Set(baseSourceSlides.map((slide) => slide.id));
    const baseSlideById = new Map(baseSourceSlides.map((slide) => [slide.id, slide]));
    setOptimisticAddedSlides((current) => current.filter((slide) => !baseSlideIds.has(slide.id)));
    setOptimisticRemovedSlideIds((current) => current.filter((id) => baseSlideIds.has(id)));
    setOptimisticSkippedSlideIds((current) => current.filter((id) => baseSlideById.get(id)?.skip !== true));
    setOptimisticUnskippedSlideIds((current) => current.filter((id) => baseSlideById.get(id)?.skip === true));
  }, [baseSourceSlides, isSlidePress]);
  const optimisticRemovedSlideIdSet = useMemo(
    () => new Set(optimisticRemovedSlideIds),
    [optimisticRemovedSlideIds],
  );
  const optimisticSkippedSlideIdSet = useMemo(
    () => new Set(optimisticSkippedSlideIds),
    [optimisticSkippedSlideIds],
  );
  const optimisticUnskippedSlideIdSet = useMemo(
    () => new Set(optimisticUnskippedSlideIds),
    [optimisticUnskippedSlideIds],
  );
  const sourceSlides = useMemo((): SlideSourceEntry[] => {
    if (!isSlidePress) return baseSourceSlides;
    const out = baseSourceSlides
      .filter((slide) => !optimisticRemovedSlideIdSet.has(slide.id))
      .map((slide) => ({
        ...slide,
        skip: optimisticSkippedSlideIdSet.has(slide.id)
          ? true
          : optimisticUnskippedSlideIdSet.has(slide.id)
            ? false
            : slide.skip,
      }));
    const known = new Set(out.map((slide) => slide.id));
    for (const slide of optimisticAddedSlides) {
      if (!known.has(slide.id)) out.push({ id: slide.id, skip: false });
    }
    return out;
  }, [
    baseSourceSlides,
    isSlidePress,
    optimisticAddedSlides,
    optimisticRemovedSlideIdSet,
    optimisticSkippedSlideIdSet,
    optimisticUnskippedSlideIdSet,
  ]);
  const optimisticAddedPageById = useMemo(
    () => new Map(optimisticAddedSlides.map((slide) => [slide.id, slide.page])),
    [optimisticAddedSlides],
  );
  const displayPages = useMemo(() => {
    if (!isSlidePress) return pages;
    const next = pages.filter((page) => {
      if (typeof page.frameKey !== "string") return true;
      if (optimisticRemovedSlideIdSet.has(page.frameKey)) return false;
      if (optimisticSkippedSlideIdSet.has(page.frameKey)) return false;
      return true;
    });
    const existing = new Set(next.map((page) => page.frameKey).filter((key): key is string => typeof key === "string"));
    for (const slide of optimisticAddedSlides) {
      if (!existing.has(slide.id)) next.push(slide.page);
    }
    return renumberPages(next);
  }, [
    isSlidePress,
    optimisticAddedSlides,
    optimisticRemovedSlideIdSet,
    optimisticSkippedSlideIdSet,
    pages,
  ]);
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
    pageCount: Math.max(templateModeActive ? templatePreviewPages.length : displayPages.length, 1),
    leftPanelBreakpoint: PUBLIC_DRAWER_BREAKPOINT,
    rightPanelBreakpoint: PUBLIC_DRAWER_BREAKPOINT,
    panelStateStorageKey,
  });
  const stagePages = templateModeActive ? templatePreviewPages : displayPages;
  const stageCurrentPageIndex = reader.currentPageIndex;
  const registerStagePage = reader.registerPage;
  const [pageLayoutMode, setPageLayoutMode] = useState<PageLayoutMode>("single");
  const pageViewport = usePageViewportScale({
    stageRef: reader.stageRef,
    pageContainerRef: sourceContainerRef,
    pageCount: stagePages.length,
    layoutMode: pageLayoutMode,
  });
  const deployment = useDeploymentWorkbench({ deploymentInfo, pressSlug });
  const [sourceEditorTarget, setSourceEditorTarget] = useState<InlineDocumentSourceTarget | null>(null);
  const [deleteSlideTarget, setDeleteSlideTarget] = useState<{ id: string; pageIndex: number } | null>(null);

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
    () => new Set(sourceSlides
      .filter((slide) => slide.skip === true)
      .map((slide) => slide.id)),
    [sourceSlides],
  );
  const pageByFrameKey = useMemo(() => {
    const next = new Map<string, HtmlPageBlock>();
    for (const page of displayPages) {
      if (typeof page.frameKey === "string") next.set(page.frameKey, page);
    }
    return next;
  }, [displayPages]);
  const thumbnailPages = useMemo(() => {
    if (!isSlidePress || !sourceSlides.length) return displayPages;
    return sourceSlides.map((slide, index): HtmlPageBlock & { skipped?: boolean; missingPreview?: boolean } => {
      const rendered = pageByFrameKey.get(slide.id) ?? optimisticAddedPageById.get(slide.id);
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
  }, [displayPages, isSlidePress, optimisticAddedPageById, pageByFrameKey, sourceSlides]);
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
  const selectTemplatePage = useCallback((name: string) => {
    setSelectedTemplateName(name);
    const templateIndex = templatePageNames.indexOf(name);
    if (templateIndex >= 0) reader.setPage(templateIndex, { behavior: "smooth" });
  }, [reader, templatePageNames]);
  const showTemplatePanel = useCallback(() => {
    if (!templateModeActive) deckPageIndexBeforeTemplateRef.current = reader.currentPageIndex;
    setLeftPanelMode("templates");
    const templateIndex = selectedTemplateName ? templatePageNames.indexOf(selectedTemplateName) : -1;
    reader.setPage(templateIndex >= 0 ? templateIndex : 0, { behavior: "auto" });
  }, [reader, selectedTemplateName, templateModeActive, templatePageNames]);
  const showSlidesPanel = useCallback(() => {
    const restoreIndex = deckPageIndexBeforeTemplateRef.current;
    if (restoreIndex !== null) pendingSelectSlideIndexRef.current = restoreIndex;
    deckPageIndexBeforeTemplateRef.current = null;
    setLeftPanelMode("slides");
  }, []);
  useEffect(() => {
    const wasTemplateModeActive = previousTemplateModeActiveRef.current;
    previousTemplateModeActiveRef.current = templateModeActive;
    if (!templateModeActive || wasTemplateModeActive) return;
    const templateIndex = selectedTemplateName ? templatePageNames.indexOf(selectedTemplateName) : -1;
    reader.setPage(templateIndex >= 0 ? templateIndex : 0, { behavior: "auto" });
  }, [reader, selectedTemplateName, templateModeActive, templatePageNames]);
  useEffect(() => {
    if (!templateModeActive) return;
    const currentTemplateName = templatePageNames[reader.currentPageIndex];
    if (!currentTemplateName || currentTemplateName === selectedTemplateName) return;
    setSelectedTemplateName(currentTemplateName);
  }, [reader.currentPageIndex, selectedTemplateName, templateModeActive, templatePageNames]);
  useEffect(() => {
    const pendingSlideId = pendingAddedSlideIdRef.current;
    if (!pendingSlideId) return;
    const nextIndex = displayPages.findIndex((page) => page.frameKey === pendingSlideId);
    if (nextIndex < 0) return;
    pendingAddedSlideIdRef.current = null;
    pendingSelectSlideIndexRef.current = nextIndex;
    deckPageIndexBeforeTemplateRef.current = null;
    setLeftPanelMode("slides");
  }, [displayPages]);
  useEffect(() => {
    if (leftPanelMode !== "slides") return;
    const nextIndex = pendingSelectSlideIndexRef.current;
    if (nextIndex === null) return;
    pendingSelectSlideIndexRef.current = null;
    selectWorkspacePage(nextIndex, { behavior: "smooth" });
  }, [displayPages, leftPanelMode, selectWorkspacePage]);
  // Inline source editing and inspector commenting are mutually exclusive
  // interaction modes on the same blocks. While inspector mode is on, the
  // user is selecting blocks to comment on — keeping contenteditable + the
  // text cursor active would (a) show the I-beam instead of the inspector
  // crosshair, (b) allow accidental text selection that paints the whole
  // page (notably covers) with the browser ::selection color.
  const inlineEditEnabled = workspaceMode && !inspector.inspectorMode && !templateModeActive;
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
    slideActions.add({
      template: defaultTemplateName ?? undefined,
      onAdded: (slide) => {
        pendingAddedSlideIdRef.current = slide.id;
        setOptimisticAddedSlides((current) => appendOptimisticSlide(current, {
          id: slide.id,
          page: createOptimisticSlidePage({
            slideId: slide.id,
            templateName: defaultTemplateName,
            slideTemplates,
            fallbackTitle: slide.id,
          }),
        }));
      },
    });
  }, [defaultTemplateName, slideActions, slideTemplates]);
  const handleAddTemplateSlide = useCallback((template: string) => {
    slideActions.add({
      template,
      onAdded: (slide) => {
        pendingAddedSlideIdRef.current = slide.id;
        setOptimisticAddedSlides((current) => appendOptimisticSlide(current, {
          id: slide.id,
          page: createOptimisticSlidePage({
            slideId: slide.id,
            templateName: template,
            slideTemplates,
            fallbackTitle: slide.id,
          }),
        }));
      },
    });
  }, [slideActions, slideTemplates]);
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
    const renderedIndex = displayPages.findIndex((page) => page.frameKey === deleteSlideTarget.id);
    pendingSelectSlideIndexRef.current = nextIndexAfterRemoval(renderedIndex, displayPages.length);
    setOptimisticRemovedSlideIds((current) => appendUnique(current, deleteSlideTarget.id));
    setOptimisticSkippedSlideIds((current) => removeValue(current, deleteSlideTarget.id));
    setOptimisticUnskippedSlideIds((current) => removeValue(current, deleteSlideTarget.id));
    setOptimisticAddedSlides((current) => current.filter((slide) => slide.id !== deleteSlideTarget.id));
    slideActions.remove(deleteSlideTarget.id);
    setDeleteSlideTarget(null);
  }, [deleteSlideTarget, displayPages, slideActions]);
  const handleToggleSkipSlide = useCallback((pageIndex: number) => {
    const slideId = thumbnailPages[pageIndex]?.frameKey;
    if (!slideId) return;
    if (skippedSlideIds.has(slideId)) {
      setOptimisticUnskippedSlideIds((current) => appendUnique(current, slideId));
      setOptimisticSkippedSlideIds((current) => removeValue(current, slideId));
      slideActions.unskip(slideId);
      return;
    }
    const renderedIndex = displayPages.findIndex((page) => page.frameKey === slideId);
    pendingSelectSlideIndexRef.current = nextIndexAfterRemoval(renderedIndex, displayPages.length);
    setOptimisticSkippedSlideIds((current) => appendUnique(current, slideId));
    setOptimisticUnskippedSlideIds((current) => removeValue(current, slideId));
    slideActions.skip(slideId);
  }, [displayPages, skippedSlideIds, slideActions, thumbnailPages]);

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
    ? sourceSlides.find((slide) => slide.id === currentSlideFrameKey)?.notes?.trim() ?? ""
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
            {isSlidePress && slideTemplates.length > 0 ? (
              <div
                role="tablist"
                aria-label="Slide left panel"
                className={cn(WORKBENCH_PANEL_TABS_CLASS, "mb-2")}
              >
                <Button
                  type="button"
                  variant="ghost"
                  role="tab"
                  aria-selected={leftPanelMode === "slides"}
                  className={cn(WORKBENCH_PANEL_TAB_CLASS, leftPanelMode === "slides" && WORKBENCH_PANEL_TAB_ACTIVE_CLASS)}
                  onClick={showSlidesPanel}
                >
                  Slides
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  role="tab"
                  aria-selected={leftPanelMode === "templates"}
                  className={cn(WORKBENCH_PANEL_TAB_CLASS, leftPanelMode === "templates" && WORKBENCH_PANEL_TAB_ACTIVE_CLASS)}
                  onClick={showTemplatePanel}
                >
                  Templates
                </Button>
              </div>
            ) : <span aria-hidden="true" />}
            {leftPanelMode === "templates" && isSlidePress ? (
              <SlideTemplateBrowser
                templates={slideTemplates}
                selectedTemplateName={selectedTemplateName}
                onSelectTemplate={selectTemplatePage}
                onAddTemplate={workspaceMode && document.source?.type !== "mdx" ? handleAddTemplateSlide : undefined}
              />
            ) : (
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
            )}
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
            pages={stagePages}
            currentPageIndex={stageCurrentPageIndex}
            sourceContainerRef={sourceContainerRef}
            registerPage={registerStagePage}
            exposeSourceData={workspaceMode && !templateModeActive}
            inspector={templateModeActive ? undefined : inspector}
            onInternalAnchorNavigate={templateModeActive ? undefined : selectWorkspaceAnchor}
            pageLayoutMode={pageLayoutMode}
          />
          {workspaceMode && !templateModeActive ? (
            <InlineInspectorLayer
              sourceContainerRef={sourceContainerRef}
              inspector={inspector}
              comments={inspectorLayerComments}
              composer={inspectorLayerComposer}
              geometryVersion={`${pageViewport.scaleMode}:${pageViewport.scale}:${pageLayoutMode}`}
            />
          ) : null}
          {workspaceMode && !templateModeActive ? (
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
            footer={(
              <>
                <WorkbenchDialogAction onClick={handleCancelDeleteSlide}>
                  Cancel
                </WorkbenchDialogAction>
                <WorkbenchDialogAction
                  tone="danger"
                  onClick={handleConfirmDeleteSlide}
                >
                  Delete slide
                </WorkbenchDialogAction>
              </>
            )}
          >
            <WorkbenchDialogBody>
              <WorkbenchDialogText>
                Delete <WorkbenchDialogStrong>{deleteSlideTarget.id}</WorkbenchDialogStrong> from this deck?
              </WorkbenchDialogText>
              <WorkbenchDialogText>
                This removes the slide folder from source. You can still recover it from version control if needed.
              </WorkbenchDialogText>
            </WorkbenchDialogBody>
          </WorkbenchDialog>
        ) : null}
      </WorkbenchShell.MainContent>
    </WorkbenchShell>
  );
}

function appendUnique(values: string[], value: string) {
  return values.includes(value) ? values : [...values, value];
}

function removeValue(values: string[], value: string) {
  return values.filter((current) => current !== value);
}

function appendOptimisticSlide(slides: OptimisticAddedSlide[], slide: OptimisticAddedSlide) {
  return [...slides.filter((current) => current.id !== slide.id), slide];
}

function nextIndexAfterRemoval(removedIndex: number, pageCount: number) {
  if (removedIndex < 0) return null;
  const nextCount = Math.max(pageCount - 1, 1);
  return Math.min(removedIndex, nextCount - 1);
}

function renumberPages(pages: HtmlPageBlock[]) {
  return pages.map((page, index) => (
    page.pageNumber === index + 1 ? page : { ...page, pageNumber: index + 1 }
  ));
}

function createOptimisticSlidePage({
  slideId,
  templateName,
  slideTemplates,
  fallbackTitle,
}: {
  slideId: string;
  templateName?: string | null;
  slideTemplates: NonNullable<ReaderDocument["source"]>["slideTemplates"];
  fallbackTitle: string;
}): HtmlPageBlock {
  const preview = slideTemplates?.find((template) => template.name === templateName)?.preview
    ?? slideTemplates?.find((template) => template.default)?.preview
    ?? slideTemplates?.[0]?.preview;
  if (preview) {
    return {
      ...preview,
      id: `optimistic-slide-${slideId}`,
      pageNumber: 1,
      frameKey: slideId,
    };
  }
  return {
    id: `optimistic-slide-${slideId}`,
    kind: "htmlPage",
    title: fallbackTitle,
    pageNumber: 1,
    frameKey: slideId,
    html: `<section class="reader-page"><h1>${escapeHtml(fallbackTitle)}</h1></section>`,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
