import { Frame, MdxArea, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections } from "@open-press/core/manuscript";
import type { SectionsPageProps } from "@open-press/core/manuscript";
import { defineDocumentTheme } from "@open-press/core/theme";

const resumeTheme = defineDocumentTheme({
  name: "Product Engineer Resume",
  description: "A compact editorial resume theme for a fictional product engineer.",
  colors: {
    paper: "#f6f2ea",
    surface: "#f6f2ea",
    surfaceMuted: "#e8e1d6",
    ink: "#18232f",
    muted: "#64717a",
    line: "#c7c0b5",
    accent: "#d9583b",
    link: "#18232f",
    quote: "#d9583b",
    marker: "#d9583b",
  },
  fonts: {
    body: 'Inter, "Helvetica Neue", Arial, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: '"SFMono-Regular", Menlo, monospace',
    display: 'Inter, "Helvetica Neue", Arial, sans-serif',
  },
  typography: {
    title: { font: "display", size: "33pt", lineHeight: 0.98, weight: 650, tracking: "-0.04em", color: "ink", sample: "Mina Chen" },
    heading: { font: "display", size: "17pt", lineHeight: 1.1, weight: 650, tracking: "-0.025em", color: "ink", sample: "Experience" },
    subheading: { font: "body", size: "10pt", lineHeight: 1.25, weight: 700, color: "ink", sample: "Senior Product Engineer" },
    body: { font: "body", size: "8.7pt", lineHeight: 1.48, weight: 400, color: "ink", sample: "Built accessible tools for complex workflows." },
  },
});

const RESUME_PROSE_CLASS = "openpress-prose h-full min-h-0 min-w-0 [font-family:var(--op-theme-type-body-font-family)] text-[8.7pt] leading-[1.48] text-[var(--op-theme-color-ink)] [&_h1]:m-0 [&_h1]:max-w-[12ch] [&_h1]:text-[33pt] [&_h1]:font-semibold [&_h1]:leading-[0.98] [&_h1]:tracking-[-0.04em] [&_h2]:mb-[5mm] [&_h2]:mt-0 [&_h2]:border-b [&_h2]:border-[var(--op-theme-color-line)] [&_h2]:pb-[3mm] [&_h2]:text-[18pt] [&_h2]:font-semibold [&_h2]:tracking-[-0.025em] [&_h3]:mb-[1mm] [&_h3]:mt-[4mm] [&_h3]:text-[10.5pt] [&_h3]:font-bold [&_h4]:mb-[1mm] [&_h4]:mt-[3mm] [&_h4]:text-[8pt] [&_h4]:uppercase [&_h4]:tracking-[0.14em] [&_h4]:text-[var(--op-theme-color-accent)] [&_p]:mb-[2.5mm] [&_ul]:mb-[3mm] [&_ul]:grid [&_ul]:gap-[1.2mm] [&_ul]:pl-[4mm] [&_li]:pl-[1mm] [&_strong]:font-semibold [&_blockquote]:my-[5mm] [&_blockquote]:border-l-[3px] [&_blockquote]:border-[var(--op-theme-color-accent)] [&_blockquote]:pl-[4mm] [&_blockquote]:text-[11pt] [&_blockquote]:leading-[1.35]";

function ResumePage({ frameKey, chainId, pageIndex, totalPages, sectionTitle }: SectionsPageProps) {
  return (
    <Frame frameKey={frameKey} role="manuscript.content" className="reader-page--resume" data-page-index={pageIndex}>
      <div className="page-frame grid h-full min-h-[inherit] w-full grid-rows-[auto_minmax(0,1fr)_auto] bg-[var(--op-theme-color-paper)] px-[15mm] py-[13mm]">
        <header className="page-header flex items-center justify-between border-b border-[var(--op-theme-color-ink)] pb-[3mm] [font-family:var(--op-theme-type-mono-font-family)] text-[7pt] uppercase tracking-[0.18em]">
          <span>Mina Chen · Product Engineer</span>
          <span className="text-[var(--op-theme-color-accent)]">Fictional sample</span>
        </header>
        <main className="page-body min-h-0 py-[8mm]">
          <MdxArea chainId={chainId} className={RESUME_PROSE_CLASS} />
        </main>
        <footer className="page-footer flex items-center justify-between border-t border-[var(--op-theme-color-line)] pt-[3mm] [font-family:var(--op-theme-type-mono-font-family)] text-[7pt] uppercase tracking-[0.12em] text-[var(--op-theme-color-muted)]">
          <span>{sectionTitle}</span>
          <span>{totalPages > 1 ? `${pageIndex + 1}/${totalPages}` : "open-press"}</span>
        </footer>
      </div>
    </Frame>
  );
}

export default function ResumePress() {
  return (
    <Press
      slug="resume"
      title="Mina Chen — Product Engineer"
      type="pages"
      page="a4"
      theme={resumeTheme}
      sources={[mdxSource({ id: "resume", preset: "section-files", root: "resume/chapters" })]}
    >
      <Sections source="resume" page={ResumePage} />
    </Press>
  );
}
