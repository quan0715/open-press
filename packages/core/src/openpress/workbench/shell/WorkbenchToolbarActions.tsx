import { Home, MousePointer2, Play, Ruler } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { DeploymentInfo, HtmlPageBlock, SourceBlock, Theme } from "../../document-model";
import type { PageLayoutMode, PageViewportScaleMode } from "../../reader";
import {
  DeploymentControl,
  ExportControl,
  PageZoomControl,
  ScreenshotControl,
  SearchControl,
} from "../actions";
import type { DeployStatus, InspectorCommentStatus, PdfActionStatus } from "../workbenchTypes";
import type { PageGeometrySpec } from "../workbenchFormatters";
import { useEditStatus, type WorkbenchEditStatus } from "../WorkbenchEditStatusContext";
import {
  EDIT_STATUS_SPINNER_CLASS,
  EDIT_STATUS_TOOLBAR_CLASS,
  INSPECTOR_STATUS_TOOLBAR_CLASS,
  PAGE_GEOMETRY_CLASS,
  PAGE_GEOMETRY_DIMENSIONS_CLASS,
  PAGE_GEOMETRY_LABEL_CLASS,
  TOOLBAR_ACTION_CLASS,
  TOOLBAR_ACTION_LABEL_CLASS,
  TOOLBAR_ACTION_PRIMARY_CLASS,
  TOOLBAR_GROUP_CLASS,
  TOOLBAR_PAGE_GROUP_CLASS,
  TOOLBAR_RIGHT_GROUP_CLASS,
  TOOLBAR_SEPARATOR_CLASS,
} from "../toolbarClasses";

