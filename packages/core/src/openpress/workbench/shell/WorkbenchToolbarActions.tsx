import { FileText, Focus, Home, PanelsLeftRight, Presentation } from "lucide-react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { WorkspaceManifestPress } from "../../document-model";
import { Button } from "@/openpress/ui/button";
import { cn } from "@/openpress/core/cn";
import {
  TOOLBAR_ACTION_CLASS,
  TOOLBAR_ACTION_LABEL_CLASS,
  TOOLBAR_GROUP_CLASS,
  TOOLBAR_RIGHT_GROUP_CLASS,
} from "../toolbarClasses";

const PRESS_TABS_CLASS = [
  "op-workspace-press-tabs inline-flex h-full min-w-0 max-w-[min(62vw,760px)] items-stretch overflow-x-auto",
  "rounded-none border-l border-r border-[var(--op-workspace-border-muted)] bg-[var(--op-workspace-surface-muted)] p-0",
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
].join(" ");
const PRESS_TAB_CLASS = [
  "op-workspace-press-tab relative inline-flex h-full min-w-[136px] max-w-[220px] shrink-0 cursor-pointer items-center justify-center",
  "overflow-hidden rounded-none border-0 border-r border-[var(--op-workspace-border-muted)] bg-[var(--op-workspace-surface)] px-4 text-[11px]",
  "font-medium leading-none text-[var(--op-workspace-text-muted)] transition-[background,color] duration-150 last:border-r-0",
  "hover:bg-[var(--op-workspace-surface-hover)] hover:text-[var(--op-workspace-text-soft)]",
].join(" ");
const PRESS_TAB_ACTIVE_CLASS = [
  "!bg-[var(--op-workspace-tab-active-bg)] !text-[var(--op-workspace-text)]",
  "[&_.op-workspace-press-tab-icon]:!text-[var(--op-workspace-accent)] [&_.op-workspace-press-tab-icon]:!opacity-100",
].join(" ");
const PRESS_TAB_ICON_ONLY_CLASS = "!w-[44px] !min-w-[44px] !max-w-[44px] !px-0";
const PRESS_TAB_LABEL_CLASS = "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap";
const PRESS_TAB_LABEL_ICON_ONLY_CLASS = "sr-only";
const PRESS_TAB_ICON_CLASS = "op-workspace-press-tab-icon h-[13px] w-[13px] shrink-0 text-current opacity-80";
const PRESS_TAB_CONTENT_CLASS = "relative z-[1] inline-flex min-w-0 items-center justify-center gap-2";
const PRESS_TAB_ACTIVE_BG_CLASS = "absolute inset-0 bg-[var(--op-workspace-tab-active-bg)]";
const ACTIVE_PRESS_CLASS = [
  "op-workspace-active-press-tab inline-flex h-full min-w-[136px] max-w-[240px] items-center justify-center overflow-hidden",
  "gap-2 border-x border-[var(--op-workspace-border-muted)] bg-[var(--op-workspace-tab-active-bg)] px-4 text-[11px] font-medium leading-none text-[var(--op-workspace-text)]",
  "[&_.op-workspace-press-tab-icon]:text-[var(--op-workspace-accent)] [&_.op-workspace-press-tab-icon]:opacity-100",
].join(" ");
const HIDE_UI_TOGGLE_CLASS = `${TOOLBAR_ACTION_CLASS} op-workspace-hide-ui-toggle`;
const PRESS_TAB_MOTION_TRANSITION = {
  type: "spring",
  stiffness: 500,
  damping: 46,
  mass: 0.7,
} as const;

