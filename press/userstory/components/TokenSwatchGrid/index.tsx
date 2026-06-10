import type { CSSProperties } from "react";

export interface TokenSwatch {
  name: string;
  hex: string;
  summary: string;
  swatchVar: string;
  swatchBorderVar?: string;
  dark?: boolean;
}

export interface TokenSwatchGridProps {
  ariaLabel?: string;
  swatches: TokenSwatch[];
}

const GRID_CLASS =
  "my-[var(--openpress-space-3)] mb-[var(--openpress-space-4)] grid break-inside-avoid grid-cols-3 gap-[3mm]";
const SWATCH_CLASS =
  "min-h-[42mm] break-inside-avoid overflow-hidden rounded-[6px] border border-[var(--openpress-color-line)] bg-[var(--openpress-color-document)]";
const SWATCH_SAMPLE_CLASS =
  "h-[17mm] border-b [border-bottom-color:var(--swatch-border,var(--openpress-color-line))] bg-[var(--swatch)]";
const SWATCH_BODY_CLASS = "p-[3mm]";
const SWATCH_TITLE_CLASS =
  "!m-0 !text-[9pt] !font-semibold !leading-[1.25] !tracking-normal !text-[var(--openpress-color-ink)] [font-family:var(--openpress-font-body)]";
const SWATCH_CODE_CLASS =
  "!mt-[1mm] block !text-[8pt] !leading-[1.35] !text-[var(--openpress-color-muted)]";
const SWATCH_SUMMARY_CLASS =
  "!mb-0 !mt-[2mm] !text-[8.4pt] !leading-[1.45] !text-[#333333]";

export default function TokenSwatchGrid({
  ariaLabel = "Color specimen",
  swatches,
}: TokenSwatchGridProps) {
  return (
    <section className={GRID_CLASS} data-openpress-component="TokenSwatchGrid" aria-label={ariaLabel}>
      {swatches.map((swatch) => (
        <article
          key={swatch.name}
          className={SWATCH_CLASS}
          style={swatchStyle(swatch)}
        >
          <div className={SWATCH_SAMPLE_CLASS} />
          <div className={SWATCH_BODY_CLASS}>
            <h4 className={SWATCH_TITLE_CLASS}>{swatch.name}</h4>
            <code className={SWATCH_CODE_CLASS}>{swatch.hex}</code>
            <p className={SWATCH_SUMMARY_CLASS}>{swatch.summary}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

function swatchStyle(swatch: TokenSwatch): CSSProperties {
  return {
    "--swatch": swatch.swatchVar,
    ...(swatch.swatchBorderVar ? { "--swatch-border": swatch.swatchBorderVar } : {}),
  } as CSSProperties;
}
