import { type ButtonHTMLAttributes, type ComponentProps, type HTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/openpress/ui/button";
import {
  Dialog as ShadcnDialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/openpress/ui/dialog";

const DIALOG_OVERLAY_CLASS = "op-workspace-overlay !z-[1000] bg-black/[0.54] !backdrop-blur-0 ![backdrop-filter:none] supports-backdrop-filter:!backdrop-blur-0";
const DIALOG_CLASS = [
  "op-workspace-overlay op-ui-dialog isolate !z-[1001] !max-w-none !gap-0 !p-0 sm:!max-w-none",
  "grid max-h-[calc(100vh-var(--op-workspace-toolbar-height,44px)-56px)]",
  "grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[var(--op-workspace-radius-md)]",
  "border border-[var(--op-workspace-border)] ![background:var(--op-workspace-surface-dialog)]",
  "text-[var(--op-workspace-text)] shadow-[var(--op-workspace-shadow-dialog)]",
].join(" ");
const DIALOG_TOP_CLASS = "!left-1/2 !top-[calc(var(--op-workspace-toolbar-height,44px)+28px)] !-translate-x-1/2 !translate-y-0";
const DIALOG_CENTER_CLASS = "!left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2";
const DIALOG_HEADER_CLASS = "flex items-center justify-between gap-3 px-6 pb-3.5 pl-6 pr-12 pt-4";
const DIALOG_HEADING_CLASS = "grid min-w-0";
const DIALOG_TITLE_ROW_CLASS = "grid min-h-5 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2";
const DIALOG_TITLE_CLASS = "!m-0 !text-[15px] !font-semibold !leading-5 !text-[var(--op-workspace-text)] before:!hidden before:!content-none";
const DIALOG_TITLE_META_CLASS = "flex min-h-5 min-w-0 items-center";
const DIALOG_CLOSE_CLASS = [
  "op-ui-icon-button absolute right-[9px] top-[9px] inline-flex h-[30px] w-[30px] !rounded-[var(--op-workspace-radius-sm)]",
  "cursor-pointer items-center justify-center rounded-[var(--op-workspace-radius-sm)] border border-transparent bg-transparent p-0",
  "text-[var(--op-workspace-text-muted)] hover:text-[var(--op-workspace-text)] [&_svg]:h-3.5 [&_svg]:w-3.5",
].join(" ");
const DIALOG_FOOTER_CLASS = [
  "flex items-center justify-between gap-3 px-6 pb-[18px] pt-3.5",
  "[&_button]:inline-flex [&_button]:h-8 [&_button]:cursor-pointer [&_button]:items-center [&_button]:justify-center",
  "[&_button]:rounded-[var(--op-workspace-radius-sm)] [&_button]:border [&_button]:border-[var(--op-workspace-border)]",
  "[&_button]:bg-transparent [&_button]:px-3 [&_button]:text-[11px] [&_button]:font-semibold",
  "[&_button]:text-[var(--op-workspace-text-soft)] [&_button]:[font-family:inherit]",
  "[&_button:hover:not(:disabled)]:border-[var(--op-workspace-accent-border)] [&_button:hover:not(:disabled)]:text-[var(--op-workspace-accent)]",
  "[&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-45",
  "[&_button[data-openpress-dialog-action-tone=danger]]:border-[var(--op-workspace-danger-border)]",
  "[&_button[data-openpress-dialog-action-tone=danger]]:bg-[var(--op-workspace-danger-surface)]",
  "[&_button[data-openpress-dialog-action-tone=danger]]:text-[color-mix(in_srgb,var(--op-workspace-danger)_58%,white)]",
  "[&_button[data-openpress-dialog-action-tone=danger]:hover:not(:disabled)]:border-[var(--op-workspace-danger)]",
  "[&_button[data-openpress-dialog-action-tone=danger]:hover:not(:disabled)]:text-[color-mix(in_srgb,var(--op-workspace-danger)_24%,white)]",
].join(" ");
const DIALOG_BODY_CLASS = "grid min-h-0 gap-2.5 px-6 pb-2 pt-0";
const DIALOG_TEXT_CLASS = "m-0 text-xs leading-normal text-[var(--op-workspace-text-soft)]";
const DIALOG_STRONG_CLASS = "text-[var(--op-workspace-text)]";

type WorkbenchDialogActionTone = "default" | "danger";

export function WorkbenchDialog({
  titleId,
  title,
  eyebrow: _eyebrow,
  titleMeta,
  className,
  backdropClassName,
  footerClassName,
  headerClassName,
  closeLabel,
  placement = "top",
  contentDataAttribute,
  onCloseAutoFocus,
  onClose,
  children,
  footer,
}: {
  titleId: string;
  title: ReactNode;
  eyebrow?: ReactNode;
  titleMeta?: ReactNode;
  className?: string;
  backdropClassName?: string;
  footerClassName?: string;
  headerClassName?: string;
  closeLabel: string;
  placement?: "top" | "center";
  contentDataAttribute?: `data-${string}`;
  onCloseAutoFocus?: ComponentProps<typeof DialogContent>["onCloseAutoFocus"];
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <ShadcnDialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        {...(contentDataAttribute ? { [contentDataAttribute]: "" } : {})}
        className={joinClassNames(DIALOG_CLASS, placement === "center" ? DIALOG_CENTER_CLASS : DIALOG_TOP_CLASS, className)}
        overlayClassName={joinClassNames(DIALOG_OVERLAY_CLASS, backdropClassName)}
        style={{ width: "min(560px, calc(100vw - 56px))" }}
        aria-labelledby={titleId}
        onCloseAutoFocus={onCloseAutoFocus}
        showCloseButton={false}
      >
        <DialogHeader className={joinClassNames(DIALOG_HEADER_CLASS, headerClassName)}>
          <div className={DIALOG_HEADING_CLASS}>
            <div className={DIALOG_TITLE_ROW_CLASS}>
              <DialogTitle id={titleId} className={DIALOG_TITLE_CLASS}>{title}</DialogTitle>
              {titleMeta ? <div className={DIALOG_TITLE_META_CLASS}>{titleMeta}</div> : null}
            </div>
          </div>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" className={DIALOG_CLOSE_CLASS} aria-label={closeLabel}>
              <X aria-hidden="true" />
            </Button>
          </DialogClose>
        </DialogHeader>
        {children}
        {footer ? <DialogFooter className={joinClassNames(DIALOG_FOOTER_CLASS, footerClassName)}>{footer}</DialogFooter> : null}
      </DialogContent>
    </ShadcnDialog>
  );
}

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function WorkbenchDialogBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={joinClassNames(DIALOG_BODY_CLASS, className)} {...props} />;
}

export function WorkbenchDialogText({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={joinClassNames(DIALOG_TEXT_CLASS, className)} {...props} />;
}

export function WorkbenchDialogStrong({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <strong className={joinClassNames(DIALOG_STRONG_CLASS, className)} {...props} />;
}

export function WorkbenchDialogAction({
  className,
  tone = "default",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: WorkbenchDialogActionTone }) {
  return (
    <Button
      type={type}
      variant={tone === "danger" ? "destructive" : "outline"}
      size="sm"
      className={joinClassNames("op-ui-button", tone === "danger" ? "op-ui-button-danger" : undefined, className)}
      data-openpress-dialog-action-tone={tone === "default" ? undefined : tone}
      {...props}
    />
  );
}