export function WorkbenchToolbarActions({
  onBackToWorkspace,
  workspacePresses,
  activePressSlug,
  onSelectWorkspacePress,
  activePressTitle,
  activePressType,
  rightActions,
  hideUiMode = false,
  onToggleHideUiMode,
}: {
  onBackToWorkspace?: () => void;
  workspacePresses?: WorkspaceManifestPress[];
  activePressSlug?: string | null;
  onSelectWorkspacePress?: (press: WorkspaceManifestPress) => void;
  activePressTitle: string;
  activePressType?: WorkspaceManifestPress["type"];
  rightActions?: ReactNode;
  hideUiMode?: boolean;
  onToggleHideUiMode?: () => void;
}) {
  const activePress = workspacePresses?.find((press) => press.slug === activePressSlug);
  const activeTitle = activePress?.title || activePressTitle || activePressSlug || "OpenPress";
  const activeType = activePress?.type ?? activePressType;
  const hideUiToggle = onToggleHideUiMode ? (
    <HideUiToggle hideUiMode={hideUiMode} onToggle={onToggleHideUiMode} />
  ) : null;

  return (
    <>
      <div className={TOOLBAR_GROUP_CLASS} aria-label="Workspace navigation">
        {onBackToWorkspace ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={`${TOOLBAR_ACTION_CLASS} op-workspace-toolbar-action-back`}
            data-openpress-back-to-workspace
            onClick={onBackToWorkspace}
            title="回到工作台"
            aria-label="回到工作台"
          >
            <Home aria-hidden="true" />
            <span className={TOOLBAR_ACTION_LABEL_CLASS}>工作台</span>
          </Button>
        ) : null}
        {workspacePresses && workspacePresses.length > 1 ? (
          <div className={PRESS_TABS_CLASS} role="tablist" aria-label="Presses">
            {workspacePresses.map((press) => {
              const active = press.slug === activePressSlug;
              const iconOnly = hideUiMode && !active;
              return (
                <Button
                  key={press.slug}
                  type="button"
                  variant="ghost"
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    PRESS_TAB_CLASS,
                    iconOnly && PRESS_TAB_ICON_ONLY_CLASS,
                    active && PRESS_TAB_ACTIVE_CLASS,
                  )}
                  onClick={() => onSelectWorkspacePress?.(press)}
                  title={press.title}
                >
                  {active ? (
                    <motion.span
                      layoutId="openpress-active-press-tab-bg"
                      className={PRESS_TAB_ACTIVE_BG_CLASS}
                      transition={PRESS_TAB_MOTION_TRANSITION}
                      aria-hidden="true"
                    />
                  ) : null}
                  <motion.span layout className={PRESS_TAB_CONTENT_CLASS} transition={PRESS_TAB_MOTION_TRANSITION}>
                    <PressTypeIcon type={press.type} />
                    <span className={cn(PRESS_TAB_LABEL_CLASS, iconOnly && PRESS_TAB_LABEL_ICON_ONLY_CLASS)}>
                      {press.title || press.slug}
                    </span>
                  </motion.span>
                </Button>
              );
            })}
          </div>
        ) : (
          <span className={ACTIVE_PRESS_CLASS} title={activeTitle}>
            {activeType ? <PressTypeIcon type={activeType} /> : null}
            <span className={PRESS_TAB_LABEL_CLASS}>{activeTitle}</span>
          </span>
        )}
      </div>
      {rightActions || hideUiToggle ? (
        <div className={TOOLBAR_RIGHT_GROUP_CLASS} aria-label="Workspace actions">
          {rightActions}
          {hideUiToggle}
        </div>
      ) : null}
    </>
  );
}

function HideUiToggle({
  hideUiMode,
  onToggle,
}: {
  hideUiMode: boolean;
  onToggle: () => void;
}) {
  const Icon = hideUiMode ? PanelsLeftRight : Focus;
  const label = hideUiMode ? "Show UI" : "Hide UI";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={HIDE_UI_TOGGLE_CLASS}
      data-openpress-hide-ui-toggle
      data-openpress-toolbar-expanded="false"
      data-openpress-toolbar-active={hideUiMode ? "true" : "false"}
      aria-pressed={hideUiMode}
      title={label}
      aria-label={label}
      onClick={onToggle}
    >
      <Icon aria-hidden="true" />
      <span className={TOOLBAR_ACTION_LABEL_CLASS}>{label}</span>
    </Button>
  );
}

function PressTypeIcon({ type }: { type: WorkspaceManifestPress["type"] }) {
  const Icon = type === "slides" ? Presentation : FileText;
  return <Icon className={PRESS_TAB_ICON_CLASS} aria-hidden="true" />;
}