export function WorkbenchToolbarActions({
  pages,
  currentPageIndex,
  pressTitle,
  theme,
  workspaceMode,
  sourceBlocksByPath,
  onSelectPage,
  onBackToWorkspace,
  isSlidePress,
  onOpenPresentation,
  pageGeometry,
  scaleMode,
  scaleLabel,
  pageLayoutMode,
  onScaleModeChange,
  onPageLayoutModeChange,
  inspectorMode,
  inspectorToolbarExpanded,
  inspectorSelectionLabel,
  onInspectorModeChange,
  inspectorCommentStatus,
  inspectorCommentStatusMessage,
  deploymentInfo,
  deploymentStatus,
  localDeployEnabled,
  onDeploy,
  onExportPdf,
  pdfDisabled,
  pdfLabel,
  pdfStatusMessage,
  pdfActionStatus,
}: {
  pages: HtmlPageBlock[];
  currentPageIndex: number;
  pressTitle: string;
  theme?: Theme;
  workspaceMode: boolean;
  sourceBlocksByPath: Record<string, SourceBlock[]>;
  onSelectPage: (pageIndex: number, options?: { behavior?: ScrollBehavior }) => void;
  onBackToWorkspace?: () => void;
  isSlidePress: boolean;
  onOpenPresentation?: (pageIndex: number) => void;
  pageGeometry: PageGeometrySpec;
  scaleMode: PageViewportScaleMode;
  scaleLabel: string;
  pageLayoutMode: PageLayoutMode;
  onScaleModeChange: Dispatch<SetStateAction<PageViewportScaleMode>>;
  onPageLayoutModeChange: Dispatch<SetStateAction<PageLayoutMode>>;
  inspectorMode: boolean;
  inspectorToolbarExpanded: boolean;
  inspectorSelectionLabel: string;
  onInspectorModeChange: (enabled: boolean) => void;
  inspectorCommentStatus: InspectorCommentStatus;
  inspectorCommentStatusMessage: string;
  deploymentInfo: DeploymentInfo;
  deploymentStatus: DeployStatus;
  localDeployEnabled: boolean;
  onDeploy: () => Promise<void>;
  onExportPdf: (pageIndexes: number[]) => void;
  pdfDisabled: boolean;
  pdfLabel: string;
  pdfStatusMessage: string | null;
  pdfActionStatus: PdfActionStatus;
}) {
  const { status: editStatus } = useEditStatus();
  const editStatusMessage = formatEditStatus(editStatus);

  return (
    <>
      {onBackToWorkspace ? (
        <div className={TOOLBAR_GROUP_CLASS} aria-label="工作台導覽">
          <button
            type="button"
            className={`${TOOLBAR_ACTION_CLASS} openpress-workbench-toolbar-action--back`}
            data-openpress-back-to-workspace
            onClick={onBackToWorkspace}
            title="回到工作台"
            aria-label="回到工作台"
          >
            <Home aria-hidden="true" />
            <span className={TOOLBAR_ACTION_LABEL_CLASS}>工作台</span>
          </button>
        </div>
      ) : null}

      {/* Center group: page geometry / zoom + workspace tools */}
      <div className={TOOLBAR_PAGE_GROUP_CLASS} aria-label="頁面規格與工具">
        <button
          type="button"
          className={PAGE_GEOMETRY_CLASS}
          data-openpress-page-geometry
          title={pageGeometry.title}
          aria-label={`頁面規格 ${pageGeometry.title}`}
        >
          <Ruler aria-hidden="true" />
          <span className={PAGE_GEOMETRY_LABEL_CLASS}>{pageGeometry.label}</span>
          <span className={PAGE_GEOMETRY_DIMENSIONS_CLASS}>{pageGeometry.dimensions}</span>
        </button>
        <PageZoomControl
          scaleMode={scaleMode}
          scaleLabel={scaleLabel}
          pageLayoutMode={pageLayoutMode}
          onScaleModeChange={onScaleModeChange}
          onPageLayoutModeChange={onPageLayoutModeChange}
        />
        {workspaceMode ? (
          <span className={TOOLBAR_SEPARATOR_CLASS} aria-hidden="true" />
        ) : null}
        {workspaceMode ? (
          <SearchControl
            pages={pages}
            sourceBlocksByPath={sourceBlocksByPath}
            onSelectPage={onSelectPage}
          />
        ) : null}
        {workspaceMode ? (
          <button
            type="button"
            className={TOOLBAR_ACTION_CLASS}
            data-openpress-inspector-toggle
            data-openpress-inspector-active={inspectorMode ? "true" : "false"}
            data-openpress-toolbar-expanded={inspectorToolbarExpanded ? "true" : "false"}
            data-openpress-toolbar-active={inspectorToolbarExpanded ? "true" : "false"}
            onClick={() => onInspectorModeChange(!inspectorMode)}
            aria-pressed={inspectorMode}
            title={inspectorMode ? "關閉註解" : "開啟註解"}
            aria-label={inspectorMode ? "關閉註解" : "開啟註解"}
          >
            <MousePointer2 aria-hidden="true" />
            <span className={TOOLBAR_ACTION_LABEL_CLASS}>{inspectorMode ? "註解中" : "註解"}</span>
            <span className="openpress-dev-inspector-status">{inspectorSelectionLabel}</span>
          </button>
        ) : null}
        {workspaceMode && editStatusMessage ? (
          <span
            className={EDIT_STATUS_TOOLBAR_CLASS}
            data-openpress-edit-status={editStatus}
            role="status"
            aria-live="polite"
          >
            {editStatus === "saving" ? <span className={EDIT_STATUS_SPINNER_CLASS} aria-hidden="true" /> : null}
            <span>{editStatusMessage}</span>
          </span>
        ) : null}
        {workspaceMode && inspectorMode ? (
          <span
            className={INSPECTOR_STATUS_TOOLBAR_CLASS}
            role="status"
            aria-live="polite"
            data-openpress-inspector-comment-status={inspectorCommentStatus}
          >
            {inspectorCommentStatusMessage}
          </span>
        ) : null}
      </div>

      {/* Right group: screenshot + export + deploy + present */}
      <div className={TOOLBAR_RIGHT_GROUP_CLASS} aria-label="匯出與發布">
        <ScreenshotControl currentPageIndex={currentPageIndex} />
        <ExportControl
          pages={pages}
          currentPageIndex={currentPageIndex}
          pressTitle={pressTitle}
          theme={theme}
          onExportPdf={onExportPdf}
          pdfDisabled={pdfDisabled}
          pdfLabel={pdfLabel}
          pdfStatusMessage={pdfStatusMessage}
          pdfActionStatus={pdfActionStatus}
        />
        {localDeployEnabled ? (
          <DeploymentControl
            info={deploymentInfo}
            status={deploymentStatus}
            onDeploy={onDeploy}
          />
        ) : null}
        {isSlidePress && onOpenPresentation ? (
          <button
            type="button"
            className={TOOLBAR_ACTION_PRIMARY_CLASS}
            data-openpress-slide-present
            aria-pressed="false"
            title="進入放映模式"
            aria-label="進入放映模式"
            onClick={() => onOpenPresentation(currentPageIndex)}
          >
            <Play aria-hidden="true" />
            <span className={TOOLBAR_ACTION_LABEL_CLASS}>放映</span>
          </button>
        ) : null}
      </div>
    </>
  );
}

function formatEditStatus(status: WorkbenchEditStatus): string {
  if (status === "saving") return "儲存中";
  if (status === "saved") return "已儲存";
  return "";
}
