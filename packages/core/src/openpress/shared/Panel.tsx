import { createContext, useContext, type ComponentPropsWithoutRef } from "react";
import { cn } from "../core/cn";
import { Button } from "@/openpress/ui/button";

type PanelProps = ComponentPropsWithoutRef<"section">;
type PanelHeaderProps = ComponentPropsWithoutRef<"header">;
type PanelDivProps = ComponentPropsWithoutRef<"div">;
type PanelTextProps = ComponentPropsWithoutRef<"p">;
type PanelTitleProps = ComponentPropsWithoutRef<"h2">;
type PanelSectionTitleProps = ComponentPropsWithoutRef<"h3">;
type PanelButtonProps = ComponentPropsWithoutRef<"button">;

type PanelContextValue = {
  compact: boolean;
  insidePanel: boolean;
};

const PanelContext = createContext<PanelContextValue>({ compact: false, insidePanel: false });

const PANEL_ROOT_CLASS = "openpress-panel min-w-0 min-h-0 text-[var(--op-workspace-text)]";
const PANEL_HEADER_CLASS = [
  "openpress-panel-header grid min-w-0 grid-cols-[minmax(0,1fr)_auto] border-b border-[var(--op-workspace-border-muted)] pb-2.5",
].join(" ");
const PANEL_HEADING_STACK_CLASS = "openpress-panel-heading-stack grid min-w-0 gap-[3px]";
const PANEL_KICKER_CLASS = [
  "hidden",
].join(" ");
const PANEL_TITLE_CLASS = [
  "openpress-panel-title !m-0 min-w-0 overflow-hidden text-ellipsis !whitespace-nowrap break-after-auto",
  "[font-family:inherit] !text-[13px] !font-medium !leading-[1.35] !tracking-normal !text-[var(--op-workspace-text)]",
  "[&::before]:hidden [&::before]:content-none",
].join(" ");
const PANEL_DESCRIPTION_CLASS = [
  "min-w-0 !m-0 !text-[11px] !leading-[1.4] !text-[var(--op-workspace-text-muted)]",
].join(" ");
const PANEL_ACTIONS_CLASS = "openpress-panel-actions flex min-w-0 flex-wrap gap-2";
const PANEL_ACTION_BUTTON_CLASS = [
  "openpress-panel-action-button inline-flex min-w-0 min-h-[30px] cursor-pointer items-center justify-center gap-[7px]",
  "rounded-md border border-[var(--op-workspace-border-muted)] bg-transparent px-[9px] py-1.5 text-[11px] font-bold leading-none",
  "text-[var(--op-workspace-text-soft)] [font-family:inherit] hover:border-[var(--op-workspace-border-strong)] hover:bg-[var(--op-workspace-surface-hover)]",
  "disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0",
].join(" ");
const PANEL_BODY_CLASS = "openpress-panel-body grid min-w-0 min-h-0 content-start gap-[10px]";
const PANEL_SECTION_CLASS = "openpress-panel-section min-w-0 min-h-0";
const PANEL_SECTION_IN_PANEL_CLASS = "grid gap-2.5 border-t border-[var(--op-workspace-border-muted)] py-3 first:border-t-0 first:pt-0";
const PANEL_SECTION_TITLE_CLASS = [
  "openpress-panel-section-title !m-0 !p-0 [font-family:var(--openpress-font-mono)] !text-[10px] !font-[650] uppercase !leading-none !tracking-[0.04em]",
  "!text-[var(--op-workspace-text-muted)]",
].join(" ");
const PANEL_EMPTY_CLASS = [
  "openpress-panel-empty !m-0 [overflow-wrap:anywhere] border border-dashed border-[var(--op-workspace-border-muted)] !p-[14px]",
  "!text-xs !leading-[1.4] !text-[var(--op-workspace-text-muted)]",
].join(" ");
const PANEL_ERROR_CLASS = [
  "openpress-panel-error !m-0 border-l-[3px] border-[rgb(248_113_113_/_0.76)] !py-2 !pl-3",
  "!text-xs !leading-[1.45] !text-[rgb(248_113_113_/_0.88)]",
].join(" ");

