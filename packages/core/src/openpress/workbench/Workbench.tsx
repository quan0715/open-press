import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  getProjectIdentity,
  type DeploymentInfo,
  type DocumentRefreshOptions,
  type HtmlPageBlock,
  type ReaderDocument,
  type SlideSourceEntry,
  type WorkspaceManifestPress,
} from "../document-model";
import { Info, MousePointer2, Search, Trash2, X } from "lucide-react";
import {
  InlineInspectorLayer,
  resolveInlineSavedComment,
  useInspector,
  useInspectorComments,
  type PendingComment,
} from "./inspector";
import {
  BOOKMARKS_NAV_CLASS,
  BOOKMARKS_RAIL_CLASS,
  BOOKMARKS_SECTION_CLASS,
  DocumentNavigation,
  CurrentPagePanel,
  PageThumbnails,
  PublicPage,
  useReaderRuntime,
  usePageViewportScale,
  useViewMode,
} from "../reader";
import {
  ReaderStage,
  InlineSourceEditorLayer,
  SourceTreeEditorPanel,
  useDocumentWorkbenchModel,
  useInlineDocumentEditor,
  type InlineDocumentSourceTarget,
} from "./document";
import {
  ExportControl,
  PageZoomDock,
  ReaderPreviewControl,
  WorkbenchOverflowControl,
  useDeploymentWorkbench,
} from "./actions";
import { Panel, type WorkbenchPanel } from "./panels";
import {
  SHELL_COMPACT_MEDIA_QUERY,
  SHELL_DRAWER_BREAKPOINT,
  WorkbenchShell,
} from "./shell";
import { WorkbenchToolbarActions } from "./shell/WorkbenchToolbarActions";
import { searchPages, ToastProvider, type SearchReport, type SearchReportMatch } from "../shared";
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
import { useWorkbenchBookmarkGuide } from "./hooks/useWorkbenchBookmarkGuide";
import { useSlideActions } from "./hooks/useSlideActions";
import { SlideTemplateBrowser } from "./templates/SlideTemplateBrowser";
import { Button } from "@/openpress/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/openpress/ui/dropdown-menu";
import {
  formatCommentTimestamp,
  formatCommentsCount,
  formatInspectorSelection,
} from "./workbenchFormatters";
import {
  TOOLBAR_ACTION_CLASS,
  TOOLBAR_ACTION_LABEL_CLASS,
} from "./toolbarClasses";
import {
  WorkspaceAppearanceBoundary,
  useWorkspaceAppearance,
} from "../app/workspaceAppearance";
import { useHotkey } from "../hotkeys";
import {
  ChangePreviewComparison,
  ChangePreviewControl,
  firstChangePageIndex,
  useChangeComparisonStacked,
  useChangePreview,
} from "./changes";

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
const WORKBENCH_LEFT_SEARCH_CLASS = [
  "openpress-left-search border-b border-[var(--op-workspace-border-muted)] px-[14px] py-2.5",
].join(" ");
const WORKBENCH_LEFT_SEARCH_BOX_CLASS = [
  "grid h-9 grid-cols-[16px_minmax(0,1fr)_24px] items-center gap-2 rounded-[var(--op-workspace-radius-md)]",
  "border border-transparent bg-transparent px-2 opacity-70 transition-[border-color,background,opacity] duration-150",
  "hover:bg-[var(--op-workspace-surface-muted)] hover:opacity-95",
  "focus-within:border-[var(--op-workspace-border-muted)] focus-within:bg-transparent focus-within:opacity-100",
].join(" ");
const WORKBENCH_LEFT_SEARCH_INPUT_CLASS = [
  "h-full min-w-0 appearance-none border-0 bg-transparent p-0 text-[12px] text-[var(--op-workspace-text-soft)]",
  "outline-none ring-0 placeholder:text-[var(--op-workspace-text-muted)] placeholder:opacity-60",
  "focus:outline-none focus:ring-0 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
].join(" ");
const WORKBENCH_SEARCH_RESULTS_CLASS = [
  "openpress-left-search-results grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden px-[14px] py-3",
].join(" ");
const WORKBENCH_SEARCH_RESULT_LIST_CLASS = "m-0 grid min-h-0 list-none content-start gap-2 overflow-y-auto p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const WORKBENCH_SEARCH_RESULT_CLASS = [
  "op-ui-button grid min-w-0 cursor-pointer gap-1 rounded-[var(--op-workspace-radius-md)]",
  "border border-[var(--op-workspace-border-muted)] bg-[var(--op-workspace-surface-muted)] px-3 py-2 text-left",
  "text-[var(--op-workspace-text-soft)] hover:border-[var(--op-workspace-border-strong)] hover:bg-[var(--op-workspace-surface-hover)]",
].join(" ");
const WORKSPACE_ACTION_LABEL_CLASS = "text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--op-workspace-text-muted)]";
const WORKBENCH_COMMENT_MENU_CONTENT_CLASS = [
  "op-workspace-comment-menu !w-[min(390px,calc(100vw-24px))] !rounded-[var(--op-workspace-radius-lg)]",
  "!border !border-[var(--op-workspace-border)] !bg-[var(--op-workspace-surface-raised)] !p-0",
  "!text-[var(--op-workspace-text)] !shadow-[var(--op-workspace-shadow-popover)] before:!hidden",
].join(" ");
const WORKBENCH_COMMENT_MENU_HEADER_CLASS = [
  "grid gap-2 border-b border-[var(--op-workspace-border-muted)] px-3 py-3",
].join(" ");
const WORKBENCH_COMMENT_MENU_TITLE_ROW_CLASS = [
  "flex min-w-0 items-center justify-between gap-3",
].join(" ");
const WORKBENCH_COMMENT_MENU_TITLE_CLASS = [
  "m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-bold leading-none text-[var(--op-workspace-text)]",
].join(" ");
const WORKBENCH_COMMENT_MENU_META_CLASS = [
  "m-0 text-[10px] leading-tight text-[var(--op-workspace-text-muted)]",
].join(" ");
const WORKBENCH_COMMENT_MENU_TOGGLE_CLASS = [
  "op-ui-button inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--op-workspace-radius-sm)]",
  "border border-[var(--op-workspace-border-muted)] bg-[var(--op-workspace-surface-muted)] px-2 text-[10px] font-bold",
  "leading-none text-[var(--op-workspace-text-soft)] hover:bg-[var(--op-workspace-surface-hover)] hover:text-[var(--op-workspace-text)]",
  "[&_svg]:h-[12px] [&_svg]:w-[12px]",
].join(" ");
const WORKBENCH_COMMENT_MENU_LIST_CLASS = [
  "m-0 grid max-h-[min(420px,62vh)] list-none gap-0 overflow-y-auto p-0 [scrollbar-width:thin]",
].join(" ");
const WORKBENCH_COMMENT_MENU_EMPTY_CLASS = [
  "px-3 py-5 text-center text-[11px] text-[var(--op-workspace-text-muted)]",
].join(" ");
const WORKBENCH_COMMENT_MENU_ITEM_CLASS = [
  "grid grid-cols-[minmax(0,1fr)_28px] items-center gap-2 border-b border-[var(--op-workspace-border-muted)] px-3 py-2.5 last:border-b-0",
].join(" ");
const WORKBENCH_COMMENT_MENU_JUMP_CLASS = [
  "grid min-w-0 cursor-pointer justify-items-start gap-1 rounded-[var(--op-workspace-radius-sm)] border-0 bg-transparent p-0 text-left",
  "text-[var(--op-workspace-text-soft)] hover:text-[var(--op-workspace-text)] focus-visible:outline-none",
].join(" ");
const WORKBENCH_COMMENT_MENU_NOTE_CLASS = [
  "m-0 overflow-hidden text-[11.5px] font-[560] leading-snug [display:-webkit-box]",
  "[-webkit-box-orient:vertical] [-webkit-line-clamp:2]",
].join(" ");
const WORKBENCH_COMMENT_MENU_PATH_CLASS = [
  "m-0 flex min-w-0 max-w-full flex-wrap gap-x-1.5 gap-y-1 text-[9.5px] leading-tight text-[var(--op-workspace-text-muted)]",
].join(" ");
const WORKBENCH_COMMENT_MENU_CLEAR_CLASS = [
  "op-ui-icon-button inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--op-workspace-radius-sm)]",
  "border border-transparent bg-transparent p-0 text-[var(--op-workspace-text-muted)] hover:bg-[var(--op-workspace-surface-hover)] hover:text-[var(--op-workspace-text)]",
  "disabled:cursor-progress disabled:opacity-50 [&_svg]:h-[13px] [&_svg]:w-[13px]",
].join(" ");
const WORKBENCH_COMMENT_BADGE_CLASS = [
  "pointer-events-none absolute right-[5px] top-[5px] grid min-h-[14px] min-w-[14px] place-items-center rounded-full",
  "bg-[var(--op-workspace-accent)] px-[3px] text-[8px] font-black leading-none text-white",
  "shadow-[0_0_0_1px_var(--op-workspace-surface)]",
].join(" ");
const WORKBENCH_SLIDE_MAIN_CLASS = [
  "op-workspace-slide-main flex h-full min-h-0 flex-col overflow-hidden",
].join(" ");
const WORKBENCH_SLIDE_STAGE_CLASS = [
  "op-workspace-slide-stage min-h-0 flex-1 !h-auto !items-center !overflow-hidden",
].join(" ");
const WORKBENCH_SLIDE_PAGES_CLASS = [
  "op-workspace-slide-pages !content-center !items-center !gap-0 !px-4 !py-0",
].join(" ");
const WORKBENCH_SLIDE_NOTES_DOCK_CLASS = [
  "op-workspace-slide-notes-dock grid min-h-[116px] max-h-[24vh] flex-none grid-rows-[auto_minmax(0,1fr)] gap-2",
  "border-t border-[var(--op-workspace-border-muted)] bg-[var(--op-workspace-panel-bg)] px-6 py-4 text-[var(--op-workspace-text)]",
].join(" ");
const WORKBENCH_SLIDE_NOTES_HEADER_CLASS = [
  "flex min-w-0 items-center justify-between gap-4",
].join(" ");
const WORKBENCH_SLIDE_NOTES_TEXT_CLASS = [
  "m-0 min-h-0 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--op-workspace-text-soft)]",
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
].join(" ");
const WORKBENCH_THEME_TRANSPARENT_BACKDROP_CLASS = [
  "!bg-transparent !backdrop-blur-0 supports-backdrop-filter:!backdrop-blur-0 ![backdrop-filter:none]",
].join(" ");
const PAGE_EDIT_EDITOR_CLASS = [
  "op-workspace-page-edit-editor h-full min-h-0 overflow-hidden bg-[var(--op-workspace-main-bg)] text-[var(--op-workspace-text)]",
].join(" ");
const WORKBENCH_MAIN_MOTION_CLASS = "h-full min-h-0";

