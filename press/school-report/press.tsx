import { Frame, MdxArea, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections } from "@open-press/core/manuscript";
import type { SectionsPageProps } from "@open-press/core/manuscript";
import { defineDocumentTheme } from "@open-press/core/theme";

const schoolTheme = defineDocumentTheme({
  name: "Companionship School Report",
  description: "A friendly student-report theme with simple evidence displays.",
  colors: {
    paper: "#f4f0e7",
    surface: "#fffdf7",
    surfaceMuted: "#e3ece9",
    ink: "#173b43",
    muted: "#60767a",
    line: "#c9d4d0",
    accent: "#df7f52",
    link: "#173b43",
    quote: "#2d6b73",
    marker: "#df7f52",
  },
  fonts: {
    body: 'Avenir, "Helvetica Neue", Arial, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: '"SFMono-Regular", Menlo, monospace',
    display: 'Georgia, "Times New Roman", serif',
  },
});

const SCHOOL_PROSE_CLASS = "openpress-prose h-full min-h-0 min-w-0 [font-family:var(--op-theme-type-body-font-family)] text-[9.2pt] leading-[1.65] text-[var(--op-theme-color-ink)] [&_h1]:mb-[8mm] [&_h1]:mt-[22mm] [&_h1]:max-w-[13ch] [&_h1]:[font-family:var(--op-theme-type-title-font-family)] [&_h1]:text-[38pt] [&_h1]:font-normal [&_h1]:leading-[1.02] [&_h1]:tracking-[-0.025em] [&_h2]:mb-[6mm] [&_h2]:mt-0 [&_h2]:[font-family:var(--op-theme-type-title-font-family)] [&_h2]:text-[23pt] [&_h2]:font-normal [&_h2]:leading-[1.1] [&_h3]:mb-[2mm] [&_h3]:mt-[5mm] [&_h3]:text-[11pt] [&_h3]:font-bold [&_h4]:mb-[2mm] [&_h4]:mt-[4mm] [&_h4]:text-[7.5pt] [&_h4]:uppercase [&_h4]:tracking-[0.15em] [&_h4]:text-[var(--op-theme-color-accent)] [&_p]:mb-[3mm] [&_blockquote]:my-[8mm] [&_blockquote]:max-w-[24ch] [&_blockquote]:border-l-[5px] [&_blockquote]:border-[var(--op-theme-color-accent)] [&_blockquote]:pl-[5mm] [&_blockquote]:[font-family:var(--op-theme-type-title-font-family)] [&_blockquote]:text-[17pt] [&_blockquote]:leading-[1.3] [&_ul]:mb-[4mm] [&_ul]:grid [&_ul]:gap-[2mm] [&_table]:my-[6mm] [&_table]:w-full [&_table]:border-collapse [&_th]:border-b-2 [&_th]:border-[var(--op-theme-color-ink)] [&_th]:px-[2mm] [&_th]:py-[2.5mm] [&_th]:text-left [&_td]:border-b [&_td]:border-[var(--op-theme-color-line)] [&_td]:px-[2mm] [&_td]:py-[2.5mm]";

function SchoolReportPage({ frameKey, chainId, pageIndex, totalPages, sectionSlug, sectionTitle }: SectionsPageProps) {
  const cover = sectionSlug.includes("cover");
  return (
    <Frame frameKey={frameKey} role="manuscript.content" className={cover ? "reader-page--school-cover" : "reader-page--school-report"}>
      <div className={cover
        ? "page-frame grid h-full min-h-[inherit] w-full grid-rows-[auto_1fr_auto] bg-[#e7eee9] px-[17mm] py-[15mm]"
        : "page-frame grid h-full min-h-[inherit] w-full grid-rows-[auto_minmax(0,1fr)_auto] bg-[var(--op-theme-color-paper)] px-[17mm] py-[14mm]"}
      >
        <header className="page-header flex items-center justify-between border-b border-[var(--op-theme-color-line)] pb-[3mm] [font-family:var(--op-theme-type-mono-font-family)] text-[7pt] uppercase tracking-[0.16em] text-[var(--op-theme-color-muted)]">
          <span>School report · 2026</span>
          <span className="text-[var(--op-theme-color-accent)]">Demo data</span>
        </header>
        <main className="page-body min-h-0 py-[9mm]">
          <MdxArea chainId={chainId} className={SCHOOL_PROSE_CLASS} />
        </main>
        <footer className="page-footer flex items-center justify-between border-t border-[var(--op-theme-color-line)] pt-[3mm] [font-family:var(--op-theme-type-mono-font-family)] text-[7pt] uppercase tracking-[0.12em] text-[var(--op-theme-color-muted)]">
          <span>{sectionTitle}</span>
          <span>{pageIndex + 1}{totalPages > 1 ? ` / ${totalPages}` : ""}</span>
        </footer>
      </div>
    </Frame>
  );
}

export default function SchoolReportPress() {
  return (
    <Press
      slug="school-report"
      title="Dog Ownership — Confidence & Companionship"
      type="pages"
      page="a4"
      theme={schoolTheme}
      sources={[mdxSource({ id: "school", preset: "section-files", root: "school-report/chapters" })]}
    >
      <Sections source="school" page={SchoolReportPage} />
    </Press>
  );
}
