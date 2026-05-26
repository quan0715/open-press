import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function WorkbenchDialog({
  titleId,
  title,
  eyebrow,
  titleMeta,
  className,
  backdropClassName,
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
  headerClassName?: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={joinClassNames("openpress-workbench-dialog-backdrop", backdropClassName)}
      role="presentation"
      onClick={onClose}
    >
      <section
        className={joinClassNames("openpress-workbench-dialog", className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={joinClassNames("openpress-workbench-dialog__header", headerClassName)}>
          <div className="openpress-workbench-dialog__heading">
            {eyebrow ? <span className="openpress-workbench-dialog__eyebrow">{eyebrow}</span> : null}
            <div className="openpress-workbench-dialog__title-row">
              <h2 id={titleId}>{title}</h2>
              {titleMeta ? <div className="openpress-workbench-dialog__title-meta">{titleMeta}</div> : null}
            </div>
          </div>
          <button
            type="button"
            className="openpress-workbench-dialog__close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
        {footer ? <footer className="openpress-workbench-dialog__footer">{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}
