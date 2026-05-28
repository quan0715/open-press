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

export default function TokenSwatchGrid({
  ariaLabel = "Color specimen",
  swatches,
}: TokenSwatchGridProps) {
  return (
    <section className="token-swatch-grid" data-openpress-component="TokenSwatchGrid" aria-label={ariaLabel}>
      {swatches.map((swatch) => (
        <article
          key={swatch.name}
          className={swatch.dark ? "token-swatch token-swatch--dark" : "token-swatch"}
          style={swatchStyle(swatch)}
        >
          <div className="token-swatch__sample" />
          <div className="token-swatch__body">
            <h4>{swatch.name}</h4>
            <code>{swatch.hex}</code>
            <p>{swatch.summary}</p>
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