type SlideLeftPanelMode = "slides" | "templates";

const WORKBENCH_PANEL_STATE_STORAGE_KEY = "openpress:workspace:panels";
const WORKBENCH_PAGE_SCALE_STORAGE_KEY_PREFIX = "openpress:workspace:page-scale-mode";
const WORKBENCH_MAIN_MOTION_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 0.61, 0.36, 1],
} as const;

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
  workspacePresses?: WorkspaceManifestPress[];
  onSelectWorkspacePress?: (press: WorkspaceManifestPress) => void;
  onDocumentRefresh?: (options?: DocumentRefreshOptions) => void | Promise<void>;
  onBackToWorkspace?: () => void;
  onOpenWorkspaceSettings?: () => void;
  onOpenPresentation?: (pageIndex: number) => void;
  // Optional extension panels are exposed through an on-demand Tools drawer
  // so they do not permanently reduce the document canvas.
  extraControlPanels?: WorkbenchPanel[];
};

export function HtmlWorkbench(props: HtmlWorkbenchProps) {
  return (
    <WorkspaceAppearanceBoundary>
      <ToastProvider>
        <WorkbenchEditStatusProvider>
          <HtmlWorkbenchInner {...props} />
        </WorkbenchEditStatusProvider>
      </ToastProvider>
    </WorkspaceAppearanceBoundary>
  );
}

