import type { BaseCalloutProps, BaseFigureProps } from "./types";

function classNames(...values: Array<string | undefined>) {
  const joined = values.filter(Boolean).join(" ");
  return joined.length > 0 ? joined : undefined;
}

export function BaseFigure({ caption, className, children, ...figureProps }: BaseFigureProps) {
  return (
    <figure {...figureProps} className={classNames("openpress-figure", className)}>
      <div data-figure-body>{children}</div>
      {caption === undefined ? null : <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export function BaseCallout({ kind = "info", className, children, ...calloutProps }: BaseCalloutProps) {
  return (
    <aside {...calloutProps} className={classNames("openpress-callout", className)} data-callout-kind={kind}>
      {children}
    </aside>
  );
}
