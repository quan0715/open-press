import { Frame, MdxArea, PageFolio, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections } from "@open-press/core/manuscript";
import type { SectionsPageProps } from "@open-press/core/manuscript";
import { defineDocumentTheme } from "@open-press/core/theme";

const thesisTheme = defineDocumentTheme({
  name: "Classical Degree Thesis",
  description: "A conservative university thesis layout with filled fictional research content.",
  colors: {
    paper: "#fbfaf7",
    surface: "#ffffff",
    surfaceMuted: "#f0efeb",
    ink: "#171c22",
    muted: "#60666d",
    line: "#c9cbd0",
    accent: "#8e2f2f",
    link: "#243f63",
    quote: "#243f63",
    marker: "#8e2f2f",
  },
  fonts: {
    body: 'Georgia, "Times New Roman", serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: '"SFMono-Regular", Menlo, monospace',
    display: 'Georgia, "Times New Roman", serif',
  },
  typography: {
    body: { font: "body", size: "9.5pt", lineHeight: 1.72, weight: 400, color: "ink", sample: "Academic prose remains readable across long pages." },
    heading: { font: "serif", size: "19pt", lineHeight: 1.22, weight: 600, color: "ink", sample: "Chapter One" },
  },
});

const THESIS_PROSE_CLASS = "openpress-prose h-full min-h-0 min-w-0 [font-family:var(--op-theme-type-body-font-family)] text-[9.5pt] leading-[1.72] text-[var(--op-theme-color-ink)] [&_h1]:mx-auto [&_h1]:mb-[10mm] [&_h1]:mt-[22mm] [&_h1]:max-w-[18ch] [&_h1]:text-center [&_h1]:text-[30pt] [&_h1]:font-normal [&_h1]:uppercase [&_h1]:leading-[1.18] [&_h1]:tracking-[0.035em] [&_h2]:mb-[7mm] [&_h2]:mt-0 [&_h2]:border-b [&_h2]:border-[var(--op-theme-color-ink)] [&_h2]:pb-[3mm] [&_h2]:text-[19pt] [&_h2]:font-semibold [&_h2]:leading-[1.2] [&_h3]:mb-[2mm] [&_h3]:mt-[5mm] [&_h3]:text-[12pt] [&_h3]:font-semibold [&_h4]:mb-[2mm] [&_h4]:mt-[4mm] [&_h4]:[font-family:var(--op-theme-type-mono-font-family)] [&_h4]:text-[7pt] [&_h4]:uppercase [&_h4]:tracking-[0.13em] [&_h4]:text-[var(--op-theme-color-accent)] [&_p]:mb-[3.2mm] [&_p]:text-justify [&_blockquote]:my-[6mm] [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--op-theme-color-accent)] [&_blockquote]:pl-[5mm] [&_blockquote]:text-[11pt] [&_blockquote]:italic [&_ul]:mb-[4mm] [&_ol]:mb-[4mm] [&_li]:mb-[1.5mm] [&_table]:my-[5mm] [&_table]:w-full [&_table]:border-collapse [&_table]:text-[8pt] [&_th]:border-y-2 [&_th]:border-[var(--op-theme-color-ink)] [&_th]:px-[2mm] [&_th]:py-[2.5mm] [&_th]:text-left [&_td]:border-b [&_td]:border-[var(--op-theme-color-line)] [&_td]:px-[2mm] [&_td]:py-[2.5mm] [&_hr]:my-[7mm] [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-[var(--op-theme-color-line)]";

function ThesisPage({ frameKey, chainId, sectionSlug, sectionTitle }: SectionsPageProps) {
  const titlePage = sectionSlug.includes("title-page");
  return (
    <Frame frameKey={frameKey} role="manuscript.content" className={titlePage ? "reader-page--thesis-title" : "reader-page--thesis"}>
      <div className="page-frame grid h-full min-h-[inherit] w-full grid-rows-[auto_minmax(0,1fr)_auto] bg-[var(--op-theme-color-paper)] px-[20mm] py-[16mm]">
        <header className="page-header flex items-center justify-between border-b border-[var(--op-theme-color-line)] pb-[3mm] [font-family:var(--op-theme-type-mono-font-family)] text-[6.8pt] uppercase tracking-[0.15em] text-[var(--op-theme-color-muted)]">
          <span>North Harbor University · School of Urban Studies</span>
          <span className="text-[var(--op-theme-color-accent)]">Fictional thesis sample</span>
        </header>
        <main className="page-body min-h-0 py-[9mm]">
          <MdxArea chainId={chainId} className={THESIS_PROSE_CLASS} />
        </main>
        <footer className="page-footer grid grid-cols-[1fr_auto_1fr] items-center border-t border-[var(--op-theme-color-line)] pt-[3mm] [font-family:var(--op-theme-type-mono-font-family)] text-[6.8pt] uppercase tracking-[0.1em] text-[var(--op-theme-color-muted)]">
          <span className="truncate">{sectionTitle}</span>
          <PageFolio className="px-[5mm]" variant="slash" separator=" / " />
          <span className="text-right">Demo data</span>
        </footer>
      </div>
    </Frame>
  );
}

export default function ThesisPress() {
  return (
    <Press
      slug="thesis"
      title="Urban Heat and Street Shade"
      type="pages"
      page="a4"
      theme={thesisTheme}
      sources={[mdxSource({ id: "thesis", preset: "section-files", root: "thesis/chapters" })]}
      captionNumbering={{ figure: "Figure", table: "Table" }}
    >
      <Sections source="thesis" page={ThesisPage} />
    </Press>
  );
}