function HtmlWorkbenchInner({
  document,
  pages,
  style,
  workspaceMode,
  deploymentInfo,
  pressSlug = null,
  workspacePresses,
  onSelectWorkspacePress,
  onDocumentRefresh,
  onBackToWorkspace,
  onOpenWorkspaceSettings,
  onOpenPresentation,
  extraControlPanels,
}: HtmlWorkbenchProps) {
  const workspaceAppearance = useWorkspaceAppearance();
  const [pageWorkspaceMode, setPageWorkspaceMode] = useState<"view" | "source">("view");
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);
  const [sourceContainerVersion, setSourceContainerVersion] = useState(0);
  const setSourceContainerNode = useCallback((node: HTMLDivElement | null) => {
    if (sourceContainerRef.current === node) return;
    sourceContainerRef.current = node;
    setSourceContainerVersion((version) => version + 1);
  }, []);
  const pendingAddedSlideIdRef = useRef<string | null>(null);
  const pendingSelectSlideIndexRef = useRef<number | null>(null);
  const pendingCrossPressCommentRef = useRef<PendingComment | null>(null);
  const previousTemplateModeActiveRef = useRef(false);
  const deckPageIndexBeforeTemplateRef = useRef<number | null>(null);
  const [optimisticAddedSlides, setOptimisticAddedSlides] = useState<OptimisticAddedSlide[]>([]);
  const [optimisticRemovedSlideIds, setOptimisticRemovedSlideIds] = useState<string[]>([]);
  const [optimisticSkippedSlideIds, setOptimisticSkippedSlideIds] = useState<string[]>([]);
  const [optimisticUnskippedSlideIds, setOptimisticUnskippedSlideIds] = useState<string[]>([]);
  const { viewMode } = useViewMode();
  const projectIdentity = getProjectIdentity(document.meta);
  const activePressTitle = useMemo(() => {
    const manifestTitle = pressSlug
      ? workspacePresses?.find((press) => press.slug === pressSlug)?.title
      : null;
    return projectIdentity.name || manifestTitle || pressSlug || "Press Theme";
  }, [pressSlug, projectIdentity.name, workspacePresses]);
  const changePreview = useChangePreview({ workspaceMode, pressSlug });
  const [changeReviewActive, setChangeReviewActive] = useState(false);
  const changeComparisonStacked = useChangeComparisonStacked(changeReviewActive);
  useEffect(() => setChangeReviewActive(false), [pressSlug]);
  useEffect(() => {
    if (changeReviewActive && !changePreview.preview?.document) setChangeReviewActive(false);
  }, [changePreview.preview?.document, changeReviewActive]);
  const pressType = normalizePressType(document.meta.type);
  const isSlidePress = pressType === "slides";
  const pageEditModeAvailable = workspaceMode && !isSlidePress;
  const pageSourceEditMode = pageEditModeAvailable && pageWorkspaceMode === "source";
  const pageInlineEditMode = pageEditModeAvailable && !pageSourceEditMode;
  const slideTemplates = useMemo(
    () => (isSlidePress ? document.source?.slideTemplates ?? [] : []),
    [document.source?.slideTemplates, isSlidePress],
  );
  const defaultTemplateName = useMemo(() => {
    if (slideTemplates.length === 0) return null;
    return slideTemplates.find((template) => template.default)?.name ?? slideTemplates[0]?.name ?? null;
  }, [slideTemplates]);
  const [leftPanelMode, setLeftPanelMode] = useState<SlideLeftPanelMode>("slides");
  const [leftSearchQuery, setLeftSearchQuery] = useState("");
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(defaultTemplateName);
  useEffect(() => {
    if (pageEditModeAvailable || pageWorkspaceMode === "view") return;
    setPageWorkspaceMode("view");
  }, [pageEditModeAvailable, pageWorkspaceMode]);
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
    anchorPageMap,
    bookmarks,
    figures,
    sourceBlockMap,
    sourceBlocksByPath,
    projectMentionItems,
    tables,
  } = useDocumentWorkbenchModel(document, displayPages);
  const inspector = useInspector(document, { enabled: workspaceMode });
  const changeComparisonDocument = changeReviewActive ? changePreview.preview?.document ?? null : null;
  const readerPageCount = changeComparisonDocument
    ? Math.max(displayPages.length, changeComparisonDocument.blocks.length, 1)
    : Math.max(templateModeActive ? templatePreviewPages.length : displayPages.length, 1);
  const reader = useReaderRuntime({
    pageCount: readerPageCount,
    leftPanelBreakpoint: SHELL_DRAWER_BREAKPOINT,
    panelStateStorageKey: WORKBENCH_PANEL_STATE_STORAGE_KEY,
    initialPanelState: {
      leftPanelOpen: !isNarrowWorkspaceViewport(),
      rightPanelOpen: false,
    },
  });
  useHotkey("workspace.toggle-bookmarks", reader.toggleLeftPanel, { enabled: !pageSourceEditMode });
  useWorkbenchBookmarkGuide({
    bookmarks,
    currentPageIndex: reader.currentPageIndex,
    documentKey: document.meta.renderId ?? document,
    storageKey: pressSlug ? `openpress:workbench:bookmark-guide:${pressSlug}` : null,
    setPage: reader.setPage,
  });
  const stagePages = templateModeActive ? templatePreviewPages : displayPages;
  const stageCurrentPageIndex = reader.currentPageIndex;
  const renderedStagePages = useMemo(() => {
    if (!isSlidePress) return stagePages;
    const activePage = stagePages[stageCurrentPageIndex] ?? stagePages[0];
    return activePage ? [activePage] : stagePages;
  }, [isSlidePress, stageCurrentPageIndex, stagePages]);
  const registerStagePage = reader.registerPage;
  const pageViewport = usePageViewportScale({
    stageRef: reader.stageRef,
    pageContainerRef: sourceContainerRef,
    pageCount: readerPageCount,
    layoutMode: changeReviewActive && !changeComparisonStacked ? "spread" : "single",
    scaleModeStorageKey: pressSlug
      ? `${WORKBENCH_PAGE_SCALE_STORAGE_KEY_PREFIX}:${encodeURIComponent(pressSlug)}`
      : undefined,
    viewportKey: `page-view:${changeReviewActive ? changeComparisonStacked ? "change-stack" : "change-spread" : "current"}`,
  });
  const deployment = useDeploymentWorkbench({ deploymentInfo, pressSlug });
  const [sourceEditorTarget, setSourceEditorTarget] = useState<InlineDocumentSourceTarget | null>(null);
  const [deleteSlideTarget, setDeleteSlideTarget] = useState<{ id: string; pageIndex: number } | null>(null);
  const togglePageSourceMode = useCallback(() => {
    setSourceEditorTarget(null);
    setChangeReviewActive(false);
    inspector.setInspectorMode(false);
    setPageWorkspaceMode((current) => current === "source" ? "view" : "source");
  }, [inspector.setInspectorMode]);
  const handlePageSourceSaved = useCallback(async (options?: DocumentRefreshOptions) => {
    await onDocumentRefresh?.(options);
    setPageWorkspaceMode("view");
  }, [onDocumentRefresh]);
  const handleInlineDocumentEdited = useCallback(async (options?: DocumentRefreshOptions) => {
    await onDocumentRefresh?.(options);
  }, [onDocumentRefresh]);

  const inspectorSelectionLabel = formatInspectorSelection(
    inspector.selectedBlock,
    inspector.selectedObjectEntity,
  );
  const { selectWorkspaceAnchor, selectWorkspacePage } = useWorkbenchNavigation({
    anchorPageMap,
    pages: displayPages,
    setPage: reader.setPage,
  });
  const leftSearchText = leftSearchQuery.trim();
  const leftSearchReport = useMemo<SearchReport | null>(
    () => leftSearchText
      ? searchPages(displayPages, { query: leftSearchText, caseSensitive: false })
      : null,
    [displayPages, leftSearchText],
  );
  const handleSelectSearchMatch = useCallback((match: SearchReportMatch) => {
    const pageIndex = pageIndexFromSearchMatch(match);
    if (pageIndex === null) return;
    setLeftSearchQuery("");
    if (templateModeActive) {
      pendingSelectSlideIndexRef.current = pageIndex;
      deckPageIndexBeforeTemplateRef.current = null;
      setLeftPanelMode("slides");
      return;
    }
    selectWorkspacePage(pageIndex, { behavior: "smooth" });
  }, [selectWorkspacePage, templateModeActive]);
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
    setChangeReviewActive(false);
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
  useEffect(() => {
    if (!pageSourceEditMode) return;
    setSourceEditorTarget(null);
    if (inspector.inspectorMode) inspector.setInspectorMode(false);
  }, [inspector.inspectorMode, inspector.setInspectorMode, pageSourceEditMode]);
  const inlineEditEnabled = workspaceMode
    && !changeReviewActive
    && !inspector.inspectorMode
    && !templateModeActive
    && (isSlidePress || pageInlineEditMode);
  useInlineDocumentEditor({
    enabled: inlineEditEnabled,
    sourceContainerRef,
    sourceContainerVersion,
    sourceBlockMap,
    pressSlug,
    onOpenSourceBlock: setSourceEditorTarget,
    onDocumentEdited: handleInlineDocumentEdited,
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
  const handleChangeReviewActiveChange = useCallback((nextActive: boolean) => {
    if (nextActive && !changePreview.preview?.document) return;
    setSourceEditorTarget(null);
    setPageWorkspaceMode("view");
    if (nextActive) {
      inspector.setInspectorMode(false);
      setLeftPanelMode("slides");
    }
    setChangeReviewActive(nextActive);
    if (!nextActive) return;
    const firstPageIndex = firstChangePageIndex(
      changePreview.preview?.proposals ?? [],
      sourceBlocksByPath,
      document,
    );
    if (firstPageIndex !== null) reader.setPage(firstPageIndex, { behavior: "smooth" });
  }, [changePreview.preview, document, inspector.setInspectorMode, reader, sourceBlocksByPath]);
  const handleInspectorModeChange = useCallback((nextActive: boolean) => {
    if (nextActive) setChangeReviewActive(false);
    inspector.setInspectorMode(nextActive);
  }, [inspector.setInspectorMode]);
  const handleSelectPendingComment = useCallback((comment: PendingComment) => {
    setChangeReviewActive(false);
    const targetPress = findWorkspacePressForCommentPath(comment.path, workspacePresses);
    if (targetPress && targetPress.slug !== pressSlug && onSelectWorkspacePress) {
      pendingCrossPressCommentRef.current = comment;
      onSelectWorkspacePress(targetPress);
      return;
    }
    comments.handleSelectPendingComment(comment);
  }, [
    comments.handleSelectPendingComment,
    onSelectWorkspacePress,
    pressSlug,
    workspacePresses,
  ]);
  useEffect(() => {
    const pendingComment = pendingCrossPressCommentRef.current;
    if (!pendingComment) return;
    const targetPress = findWorkspacePressForCommentPath(pendingComment.path, workspacePresses);
    if (targetPress && targetPress.slug !== pressSlug) return;
    if (resolveInlineSavedComment(pendingComment, sourceBlocksByPath).length === 0) return;

    pendingCrossPressCommentRef.current = null;
    comments.handleSelectPendingComment(pendingComment);
  }, [
    comments.handleSelectPendingComment,
    pressSlug,
    sourceBlocksByPath,
    workspacePresses,
  ]);

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

  const currentSlideFrameKey = displayPages[reader.currentPageIndex]?.frameKey;
  const currentSlideNotes = isSlidePress && typeof currentSlideFrameKey === "string"
    ? sourceSlides.find((slide) => slide.id === currentSlideFrameKey)?.notes?.trim() ?? ""
    : "";
  const currentDocumentPageIndex = Math.min(
    Math.max(templateModeActive ? deckPageIndexBeforeTemplateRef.current ?? 0 : reader.currentPageIndex, 0),
    Math.max(displayPages.length - 1, 0),
  );
  // Memoize so composer keystrokes (which only flip `comments.inspectorCommentText`)
  // don't rebuild the toolbar JSX. The toolbar depends on deploy and Press
  // routing state, but never on the composer draft text.
  const toolbarActions = useMemo(() => (
    <WorkbenchToolbarActions
      onBackToWorkspace={onBackToWorkspace}
      workspacePresses={workspacePresses}
      activePressSlug={pressSlug}
      onSelectWorkspacePress={onSelectWorkspacePress}
      activePressTitle={activePressTitle}
      activePressType={pressType}
      bookmarksOpen={reader.leftPanelOpen}
      onToggleBookmarks={pageSourceEditMode ? undefined : reader.toggleLeftPanel}
      rightActions={(
        <>
          <ChangePreviewControl
            workspaceMode={workspaceMode}
            preview={changePreview.preview}
            status={changePreview.status}
            error={changePreview.error}
            active={changeReviewActive}
            onActiveChange={handleChangeReviewActiveChange}
            onRefresh={changePreview.refresh}
            onClear={changePreview.clear}
          />
          <CommentInspectorControl
            workspaceMode={workspaceMode}
            inspectorMode={inspector.inspectorMode}
            inspectorSelectionLabel={inspectorSelectionLabel}
            onInspectorModeChange={handleInspectorModeChange}
            comments={comments.pendingComments}
            status={comments.commentsStatus}
            error={comments.commentsError}
            onClear={comments.clearPendingComment}
            onSelect={handleSelectPendingComment}
            inspectorCommentStatusMessage={comments.inspectorCommentStatusMessage}
          />
          <ReaderPreviewControl pressSlug={pressSlug} />
          <ExportControl
            placement="toolbar"
            pages={displayPages}
            currentPageIndex={currentDocumentPageIndex}
            pressTitle={activePressTitle}
            theme={document.theme}
            onExportPdf={deployment.handleOpenWorkbenchPdf}
            pdfDisabled={deployment.pdfButtonDisabled}
            pdfActionStatus={deployment.pdfActionStatus}
            onExportWord={!isSlidePress && deployment.localDeployEnabled
              ? deployment.handleOpenWorkbenchWord
              : undefined}
            wordDisabled={deployment.wordButtonDisabled}
            wordActionStatus={deployment.wordActionStatus}
            onOpenPresentation={isSlidePress && onOpenPresentation
              ? () => onOpenPresentation(currentDocumentPageIndex)
              : undefined}
          />
          <WorkbenchOverflowControl
            onOpenWorkspaceSettings={onOpenWorkspaceSettings}
            mdx={pageEditModeAvailable ? {
              active: pageSourceEditMode,
              onToggle: togglePageSourceMode,
            } : undefined}
            deployment={deployment.localDeployEnabled ? {
              info: deployment.currentDeploymentInfo,
              status: deployment.status,
              onDeploy: deployment.handleDeploy,
            } : undefined}
            panels={extraControlPanels ?? []}
          />
          <WorkbenchDocumentInfoControl
            title={activePressTitle}
            pressType={pressType}
            theme={document.theme}
            pages={displayPages}
          />
        </>
      )}
    />
  ), [
    activePressTitle,
    comments.clearPendingComment,
    comments.commentsError,
    comments.commentsStatus,
    comments.inspectorCommentStatusMessage,
    comments.pendingComments,
    changePreview.clear,
    changePreview.error,
    changePreview.preview,
    changePreview.refresh,
    changePreview.status,
    changeReviewActive,
    deployment.currentDeploymentInfo,
    deployment.handleDeploy,
    deployment.handleOpenWorkbenchPdf,
    deployment.handleOpenWorkbenchWord,
    deployment.localDeployEnabled,
    deployment.pdfActionStatus,
    deployment.pdfButtonDisabled,
    deployment.status,
    deployment.wordActionStatus,
    deployment.wordButtonDisabled,
    displayPages,
    document.theme,
    extraControlPanels,
    inspector.inspectorMode,
    inspectorSelectionLabel,
    handleInspectorModeChange,
    handleSelectPendingComment,
    handleChangeReviewActiveChange,
    onBackToWorkspace,
    onOpenWorkspaceSettings,
    onOpenPresentation,
    onSelectWorkspacePress,
    pageSourceEditMode,
    pageEditModeAvailable,
    pressSlug,
    pressType,
    reader.leftPanelOpen,
    reader.toggleLeftPanel,
    currentDocumentPageIndex,
    isSlidePress,
    togglePageSourceMode,
    workspaceMode,
    workspacePresses,
  ]);
  const mainTransitionKey = `${pressSlug ?? document.meta.title}:${pressType}:${pageWorkspaceMode}`;

  return (
    <WorkbenchShell
      style={style}
      viewMode={viewMode}
      pressType={pressType}
      presentationMode={false}
      inspectorMode={inspector.inspectorMode}
      editMode={inlineEditEnabled || pageSourceEditMode}
      leftPanelOpen={!pageSourceEditMode && reader.leftPanelOpen}
      rightPanelOpen={!pageSourceEditMode}
      onToggleLeftPanel={reader.toggleLeftPanel}
      onToggleRightPanel={reader.toggleRightPanel}
      withRightPanel={false}
      showPanelToggles={false}
      fixedPanels={!pageSourceEditMode}
      resizableLeftPanel={!pageSourceEditMode}
      colorMode={workspaceAppearance.resolvedColorMode}
    >
      <WorkbenchShell.Toolbar>
        {toolbarActions}
      </WorkbenchShell.Toolbar>

      <WorkbenchShell.LeftPanel>
        <LeftPanelSearch
          query={leftSearchQuery}
          resultCount={leftSearchReport?.matchCount ?? 0}
          onQueryChange={setLeftSearchQuery}
          onClear={() => setLeftSearchQuery("")}
        />

        {leftSearchReport ? (
          <LeftPanelSearchResults
            report={leftSearchReport}
            onSelectMatch={handleSelectSearchMatch}
          />
        ) : !isSlidePress && (bookmarks.length > 0 || figures.length > 0 || tables.length > 0) ? (
          <section
            id="openpress-bookmarks"
            className={BOOKMARKS_SECTION_CLASS}
            aria-label="文件目錄"
          >
            <nav className={BOOKMARKS_NAV_CLASS} aria-label="文件目錄導覽" data-openpress-react-bookmarks="true">
              <div className={BOOKMARKS_RAIL_CLASS} aria-hidden="true" />
              <DocumentNavigation
                key={pressSlug}
                bookmarks={bookmarks}
                figures={figures}
                tables={tables}
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
                pageWidth={document.theme?.pageWidth}
                pageHeight={document.theme?.pageHeight}
                pageAspectRatio={document.theme?.pageAspectRatio}
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

      <WorkbenchShell.MainContent>
        <WorkbenchRebuildOverlay />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mainTransitionKey}
            className={WORKBENCH_MAIN_MOTION_CLASS}
            initial={{ opacity: 0, y: 6, scale: 0.998 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.998 }}
            transition={WORKBENCH_MAIN_MOTION_TRANSITION}
          >
            {pageSourceEditMode ? (
              <section
                className={PAGE_EDIT_EDITOR_CLASS}
                aria-label="MDX source editor"
                data-openpress-page-edit-editor
              >
                <SourceTreeEditorPanel
                  sourceBlocksByPath={sourceBlocksByPath}
                  activeBlockIds={displayPages[currentDocumentPageIndex]?.blockIds}
                  pressSlug={pressSlug}
                  onDocumentEdited={handlePageSourceSaved}
                />
              </section>
            ) : (
              <div
                className={isSlidePress ? WORKBENCH_SLIDE_MAIN_CLASS : "contents"}
                data-openpress-slide-workspace-main={isSlidePress ? "true" : undefined}
              >
                <ReaderStage ref={reader.stageRef} className={isSlidePress ? WORKBENCH_SLIDE_STAGE_CLASS : undefined}>
                  {changeReviewActive && changeComparisonDocument ? (
                    <ChangePreviewComparison
                      currentDocument={document}
                      currentPages={stagePages}
                      proposedDocument={changeComparisonDocument}
                      proposals={changePreview.preview?.proposals ?? []}
                      currentPageIndex={stageCurrentPageIndex}
                      sourceBlocksByPath={sourceBlocksByPath}
                      sourceContainerRef={setSourceContainerNode}
                      registerPage={registerStagePage}
                      onFeedbackChange={changePreview.saveFeedback}
                      stacked={changeComparisonStacked}
                    />
                  ) : (
                    <PublicPage
                      pages={renderedStagePages}
                      currentPageIndex={stageCurrentPageIndex}
                      sourceContainerRef={setSourceContainerNode}
                      registerPage={registerStagePage}
                      exposeSourceData={workspaceMode && !templateModeActive}
                      inspector={templateModeActive ? undefined : inspector}
                      onInternalAnchorNavigate={templateModeActive ? undefined : selectWorkspaceAnchor}
                      className={isSlidePress ? WORKBENCH_SLIDE_PAGES_CLASS : undefined}
                    />
                  )}
                  {workspaceMode && !templateModeActive ? (
                    <InlineInspectorLayer
                      sourceContainerRef={sourceContainerRef}
                      inspector={inspector}
                      comments={inspectorLayerComments}
                      composer={inspectorLayerComposer}
                      geometryVersion={`${pageViewport.scaleMode}:${pageViewport.scale}`}
                    />
                  ) : null}
                  {workspaceMode && !templateModeActive ? (
                    <InlineSourceEditorLayer
                      target={sourceEditorTarget}
                      onClose={() => setSourceEditorTarget(null)}
                      geometryVersion={`${pageViewport.scaleMode}:${pageViewport.scale}`}
                    />
                  ) : null}
                </ReaderStage>
                {isSlidePress && !templateModeActive ? (
                  <SlideSpeakerNotesDock
                    frameKey={currentSlideFrameKey}
                    notes={currentSlideNotes}
                  />
                ) : null}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        {!pageSourceEditMode ? (
          <PageZoomDock
            placement="floating"
            scaleMode={pageViewport.scaleMode}
            scale={pageViewport.scale}
            scaleLabel={pageViewport.scaleLabel}
            onScaleModeChange={pageViewport.setScaleMode}
          />
        ) : null}
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

function LeftPanelSearch({
  query,
  resultCount,
  onQueryChange,
  onClear,
}: {
  query: string;
  resultCount: number;
  onQueryChange: (query: string) => void;
  onClear: () => void;
}) {
  const active = query.trim().length > 0;

  return (
    <section className={WORKBENCH_LEFT_SEARCH_CLASS} aria-label="Search">
      <label className={WORKBENCH_LEFT_SEARCH_BOX_CLASS}>
        <Search size={14} aria-hidden="true" className="text-[var(--op-workspace-text-muted)]" />
        <input
          type="search"
          className={WORKBENCH_LEFT_SEARCH_INPUT_CLASS}
          data-openpress-left-search-input
          value={query}
          placeholder="Search"
          aria-label="Search pages"
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {active ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6 rounded-[var(--op-workspace-radius-sm)] text-[var(--op-workspace-text-muted)] hover:text-[var(--op-workspace-text)]"
            data-openpress-left-search-clear
            aria-label="Clear search"
            title="Clear search"
            onClick={onClear}
          >
            <X size={13} aria-hidden="true" />
          </Button>
        ) : (
          <span aria-hidden="true" />
        )}
      </label>
      {active ? (
        <p className="mb-0 mt-2 text-[10px] font-medium leading-none text-[var(--op-workspace-text-muted)]" role="status">
          {resultCount} result{resultCount === 1 ? "" : "s"}
        </p>
      ) : null}
    </section>
  );
}

function LeftPanelSearchResults({
  report,
  onSelectMatch,
}: {
  report: SearchReport;
  onSelectMatch: (match: SearchReportMatch) => void;
}) {
  const matches = report.matches.slice(0, 80);

  return (
    <section className={WORKBENCH_SEARCH_RESULTS_CLASS} aria-label="Search results" data-openpress-left-search-results>
      <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
        <span className={WORKSPACE_ACTION_LABEL_CLASS}>Results</span>
        <span className="text-[10px] text-[var(--op-workspace-text-muted)]">{report.matchCount}</span>
      </div>
      {matches.length > 0 ? (
        <ol className={WORKBENCH_SEARCH_RESULT_LIST_CLASS}>
          {matches.map((match) => {
            const pageIndex = pageIndexFromSearchMatch(match);
            const pageLabel = pageIndex === null ? match.file : `Page ${pageIndex + 1}`;
            return (
              <li key={match.id}>
                <Button
                  type="button"
                  variant="ghost"
                  className={WORKBENCH_SEARCH_RESULT_CLASS}
                  data-openpress-left-search-result
                  onClick={() => onSelectMatch(match)}
                >
                  <span className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-bold text-[var(--op-workspace-text)]">
                      {pageLabel}
                    </span>
                    <span className="shrink-0 text-[10px] text-[var(--op-workspace-text-muted)]">
                      {match.line}:{match.column}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-[11px] font-normal leading-snug text-[var(--op-workspace-text-muted)]">
                    {match.preview || match.text}
                  </span>
                </Button>
              </li>
            );
          })}
        </ol>
      ) : (
        <Panel.Empty role="status">No results</Panel.Empty>
      )}
    </section>
  );
}

function CommentInspectorControl({
  workspaceMode,
  inspectorMode,
  inspectorSelectionLabel,
  onInspectorModeChange,
  comments,
  status,
  error,
  onClear,
  onSelect,
  inspectorCommentStatusMessage,
}: {
  workspaceMode: boolean;
  inspectorMode: boolean;
  inspectorSelectionLabel: string;
  onInspectorModeChange: (enabled: boolean) => void;
  comments: PendingComment[];
  status: "idle" | "loading" | "ready" | "failed" | "clearing";
  error: string;
  onClear: (id: string) => Promise<void>;
  onSelect: (comment: PendingComment) => void;
  inspectorCommentStatusMessage: string;
}) {
  const [open, setOpen] = useState(false);
  if (!workspaceMode) return null;

  const hasComments = comments.length > 0;
  const busy = status === "loading" || status === "clearing";
  const badgeLabel = comments.length > 99 ? "99+" : String(comments.length);
  const title = hasComments
    ? `待處理註解 ${comments.length} 則`
    : inspectorMode
      ? "關閉註解"
      : "開啟註解";
  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={TOOLBAR_ACTION_CLASS}
      data-openpress-inspector-toggle
      data-openpress-inspector-active={inspectorMode ? "true" : "false"}
      data-openpress-toolbar-expanded="false"
      data-openpress-toolbar-active={inspectorMode ? "true" : "false"}
      aria-pressed={inspectorMode}
      title={title}
      aria-label={title}
      onClick={hasComments ? undefined : () => onInspectorModeChange(!inspectorMode)}
    >
      <MousePointer2 aria-hidden="true" />
      {hasComments ? <span className={WORKBENCH_COMMENT_BADGE_CLASS}>{badgeLabel}</span> : null}
      <span className={TOOLBAR_ACTION_LABEL_CLASS}>Inspect</span>
    </Button>
  );

  if (!hasComments) return trigger;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={0}
        className={WORKBENCH_COMMENT_MENU_CONTENT_CLASS}
        data-openpress-comment-menu
      >
        <div className={WORKBENCH_COMMENT_MENU_HEADER_CLASS}>
          <div className={WORKBENCH_COMMENT_MENU_TITLE_ROW_CLASS}>
            <div className="min-w-0">
              <p className={WORKBENCH_COMMENT_MENU_TITLE_CLASS}>Comments</p>
              <p className={WORKBENCH_COMMENT_MENU_META_CLASS}>
                {formatCommentsCount(comments.length, status)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={WORKBENCH_COMMENT_MENU_TOGGLE_CLASS}
              onClick={() => onInspectorModeChange(!inspectorMode)}
              aria-pressed={inspectorMode}
            >
              <MousePointer2 aria-hidden="true" />
              {inspectorMode ? "On" : "Off"}
            </Button>
          </div>
          {inspectorMode ? (
            <p className={WORKBENCH_COMMENT_MENU_META_CLASS} role="status" aria-live="polite">
              {inspectorCommentStatusMessage || inspectorSelectionLabel}
            </p>
          ) : null}
        </div>

        {error ? (
          <p className={`${WORKBENCH_COMMENT_MENU_EMPTY_CLASS} text-[var(--op-workspace-danger)]`}>
            {error}
          </p>
        ) : null}

        {comments.length === 0 && status !== "loading" ? (
          <p className={WORKBENCH_COMMENT_MENU_EMPTY_CLASS}>目前沒有註解</p>
        ) : (
          <ol className={WORKBENCH_COMMENT_MENU_LIST_CLASS} aria-label="待處理註解列表">
            {comments.map((comment) => (
              <li className={WORKBENCH_COMMENT_MENU_ITEM_CLASS} data-openpress-comment-id={comment.id} key={comment.id}>
                <button
                  type="button"
                  className={WORKBENCH_COMMENT_MENU_JUMP_CLASS}
                  onClick={() => {
                    setOpen(false);
                    onSelect(comment);
                  }}
                  aria-label={`跳到註解 ${comment.id}`}
                >
                  <p className={WORKBENCH_COMMENT_MENU_NOTE_CLASS} title={comment.note}>{comment.note}</p>
                  <p className={WORKBENCH_COMMENT_MENU_PATH_CLASS}>
                    <code className="min-w-0 overflow-hidden text-ellipsis border-0 bg-transparent p-0 [font-family:var(--openpress-font-mono)]">
                      {comment.path}:{comment.line}
                    </code>
                    {comment.timestamp ? <span>{formatCommentTimestamp(comment.timestamp)}</span> : null}
                  </p>
                </button>
                <button
                  type="button"
                  className={WORKBENCH_COMMENT_MENU_CLEAR_CLASS}
                  disabled={busy}
                  onClick={() => void onClear(comment.id)}
                  aria-label={`清除註解 ${comment.id}`}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function pageIndexFromSearchMatch(match: SearchReportMatch) {
  const parsed = /^page:(\d+)$/.exec(match.path);
  if (!parsed) return null;
  const value = Number(parsed[1]);
  return Number.isFinite(value) ? value : null;
}

function isNarrowWorkspaceViewport() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(SHELL_COMPACT_MEDIA_QUERY).matches;
}

function appendUnique(values: string[], value: string) {
  return values.includes(value) ? values : [...values, value];
}

function removeValue(values: string[], value: string) {
  return values.filter((current) => current !== value);
}

function findWorkspacePressForCommentPath(path: string | undefined, presses?: WorkspaceManifestPress[]) {
  if (!path || !presses?.length) return null;
  const normalizedPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
  const orderedPresses = [...presses].sort((left, right) => right.slug.length - left.slug.length);
  return orderedPresses.find((press) => {
    const slug = press.slug.replace(/^\/+|\/+$/g, "");
    if (!slug) return false;
    return normalizedPath === slug
      || normalizedPath.startsWith(`${slug}/`)
      || normalizedPath.includes(`/press/${slug}/`)
      || normalizedPath.startsWith(`press/${slug}/`)
      || normalizedPath.includes(`/${slug}/`);
  }) ?? null;
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

function SlideSpeakerNotesDock({
  frameKey,
  notes,
}: {
  frameKey?: string;
  notes: string;
}) {
  return (
    <section
      className={WORKBENCH_SLIDE_NOTES_DOCK_CLASS}
      data-openpress-slide-notes-dock
      aria-label="Speaker notes"
    >
      <header className={WORKBENCH_SLIDE_NOTES_HEADER_CLASS}>
        <div className="grid min-w-0 gap-1">
          <span className={WORKSPACE_ACTION_LABEL_CLASS}>Speaker Notes</span>
          <strong className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-semibold leading-none text-[var(--op-workspace-text)]">
            {frameKey ? `Slide: ${frameKey}` : "Current slide"}
          </strong>
        </div>
      </header>
      {notes ? (
        <p className={WORKBENCH_SLIDE_NOTES_TEXT_CLASS}>{notes}</p>
      ) : (
        <p className={cn(WORKBENCH_SLIDE_NOTES_TEXT_CLASS, "text-[var(--op-workspace-text-muted)]")} role="status">
          No notes for this slide
        </p>
      )}
    </section>
  );
}

function WorkbenchDocumentStats({
  pages,
}: {
  pages: { html: string }[];
}) {
  const stats = useMemo(() => {
    let charCount = 0;
    let imgCount = 0;
    for (const p of pages) {
      charCount += (p.html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, '').length || 0);
      const matches = p.html.match(/<img /g);
      if (matches) imgCount += matches.length;
    }
    const readingTime = Math.max(1, Math.ceil(charCount / 400));
    return { charCount, imgCount, readingTime };
  }, [pages]);

  return (
    <section aria-label="Document stats" className="grid gap-2">
      <h3 className={WORKSPACE_ACTION_LABEL_CLASS}>Structure Summary</h3>
      <div className="grid grid-cols-2 gap-x-5 gap-y-1 sm:grid-cols-4">
        {[
          ["Pages", pages.length.toLocaleString()],
          ["Words", stats.charCount.toLocaleString()],
          ["Reading Time", `${stats.readingTime} min`],
          ...(stats.imgCount > 0 ? [["Images", stats.imgCount.toLocaleString()]] : []),
        ].map(([label, value]) => (
          <div key={label} className="grid gap-1 border-t border-[var(--op-workspace-border-muted)] py-2">
            <span className="text-[9px] font-medium uppercase tracking-[0.06em] text-[var(--op-workspace-text-muted)]">{label}</span>
            <span className="text-[12px] font-medium text-[var(--op-workspace-text)]">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkbenchDocumentInfoControl({
  title,
  pressType,
  theme,
  pages,
}: {
  title: string;
  pressType: "pages" | "slides";
  theme?: ReaderDocument["theme"];
  pages: { html: string }[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const themeTokens = useResolvedThemeTokens(theme, dialogOpen);
  const colorTokens = themeTokens.colors.length > 0
    ? themeTokens.colors
    : [
      { key: "accent", label: "Accent", value: theme?.accentColor ?? "#df4b21" },
      { key: "ink", label: "Text", value: theme?.textColor ?? "#20242a" },
      { key: "canvas", label: "Canvas", value: "#f7f5ee" },
    ];
  const previewBg = themeColorValue(colorTokens, ["paper", "surface", "canvas", "bg"], "#f7f5ee");
  const previewInk = themeColorValue(colorTokens, ["ink", "text"], theme?.textColor ?? "#20242a");
  const typographyTokens = themeTokens.typography;
  const geometry = [
    ["Preset", theme?.pagePreset ?? pressType],
    ["Size", theme?.pageWidth && theme?.pageHeight ? `${theme.pageWidth} × ${theme.pageHeight}` : "Inherited"],
    ["Ratio", theme?.pageAspectRatio ?? theme?.pageHeightRatio ?? "Auto"],
    ["Padding", theme?.pagePadding ?? "Theme default"],
  ];
  const fontLabel = themeTokens.fontLabel;
  const styleLabel = title || "Theme";

  return (
    <>
      <Button
        ref={infoButtonRef}
        type="button"
        variant="ghost"
        size="icon-sm"
        className={TOOLBAR_ACTION_CLASS}
        data-openpress-document-info="true"
        aria-label="文件資訊"
        title="文件資訊"
        onClick={() => setDialogOpen(true)}
      >
        <Info aria-hidden="true" />
        <span className={TOOLBAR_ACTION_LABEL_CLASS}>Info</span>
      </Button>
      {dialogOpen ? (
        <WorkbenchDialog
          titleId={titleId}
          eyebrow="Document"
          title="文件資訊"
          titleMeta={<span className="text-[10px] font-semibold text-[var(--op-workspace-text-muted)]">{pressType}</span>}
          closeLabel="關閉文件資訊"
          placement="center"
          contentDataAttribute="data-openpress-document-info-dialog"
          backdropClassName={WORKBENCH_THEME_TRANSPARENT_BACKDROP_CLASS}
          className="op-workspace-theme-dialog op-workspace-document-info-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            infoButtonRef.current?.focus();
          }}
          onClose={() => setDialogOpen(false)}
        >
          <WorkbenchDialogBody className="max-h-[min(68vh,680px)] gap-4 overflow-y-auto overscroll-contain pb-6 [scrollbar-color:rgb(255_255_255_/_0.18)_transparent] [scrollbar-width:thin]">
            <WorkbenchDocumentStats pages={pages} />
            <section aria-label="Template style" className="grid gap-1 border-t border-[var(--op-workspace-border-muted)] pt-4">
              <h3 className={WORKSPACE_ACTION_LABEL_CLASS}>Template style</h3>
              <strong className="text-[13px] font-semibold text-[var(--op-workspace-text)]">{styleLabel}</strong>
            </section>
            <section aria-label="Theme colors" className="grid gap-2 border-t border-[var(--op-workspace-border-muted)] pt-4">
              <h3 className={WORKSPACE_ACTION_LABEL_CLASS}>Colors</h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
                {colorTokens.map((swatch) => (
                  <div key={swatch.key} className="grid min-w-0 gap-1">
                    <span className="block h-10 rounded border border-white/[0.12]" style={{ background: swatch.value }} aria-hidden="true" />
                    <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold text-[var(--op-workspace-text-soft)]">
                      {swatch.label}
                    </span>
                    <code className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[var(--op-workspace-text-muted)]">
                      {swatch.key} · {swatch.value}
                    </code>
                  </div>
                ))}
              </div>
            </section>

          <section aria-label="Theme typography" className="grid gap-3 border-t border-[var(--op-workspace-border-muted)] pt-4">
            <div className="flex min-w-0 items-end justify-between gap-3">
              <h3 className={WORKSPACE_ACTION_LABEL_CLASS}>Typography</h3>
              {typographyTokens.length > 0 ? (
                <span className="font-mono text-[10px] leading-none text-[var(--op-workspace-text-muted)]">
                  {typographyTokens.length} styles
                </span>
              ) : null}
            </div>
            {typographyTokens.length > 0 ? (
              <div
                className="mt-2 flex flex-col divide-y divide-[var(--op-workspace-border-muted)] border-y border-[var(--op-workspace-border-muted)]"
                data-openpress-theme-typography-grid
              >
                {[...typographyTokens].sort((a, b) => parseComparableSize(b.size) - parseComparableSize(a.size)).map((typeStyle) => (
                  <article
                    key={typeStyle.key}
                    className="flex min-w-0 flex-col items-start gap-2 py-4 sm:flex-row sm:items-center sm:gap-6"
                    data-openpress-theme-type-specimen
                  >
                    <header className="flex w-full shrink-0 flex-col gap-1.5 sm:w-[180px]">
                      <div className="flex items-center gap-2">
                        <strong className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-[var(--op-workspace-text)]">
                          {typeStyle.label}
                        </strong>
                      </div>
                      <div
                        className="flex flex-wrap gap-1.5"
                        data-openpress-theme-type-meta
                      >
                        <span className="font-mono text-[10px] leading-none text-[var(--op-workspace-text-soft)]">
                          {typeStyle.size}
                        </span>
                        <span className="font-mono text-[10px] leading-none text-[var(--op-workspace-text-soft)]">
                          LH {typeStyle.lineHeight}
                        </span>
                        {typeStyle.weight ? (
                          <span className="font-mono text-[10px] leading-none text-[var(--op-workspace-text-soft)]">
                            W {typeStyle.weight}
                          </span>
                        ) : null}
                      </div>
                    </header>
                    <div className="min-w-0 flex-1">
                      <p
                        className="m-0 truncate"
                        style={{
                          ...themeTypographyPreviewStyle(typeStyle, previewInk, previewBg),
                          color: "var(--op-workspace-text)",
                        }}
                      >
                        {typeStyle.sample}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <>
                <p className="m-0 text-[34px] font-semibold leading-tight text-[var(--op-workspace-text)]" style={{ fontFamily: theme?.fontFamily }}>
                  Aa Theme
                </p>
                <code className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-relaxed text-[var(--op-workspace-text-muted)]">
                  {fontLabel}
                </code>
              </>
            )}
          </section>

          <section aria-label="Page geometry" className="grid gap-2 border-t border-[var(--op-workspace-border-muted)] pt-4">
            <h3 className={WORKSPACE_ACTION_LABEL_CLASS}>Geometry</h3>
            <dl className="m-0 grid gap-1">
              {geometry.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[82px_minmax(0,1fr)] items-center gap-2">
                  <dt className="text-[10px] font-semibold text-[var(--op-workspace-text-muted)]">{label}</dt>
                  <dd className="m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[var(--op-workspace-text-soft)]">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </WorkbenchDialogBody>
      </WorkbenchDialog>
    ) : null}
    </>
  );
}

type ResolvedThemeColor = {
  key: string;
  label: string;
  value: string;
};

type ResolvedThemeTypography = {
  key: string;
  label: string;
  fontFamily?: string;
  size: string;
  lineHeight: string;
  weight?: string;
  tracking?: string;
  color?: string;
  transform?: string;
  sample: string;
};

type ResolvedThemeTokens = {
  colors: ResolvedThemeColor[];
  typography: ResolvedThemeTypography[];
  fontLabel: string;
};

const OP_THEME_COLOR_KEYS = [
  "bg",
  "surface",
  "surfaceMuted",
  "paper",
  "ink",
  "muted",
  "line",
  "accent",
  "link",
  "quote",
  "success",
  "warning",
  "danger",
  "marker",
  "annotation",
];

const OP_SLIDE_COLOR_KEYS = [
  "bg",
  "surface",
  "surfaceMuted",
  "ink",
  "muted",
  "line",
  "accent",
  "quote",
  "success",
  "warning",
  "danger",
  "marker",
  "accent-muted",
];

const OP_THEME_TYPOGRAPHY_KEYS = [
  "display",
  "title",
  "heading",
  "subheading",
  "section",
  "lead",
  "body",
  "bodyStrong",
  "caption",
  "footnote",
  "pageNumber",
  "eyebrow",
  "marker",
  "quote",
  "mono",
];

const OP_SLIDE_TYPOGRAPHY_KEYS = [
  "display",
  "label",
  "kicker",
  "statement",
  "title",
  "section",
  "agenda-thesis",
  "agenda-item",
  "body",
  "agenda",
  "quote-mark",
  "quote",
  "quote-small",
  "list",
  "metric",
  "metric-label",
  "timeline-body",
  "timeline-bar",
  "checklist",
  "lead",
  "caption",
  "source",
  "number",
];

const OP_SLIDE_SERIF_TYPE_KEYS = new Set([
  "display",
  "statement",
  "title",
  "section",
  "agenda-thesis",
  "quote",
  "quote-small",
  "metric",
]);

function useResolvedThemeTokens(theme: ReaderDocument["theme"], refreshKey: unknown): ResolvedThemeTokens {
  const staticTokens = useMemo(() => themeTokensFromDocument(theme), [theme]);
  const [resolvedTokens, setResolvedTokens] = useState<ResolvedThemeTokens>(staticTokens);

  useEffect(() => {
    setResolvedTokens(mergeThemeTokens(staticTokens, themeTokensFromCss()));
  }, [refreshKey, staticTokens]);

  return resolvedTokens;
}

function themeTokensFromDocument(theme: ReaderDocument["theme"]): ResolvedThemeTokens {
  const colors = Object.entries(theme?.colors ?? {})
    .map(([key, color]): ResolvedThemeColor | null => {
      if (!color?.value) return null;
      return {
        key: color.key ?? key,
        label: color.label ?? readableTokenLabel(key),
        value: color.value,
      };
    })
    .filter((color): color is ResolvedThemeColor => Boolean(color));
  if (theme?.accentColor) colors.push({ key: "accent", label: "Accent", value: theme.accentColor });
  if (theme?.textColor) colors.push({ key: "ink", label: "Ink", value: theme.textColor });

  const typography = Object.entries(theme?.typography ?? {})
    .map(([key, typeStyle]): ResolvedThemeTypography | null => {
      if (!typeStyle?.size) return null;
      return {
        key: typeStyle.key ?? key,
        label: typeStyle.label ?? readableTokenLabel(key),
        fontFamily: typeStyle.fontFamily ?? resolveThemeFont(theme, typeStyle.font),
        size: String(typeStyle.size),
        lineHeight: typeStyle.lineHeight === undefined ? "1.2" : String(typeStyle.lineHeight),
        weight: typeStyle.weight === undefined ? undefined : String(typeStyle.weight),
        tracking: typeStyle.tracking === undefined ? undefined : String(typeStyle.tracking),
        color: typeStyle.color,
        transform: typeStyle.transform,
        sample: typeStyle.sample ?? typographySampleForKey(key),
      };
    })
    .filter((typeStyle): typeStyle is ResolvedThemeTypography => Boolean(typeStyle));

  const fontLabel = theme?.fontFamily
    ?? typography.find((typeStyle) => typeStyle.key === "body")?.fontFamily
    ?? typography[0]?.fontFamily
    ?? "Inherited font";

  return {
    colors: uniqueThemeColors(colors),
    typography: uniqueThemeTypography(typography),
    fontLabel,
  };
}

function themeTokensFromCss(): ResolvedThemeTokens {
  if (typeof document === "undefined") {
    return { colors: [], typography: [], fontLabel: "Inherited font" };
  }

  const sourceElements: Element[] = [document.documentElement];
  const workspaceElement = document.querySelector<HTMLElement>(".op-workspace");
  const readerElement = document.querySelector<HTMLElement>(".openpress-reader-app");
  if (workspaceElement) sourceElements.push(workspaceElement);
  if (readerElement) sourceElements.push(readerElement);
  const styleSources = sourceElements.map((element) => window.getComputedStyle(element));

  const colors: ResolvedThemeColor[] = [];
  for (const key of OP_THEME_COLOR_KEYS) {
    const value = readCssVar(styleSources, `--op-theme-color-${key}`);
    if (value) colors.push({ key, label: readableTokenLabel(key), value });
  }
  for (const key of OP_SLIDE_COLOR_KEYS) {
    const value = readCssVar(styleSources, `--op-slide-color-${key}`);
    if (value) colors.push({ key, label: readableTokenLabel(key), value });
  }

  const typography: ResolvedThemeTypography[] = [];
  for (const key of OP_THEME_TYPOGRAPHY_KEYS) {
    const size = readCssVar(styleSources, `--op-theme-type-${key}-font-size`);
    if (!size) continue;
    typography.push({
      key,
      label: readableTokenLabel(key),
      fontFamily: readCssVar(styleSources, `--op-theme-type-${key}-font-family`),
      size,
      lineHeight: readCssVar(styleSources, `--op-theme-type-${key}-line-height`) ?? "1.2",
      weight: readCssVar(styleSources, `--op-theme-type-${key}-font-weight`),
      tracking: readCssVar(styleSources, `--op-theme-type-${key}-letter-spacing`),
      color: readCssVar(styleSources, `--op-theme-type-${key}-color`),
      sample: typographySampleForKey(key),
    });
  }
  for (const key of OP_SLIDE_TYPOGRAPHY_KEYS) {
    const size = readCssVar(styleSources, `--op-slide-text-${key}-size`);
    if (!size) continue;
    const fontFamily = OP_SLIDE_SERIF_TYPE_KEYS.has(key)
      ? readCssVar(styleSources, "--op-slide-font-serif")
      : readCssVar(styleSources, "--op-slide-font-sans");
    typography.push({
      key,
      label: readableTokenLabel(key),
      fontFamily,
      size,
      lineHeight: readCssVar(styleSources, `--op-slide-text-${key}-line-height`) ?? "1.2",
      weight: readCssVar(styleSources, `--op-slide-text-${key}-weight`),
      tracking: readCssVar(styleSources, `--op-slide-text-${key}-tracking`),
      color: readCssVar(styleSources, "--op-slide-color-ink"),
      sample: typographySampleForKey(key),
    });
  }

  const fontLabel = readCssVar(styleSources, "--op-theme-type-body-font-family")
    ?? readCssVar(styleSources, "--op-slide-font-sans")
    ?? "Inherited font";

  return {
    colors: uniqueThemeColors(colors),
    typography: uniqueThemeTypography(typography),
    fontLabel,
  };
}

function mergeThemeTokens(primary: ResolvedThemeTokens, secondary: ResolvedThemeTokens): ResolvedThemeTokens {
  const colors = uniqueThemeColors([...primary.colors, ...secondary.colors]);
  const typography = uniqueThemeTypography([...primary.typography, ...secondary.typography]);
  return {
    colors,
    typography,
    fontLabel: primary.fontLabel !== "Inherited font" ? primary.fontLabel : secondary.fontLabel,
  };
}

function uniqueThemeColors(colors: ResolvedThemeColor[]) {
  const out = new Map<string, ResolvedThemeColor>();
  for (const color of colors) {
    if (!color.value || out.has(color.key)) continue;
    out.set(color.key, color);
  }
  return [...out.values()];
}

function uniqueThemeTypography(typography: ResolvedThemeTypography[]) {
  const out = new Map<string, ResolvedThemeTypography>();
  for (const typeStyle of typography) {
    if (!typeStyle.size || out.has(typeStyle.key)) continue;
    out.set(typeStyle.key, typeStyle);
  }
  return [...out.values()];
}

function readCssVar(styleSources: CSSStyleDeclaration[], name: string) {
  for (const styles of styleSources) {
    const value = styles.getPropertyValue(name).trim();
    if (value) return value;
  }
  return undefined;
}

function themeColorValue(colors: ResolvedThemeColor[], keys: string[], fallback: string) {
  for (const key of keys) {
    const color = colors.find((entry) => entry.key.toLowerCase() === key.toLowerCase());
    if (color?.value) return color.value;
  }
  return fallback;
}

function resolveThemeFont(theme: ReaderDocument["theme"], fontKey: string | undefined) {
  if (!fontKey) return theme?.fontFamily;
  return theme?.fonts?.[fontKey] ?? fontKey;
}

function themeTypographyPreviewStyle(typeStyle: ResolvedThemeTypography, fallbackColor: string, backgroundColor: string): CSSProperties {
  return {
    fontFamily: typeStyle.fontFamily,
    fontSize: previewTypographySize(typeStyle.size),
    lineHeight: typeStyle.lineHeight,
    fontWeight: typeStyle.weight,
    letterSpacing: typeStyle.tracking,
    color: readablePreviewColor(typeStyle.color, fallbackColor, backgroundColor),
    textTransform: typeStyle.transform as CSSProperties["textTransform"],
  };
}

function readablePreviewColor(preferredColor: string | undefined, fallbackColor: string, backgroundColor: string) {
  const bg = parseCssRgb(backgroundColor);
  if (!bg) return preferredColor ?? fallbackColor;
  const candidates = [preferredColor, fallbackColor, "#161616", "#ffffff"].filter((color): color is string => Boolean(color));
  const preferred = preferredColor ? parseCssRgb(preferredColor) : null;
  if (preferred && contrastRatio(preferred, bg) >= 3) return preferredColor;
  for (const candidate of candidates) {
    const rgb = parseCssRgb(candidate);
    if (rgb && contrastRatio(rgb, bg) >= 3) return candidate;
  }
  const dark = { r: 22, g: 22, b: 22 };
  const light = { r: 255, g: 255, b: 255 };
  return contrastRatio(dark, bg) >= contrastRatio(light, bg) ? "#161616" : "#ffffff";
}

function parseCssRgb(value: string | undefined) {
  if (!value) return null;
  const input = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input);
  if (hex) {
    const raw = hex[1];
    const full = raw.length === 3 ? raw.split("").map((part) => part + part).join("") : raw;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    };
  }
  const rgb = /^rgba?\((.+)\)$/i.exec(input);
  if (!rgb) return null;
  const channels = rgb[1].replace(/,/g, " ").split(/[\s/]+/).filter(Boolean).slice(0, 3);
  if (channels.length < 3) return null;
  const parsed = channels.map(parseCssChannel);
  if (parsed.some((channel) => !Number.isFinite(channel))) return null;
  return { r: parsed[0], g: parsed[1], b: parsed[2] };
}

function parseCssChannel(value: string) {
  if (value.endsWith("%")) return Math.round(Number.parseFloat(value) * 2.55);
  return Number.parseFloat(value);
}

function contrastRatio(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  const light = relativeLuminance(a);
  const dark = relativeLuminance(b);
  const max = Math.max(light, dark);
  const min = Math.min(light, dark);
  return (max + 0.05) / (min + 0.05);
}

function relativeLuminance(color: { r: number; g: number; b: number }) {
  const [r, g, b] = [color.r, color.g, color.b].map((channel) => {
    const value = Math.max(0, Math.min(255, channel)) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function previewTypographySize(size: string) {
  const px = /^(-?\d+(?:\.\d+)?)px$/.exec(size.trim());
  if (!px) return size.startsWith("var(") ? `min(${size}, 34px)` : size;
  const value = Number(px[1]);
  if (!Number.isFinite(value)) return size;
  return `${Math.max(13, Math.min(value, 34))}px`;
}

function parseComparableSize(size: string): number {
  if (!size) return 0;
  const match = size.match(/clamp\([^,]+,\s*[^,]+,\s*([^)]+)\)/);
  const valStr = match ? match[1] : size;
  const numMatch = valStr.match(/[\d.]+/);
  if (!numMatch) return 0;
  let num = Number.parseFloat(numMatch[0]);
  if (valStr.includes("rem") || valStr.includes("em")) num *= 16;
  return num;
}

function readableTokenLabel(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function typographySampleForKey(key: string) {
  if (key.includes("quote")) return "A quote keeps the point in focus.";
  if (key.includes("metric") || key.includes("number")) return "+330K";
  if (key.includes("caption") || key.includes("source") || key.includes("footnote")) return "Caption and source text";
  if (key.includes("body") || key.includes("lead") || key.includes("list")) return "Body copy stays readable at slide scale.";
  if (key.includes("label") || key.includes("kicker") || key.includes("eyebrow")) return "SECTION NAME";
  return "A line is length without breadth.";
}

function normalizePressType(value: ReaderDocument["meta"]["type"]) {
  return value === "slides" ? "slides" : "pages";
}
