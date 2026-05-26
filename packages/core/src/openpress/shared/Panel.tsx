import { type ComponentPropsWithoutRef } from "react";
import { cn } from "../core/cn";

type PanelProps = ComponentPropsWithoutRef<"section">;
type PanelHeaderProps = ComponentPropsWithoutRef<"header">;
type PanelDivProps = ComponentPropsWithoutRef<"div">;
type PanelTextProps = ComponentPropsWithoutRef<"p">;
type PanelTitleProps = ComponentPropsWithoutRef<"h2">;
type PanelSectionTitleProps = ComponentPropsWithoutRef<"h3">;
type PanelButtonProps = ComponentPropsWithoutRef<"button">;

function PanelRoot({ className, ...props }: PanelProps) {
  return <section {...props} className={cn("openpress-panel", className)} />;
}

function PanelHeader({ className, ...props }: PanelHeaderProps) {
  return <header {...props} className={cn("openpress-panel-header", className)} />;
}

function PanelKicker({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return <span {...props} className={cn("openpress-panel-kicker", className)} />;
}

function PanelTitle({ className, ...props }: PanelTitleProps) {
  return <h2 {...props} className={cn("openpress-panel-title", className)} />;
}

function PanelDescription({ className, ...props }: PanelTextProps) {
  return <p {...props} className={cn("openpress-panel-description", className)} />;
}

function PanelActions({ className, ...props }: PanelDivProps) {
  return <div {...props} className={cn("openpress-panel-actions", className)} />;
}

function PanelActionButton({ className, ...props }: PanelButtonProps) {
  return <button {...props} className={cn("openpress-panel-action-button", className)} />;
}

function PanelBody({ className, ...props }: PanelDivProps) {
  return <div {...props} className={cn("openpress-panel-body", className)} />;
}

function PanelSection({ className, ...props }: PanelProps) {
  return <section {...props} className={cn("openpress-panel-section", className)} />;
}

function PanelSectionTitle({ className, ...props }: PanelSectionTitleProps) {
  return <h3 {...props} className={cn("openpress-panel-section-title", className)} />;
}

function PanelSectionDescription({ className, ...props }: PanelTextProps) {
  return <p {...props} className={cn("openpress-panel-section-description", className)} />;
}

function PanelEmpty({ className, ...props }: PanelDivProps) {
  return <div {...props} className={cn("openpress-panel-empty", className)} />;
}

function PanelError({ className, role = "alert", ...props }: PanelTextProps) {
  return <p {...props} role={role} className={cn("openpress-panel-error", className)} />;
}

export const Panel = Object.assign(PanelRoot, {
  Header: PanelHeader,
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
