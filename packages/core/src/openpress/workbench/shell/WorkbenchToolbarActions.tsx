import { Home, MousePointer2, Play, Ruler } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { DeploymentInfo, HtmlPageBlock, SourceBlock, Theme } from "../../document-model";
import type { PageLayoutMode, PageViewportScaleMode } from "../../reader";
import {
  DeploymentControl,
  ExportControl,
  PageZoomControl,
  SearchControl,
} from "../actions";
import type { DeployStatus, InspectorCommentStatus, PdfActionStatus } from "../workbenchTypes";
import type { PageGeometrySpec } from "../workbenchFormatters";
import type { InlineDocumentEditStatus } from "../document";

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
  inlineEditStatus,
  editStatusMessage,
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
  inlineEditStatus: InlineDocumentEditStatus;
  editStatusMessage: string;
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
  onExportPdf: () => void;
  pdfDisabled: boolean;
  pdfLabel: string;
  pdfStatusMessage: string | null;
  pdfActionStatus: PdfActionStatus;
}) {
  return (
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
      <div className="openpress-workbench-toolbar__group" aria-label="匯出">
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
            onClick={() => onOpenPresentation(currentPageIndex)}
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
          scaleMode={scaleMode}
          scaleLabel={scaleLabel}
          pageLayoutMode={pageLayoutMode}
          onScaleModeChange={onScaleModeChange}
          onPageLayoutModeChange={onPageLayoutModeChange}
        />
      </div>
      <div className="openpress-workbench-toolbar__group openpress-workbench-toolbar__group--right" aria-label="工作台狀態與發布">
        {workspaceMode ? (
          <SearchControl
            sourceBlocksByPath={sourceBlocksByPath}
            onSelectPage={onSelectPage}
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
            data-openpress-inspector-active={inspectorMode ? "true" : "false"}
            data-openpress-toolbar-expanded={inspectorToolbarExpanded ? "true" : "false"}
            data-openpress-toolbar-active={inspectorToolbarExpanded ? "true" : "false"}
            onClick={() => onInspectorModeChange(!inspectorMode)}
            aria-pressed={inspectorMode}
            title={inspectorMode ? "關閉註解" : "開啟註解"}
            aria-label={inspectorMode ? "關閉註解" : "開啟註解"}
          >
            <MousePointer2 aria-hidden="true" />
            <span className="openpress-workbench-toolbar-action__label">{inspectorMode ? "註解中" : "註解"}</span>
            <span className="openpress-dev-inspector-status">{inspectorSelectionLabel}</span>
          </button>
        ) : null}
        {workspaceMode && inspectorMode ? (
          <span
            className="openpress-dev-inspector-status"
            role="status"
            aria-live="polite"
            data-openpress-inspector-comment-status={inspectorCommentStatus}
          >
            {inspectorCommentStatusMessage}
          </span>
        ) : null}
        {localDeployEnabled ? (
          <DeploymentControl
            info={deploymentInfo}
            status={deploymentStatus}
            onDeploy={onDeploy}
          />
        ) : null}
      </div>
    </>
  );
}