function PanelRoot({ className, ...props }: PanelProps) {
  const compact = className?.includes("openpress-panel--compact") ?? false;
  return (
    <PanelContext.Provider value={{ compact, insidePanel: true }}>
      <section {...props} className={cn(PANEL_ROOT_CLASS, className)} />
    </PanelContext.Provider>
  );
}

function PanelHeader({ className, ...props }: PanelHeaderProps) {
  const { compact } = useContext(PanelContext);
  return (
    <header
      {...props}
      className={cn(PANEL_HEADER_CLASS, compact ? "items-start gap-[10px]" : "items-end gap-3", className)}
    />
  );
}

function PanelHeadingStack({ className, ...props }: PanelDivProps) {
  return <div {...props} className={cn(PANEL_HEADING_STACK_CLASS, className)} />;
}

function PanelKicker({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return <span {...props} className={cn(PANEL_KICKER_CLASS, className)} />;
}

function PanelTitle({ className, ...props }: PanelTitleProps) {
  return <h2 {...props} className={cn(PANEL_TITLE_CLASS, className)} />;
}

function PanelDescription({ className, ...props }: PanelTextProps) {
  return <p {...props} className={cn("openpress-panel-description", PANEL_DESCRIPTION_CLASS, className)} />;
}

function PanelActions({ className, ...props }: PanelDivProps) {
  const { compact } = useContext(PanelContext);
  return <div {...props} className={cn(PANEL_ACTIONS_CLASS, compact ? "justify-start" : "justify-end", className)} />;
}

function PanelActionButton({ className, ...props }: PanelButtonProps) {
  const { compact } = useContext(PanelContext);
  return (
    <Button
      variant="ghost"
      {...props}
      className={cn(
        PANEL_ACTION_BUTTON_CLASS,
        compact ? "w-[34px] p-0 [&>span]:absolute [&>span]:h-px [&>span]:w-px [&>span]:overflow-hidden [&>span]:whitespace-nowrap [&>span]:[clip:rect(0_0_0_0)]" : undefined,
        className,
      )}
    />
  );
}

function PanelBody({ className, ...props }: PanelDivProps) {
  return <div {...props} className={cn(PANEL_BODY_CLASS, className)} />;
}

function PanelSection({ className, ...props }: PanelProps) {
  const { insidePanel } = useContext(PanelContext);
  return <section {...props} className={cn(PANEL_SECTION_CLASS, insidePanel ? PANEL_SECTION_IN_PANEL_CLASS : undefined, className)} />;
}

function PanelSectionTitle({ className, ...props }: PanelSectionTitleProps) {
  return <h3 {...props} className={cn(PANEL_SECTION_TITLE_CLASS, className)} />;
}

function PanelSectionDescription({ className, ...props }: PanelTextProps) {
  return <p {...props} className={cn("openpress-panel-section-description", PANEL_DESCRIPTION_CLASS, className)} />;
}

function PanelEmpty({ className, ...props }: PanelDivProps) {
  return <div {...props} className={cn(PANEL_EMPTY_CLASS, className)} />;
}

function PanelError({ className, role = "alert", ...props }: PanelTextProps) {
  return <p {...props} role={role} className={cn(PANEL_ERROR_CLASS, className)} />;
}

export const Panel = Object.assign(PanelRoot, {
  Header: PanelHeader,
  HeadingStack: PanelHeadingStack,
  Kicker: PanelKicker,
  Title: PanelTitle,
  Description: PanelDescription,
  Actions: PanelActions,
  ActionButton: PanelActionButton,
  Body: PanelBody,
  Section: PanelSection,
  SectionTitle: PanelSectionTitle,
  SectionDescription: PanelSectionDescription,
  Empty: PanelEmpty,
  Error: PanelError,
});
