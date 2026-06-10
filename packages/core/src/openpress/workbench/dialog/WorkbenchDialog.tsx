import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const DIALOG_BACKDROP_CLASS = [
  "openpress-workbench-dialog-backdrop fixed inset-0 z-[1000] grid place-items-start justify-center overflow-auto",
  "bg-black/[0.54] px-7 pb-7 pt-[calc(var(--openpress-workbench-toolbar-height,44px)+28px)]",
].join(" ");
const DIALOG_CLASS = [
  "openpress-workbench-dialog relative grid max-h-[calc(100vh-var(--openpress-workbench-toolbar-height,44px)-56px)]",
  "w-[min(560px,calc(100vw-56px))] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden",
  "rounded-[var(--openpress-workbench-radius-md)] border border-[var(--openpress-workbench-border)]",
  "bg-[var(--openpress-workbench-dialog-bg)] text-[var(--openpress-workbench-text)] shadow-[0_24px_68px_rgb(0_0_0_/_0.42)]",
  "[&_.openpress-workbench-dialog__body]:grid [&_.openpress-workbench-dialog__body]:gap-2.5 [&_.openpress-workbench-dialog__body]:px-6 [&_.openpress-workbench-dialog__body]:pb-2 [&_.openpress-workbench-dialog__body]:pt-0",
  "[&_.openpress-workbench-dialog__body_p]:m-0 [&_.openpress-workbench-dialog__body_p]:text-xs [&_.openpress-workbench-dialog__body_p]:leading-normal [&_.openpress-workbench-dialog__body_p]:text-[var(--openpress-workbench-text-soft)]",
  "[&_.openpress-workbench-dialog__body_strong]:text-[rgb(242_242_240_/_0.94)]",
].join(" ");
const DIALOG_TOP_RULE_CLASS = "absolute left-0 right-0 top-0 h-0.5 bg-[rgb(240_182_76_/_0.82)]";
const DIALOG_HEADER_CLASS = "openpress-workbench-dialog__header flex items-start justify-between gap-3 px-6 pb-3.5 pl-6 pr-12 pt-[18px]";
const DIALOG_HEADING_CLASS = "openpress-workbench-dialog__heading grid min-w-0 gap-[5px]";
const DIALOG_EYEBROW_CLASS = "openpress-workbench-dialog__eyebrow block font-mono text-[10px] font-semibold uppercase leading-none tracking-normal text-[rgb(160_166_173_/_0.62)]";
const DIALOG_TITLE_ROW_CLASS = "openpress-workbench-dialog__title-row grid min-h-5 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2";
const DIALOG_TITLE_CLASS = "!m-0 !text-[15px] !font-semibold !leading-5 !text-[rgb(242_242_240_/_0.94)] before:!hidden before:!content-none";
const DIALOG_TITLE_META_CLASS = "openpress-workbench-dialog__title-meta flex min-h-5 min-w-0 items-center";
const DIALOG_CLOSE_CLASS = [
  "openpress-workbench-dialog__close absolute right-[9px] top-[9px] inline-flex h-[30px] w-[30px]",
  "cursor-pointer items-center justify-center rounded-[var(--openpress-workbench-radius-sm)] border border-transparent bg-transparent p-0",
  "text-[#aeb3b8] hover:text-[#f2f2f0] [&_svg]:h-3.5 [&_svg]:w-3.5",
].join(" ");
const DIALOG_FOOTER_CLASS = [
  "openpress-workbench-dialog__footer flex items-center justify-between gap-3 px-6 pb-[18px] pt-3.5",
  "[&_button]:inline-flex [&_button]:h-8 [&_button]:cursor-pointer [&_button]:items-center [&_button]:justify-center",
  "[&_button]:rounded-[var(--openpress-workbench-radius-sm)] [&_button]:border [&_button]:border-[var(--openpress-workbench-border)]",
  "[&_button]:bg-transparent [&_button]:px-3 [&_button]:text-[11px] [&_button]:font-semibold",
  "[&_button]:text-[var(--openpress-workbench-text-soft)] [&_button]:[font-family:inherit]",
  "[&_button:hover:not(:disabled)]:border-[rgb(240_182_76_/_0.34)] [&_button:hover:not(:disabled)]:text-[var(--openpress-workbench-accent)]",
  "[&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-45",
  "[&_.openpress-workbench-dialog__danger]:border-[rgb(248_113_113_/_0.34)] [&_.openpress-workbench-dialog__danger]:bg-[rgb(248_113_113_/_0.10)] [&_.openpress-workbench-dialog__danger]:text-[rgb(255_182_182_/_0.94)]",
  "[&_.openpress-workbench-dialog__danger:hover:not(:disabled)]:border-[rgb(248_113_113_/_0.58)] [&_.openpress-workbench-dialog__danger:hover:not(:disabled)]:text-[rgb(255_224_224_/_0.98)]",
].join(" ");

export function WorkbenchDialog({
  titleId,
  title,
  eyebrow,
  titleMeta,
  className,
  backdropClassName,
  footerClassName,
  headerClassName,
  closeLabel,
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
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={joinClassNames(DIALOG_BACKDROP_CLASS, backdropClassName)}
      role="presentation"
      onClick={onClose}
    >
      <section
        className={joinClassNames(DIALOG_CLASS, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <span className={DIALOG_TOP_RULE_CLASS} aria-hidden="true" />
        <header className={joinClassNames(DIALOG_HEADER_CLASS, headerClassName)}>
          <div className={DIALOG_HEADING_CLASS}>
            {eyebrow ? <span className={DIALOG_EYEBROW_CLASS}>{eyebrow}</span> : null}
            <div className={DIALOG_TITLE_ROW_CLASS}>
              <h2 id={titleId} className={DIALOG_TITLE_CLASS}>{title}</h2>
              {titleMeta ? <div className={DIALOG_TITLE_META_CLASS}>{titleMeta}</div> : null}
            </div>
          </div>
          <button
            type="button"
            className={DIALOG_CLOSE_CLASS}
            aria-label={closeLabel}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
        {footer ? <footer className={joinClassNames(DIALOG_FOOTER_CLASS, footerClassName)}>{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}
