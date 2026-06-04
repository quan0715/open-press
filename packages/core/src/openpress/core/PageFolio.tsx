import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type PageFolioVariant = "current" | "total" | "slash" | "of" | "prefix";
export type PageFolioNumberFormat = "plain" | "2-digit" | "3-digit";

export type PageFolioProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  variant?: PageFolioVariant;
  currentFormat?: PageFolioNumberFormat;
  totalFormat?: PageFolioNumberFormat;
  prefix?: string;
  separator?: string;
  ofLabel?: string;
  ariaLabel?: string;
};

export function PageFolio({
  variant = "current",
  currentFormat = "plain",
  totalFormat = "plain",
  prefix = "",
  separator = "/",
  ofLabel = "of",
  ariaLabel,
  className,
  ...rest
}: PageFolioProps) {
  const current = placeholderForFormat(currentFormat);
  const total = placeholderForFormat(totalFormat);
  const label = ariaLabel ?? defaultAriaLabel(variant);

  return (
    <span
      {...rest}
      className={cn("openpress-page-folio", `openpress-page-folio--${variant}`, className)}
      data-openpress-page-folio="true"
      data-openpress-page-folio-variant={variant}
      data-openpress-page-folio-current-format={currentFormat}
      data-openpress-page-folio-total-format={totalFormat}
      data-openpress-page-folio-prefix={prefix}
      data-openpress-page-folio-separator={separator}
      data-openpress-page-folio-of-label={ofLabel}
      aria-label={label}
    >
      {renderFolioParts({ variant, current, total, currentFormat, totalFormat, prefix, separator, ofLabel })}
    </span>
  );
}

function renderFolioParts({
  variant,
  current,
  total,
  currentFormat,
  totalFormat,
  prefix,
  separator,
  ofLabel,
}: {
  variant: PageFolioVariant;
  current: string;
  total: string;
  currentFormat: PageFolioNumberFormat;
  totalFormat: PageFolioNumberFormat;
  prefix: string;
  separator: string;
  ofLabel: string;
}) {
  if (variant === "total") {
    return <span className="openpress-page-folio__total" data-openpress-page-folio-total="true" data-openpress-page-folio-format={totalFormat}>{total}</span>;
  }

  if (variant === "slash") {
    return (
      <>
        <span className="openpress-page-folio__current" data-openpress-page-folio-current="true" data-openpress-page-folio-format={currentFormat}>{current}</span>
        <span className="openpress-page-folio__separator" data-openpress-page-folio-separator-text="true">{separator}</span>
        <span className="openpress-page-folio__total" data-openpress-page-folio-total="true" data-openpress-page-folio-format={totalFormat}>{total}</span>
      </>
    );
  }

  if (variant === "of") {
    return (
      <>
        <span className="openpress-page-folio__current" data-openpress-page-folio-current="true" data-openpress-page-folio-format={currentFormat}>{current}</span>
        <span className="openpress-page-folio__separator" data-openpress-page-folio-of-text="true">{ofLabel}</span>
        <span className="openpress-page-folio__total" data-openpress-page-folio-total="true" data-openpress-page-folio-format={totalFormat}>{total}</span>
      </>
    );
  }

  if (variant === "prefix") {
    return (
      <>
        <span className="openpress-page-folio__prefix" data-openpress-page-folio-prefix-text="true">{prefix}</span>
        <span className="openpress-page-folio__current" data-openpress-page-folio-current="true" data-openpress-page-folio-format={currentFormat}>{current}</span>
      </>
    );
  }

  return <span className="openpress-page-folio__current" data-openpress-page-folio-current="true" data-openpress-page-folio-format={currentFormat}>{current}</span>;
}

function placeholderForFormat(format: PageFolioNumberFormat) {
  if (format === "3-digit") return "000";
  if (format === "2-digit") return "00";
  return "0";
}

function defaultAriaLabel(variant: PageFolioVariant) {
  if (variant === "total") return "Total pages";
  if (variant === "slash" || variant === "of") return "Page number and total pages";
  return "Page number";
}
