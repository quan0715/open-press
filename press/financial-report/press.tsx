import { Frame, MdxArea, PageFolio, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections } from "@open-press/core/manuscript";
import type { SectionsPageProps } from "@open-press/core/manuscript";
import { defineDocumentTheme } from "@open-press/core/theme";

const financialTheme = defineDocumentTheme({
  name: "Northstar Goods Annual Report",
  description: "A restrained annual-report theme for fictional financial data.",
  colors: {
    paper: "#f3f0e8",
    surface: "#fffdf8",
    surfaceMuted: "#dfe6df",
    ink: "#15362f",
    muted: "#697872",
    line: "#c6cec7",
    accent: "#bd5c35",
    link: "#15362f",
    quote: "#315f54",
    marker: "#bd5c35",
  },
  fonts: {
    body: 'Arial, "Helvetica Neue", sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: '"SFMono-Regular", Menlo, monospace',
    display: 'Georgia, "Times New Roman", serif',
  },
});

const FINANCIAL_PROSE_CLASS = "openpress-prose h-full min-h-0 min-w-0 [font-family:var(--op-theme-type-body-font-family)] text-[9pt] leading-[1.62] [&_h1]:mb-[8mm] [&_h1]:mt-[25mm] [&_h1]:max-w-[10ch] [&_h1]:[font-family:var(--op-theme-type-title-font-family)] [&_h1]:text-[46pt] [&_h1]:font-normal [&_h1]:leading-[0.94] [&_h1]:tracking-[-0.04em] [&_h2]:mb-[6mm] [&_h2]:mt-0 [&_h2]:[font-family:var(--op-theme-type-title-font-family)] [&_h2]:text-[25pt] [&_h2]:font-normal [&_h2]:leading-[1.05] [&_h3]:mb-[2mm] [&_h3]:mt-[5mm] [&_h3]:text-[11pt] [&_h3]:font-bold [&_h4]:mb-[2mm] [&_h4]:mt-[4mm] [&_h4]:[font-family:var(--op-theme-type-mono-font-family)] [&_h4]:text-[7pt] [&_h4]:uppercase [&_h4]:tracking-[0.14em] [&_p]:mb-[3mm] [&_blockquote]:my-[8mm] [&_blockquote]:max-w-[25ch] [&_blockquote]:border-l-[4px] [&_blockquote]:border-[#ef9a70] [&_blockquote]:pl-[5mm] [&_blockquote]:[font-family:var(--op-theme-type-title-font-family)] [&_blockquote]:text-[17pt] [&_blockquote]:leading-[1.3] [&_table]:my-[5mm] [&_table]:w-full [&_table]:border-collapse [&_th]:border-b-2 [&_th]:px-[2mm] [&_th]:py-[2.5mm] [&_th]:text-left [&_td]:border-b [&_td]:border-[var(--op-theme-color-line)] [&_td]:px-[2mm] [&_td]:py-[2.5mm]";

function FinancialPage({ frameKey, chainId, sectionSlug, sectionTitle }: SectionsPageProps) {
  const cover = sectionSlug.includes("cover");
  return (
    <Frame frameKey={frameKey} role="manuscript.content" className={cover ? "reader-page--financial-cover" : "reader-page--financial"}>
      <div className={cover
        ? "page-frame grid h-full min-h-[inherit] w-full grid-rows-[auto_1fr_auto] bg-[#16382f] px-[16mm] py-[15mm] text-[#f7f1e5]"
        : "page-frame grid h-full min-h-[inherit] w-full grid-rows-[auto_minmax(0,1fr)_auto] bg-[var(--op-theme-color-paper)] px-[17mm] py-[14mm]"}
      >
        <header className={cover
          ? "page-header flex items-center justify-between border-b border-white/30 pb-[3mm] [font-family:var(--op-theme-type-mono-font-family)] text-[7pt] uppercase tracking-[0.16em] text-white/70"
          : "page-header flex items-center justify-between border-b border-[var(--op-theme-color-line)] pb-[3mm] [font-family:var(--op-theme-type-mono-font-family)] text-[7pt] uppercase tracking-[0.16em] text-[var(--op-theme-color-muted)]"}
        >
          <span>Northstar Goods · FY2025</span>
          <span className={cover ? "text-[#ef9a70]" : "text-[var(--op-theme-color-accent)]"}>Demo data · not financial advice</span>
        </header>
        <main className="page-body min-h-0 py-[8mm]">
          <MdxArea chainId={chainId} className={FINANCIAL_PROSE_CLASS} />
        </main>
        <footer className={cover
          ? "page-footer flex items-center justify-between border-t border-white/30 pt-[3mm] [font-family:var(--op-theme-type-mono-font-family)] text-[7pt] uppercase tracking-[0.12em] text-white/60"
          : "page-footer flex items-center justify-between border-t border-[var(--op-theme-color-line)] pt-[3mm] [font-family:var(--op-theme-type-mono-font-family)] text-[7pt] uppercase tracking-[0.12em] text-[var(--op-theme-color-muted)]"}
        >
          <span>{sectionTitle}</span><PageFolio variant="slash" separator=" / " />
        </footer>
      </div>
    </Frame>
  );
}

export default function FinancialReportPress() {
  return (
    <Press
      slug="financial-report"
      title="Northstar Goods — FY2025 Annual Report"
      type="pages"
      page="a4"
      theme={financialTheme}
      componentsDir="./components"
      sources={[mdxSource({ id: "financial", preset: "section-files", root: "financial-report/chapters" })]}
    >
      <Sections source="financial" page={FinancialPage} />
    </Press>
  );
}
