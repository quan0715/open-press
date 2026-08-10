import { Frame, MdxArea, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections } from "@open-press/core/manuscript";
import type { SectionsPageProps } from "@open-press/core/manuscript";
import { defineDocumentTheme } from "@open-press/core/theme";

const resumeTheme = defineDocumentTheme({
  name: "Executive Resume",
  description: "A restrained editorial resume theme for a public-source executive profile.",
  colors: {
    paper: "#f8f6f1",
    surface: "#f8f6f1",
    surfaceMuted: "#efede7",
    ink: "#191919",
    muted: "#6b6862",
    line: "#d8d3ca",
    accent: "#222222",
    link: "#222222",
    quote: "#191919",
    marker: "#222222",
  },
  fonts: {
    body: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    serif: '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
    mono: '"SFMono-Regular", "SF Mono", Menlo, monospace',
    display: '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
  },
  typography: {
    title: { font: "display", size: "22pt", lineHeight: 1.02, weight: 400, tracking: "-0.025em", color: "ink", sample: "Jensen Huang" },
    heading: { font: "body", size: "7.3pt", lineHeight: 1.2, weight: 600, tracking: "0.16em", color: "accent", transform: "uppercase", sample: "Experience" },
    subheading: { font: "body", size: "9.5pt", lineHeight: 1.25, weight: 550, tracking: "-0.01em", color: "ink", sample: "NVIDIA" },
    body: { font: "body", size: "8.15pt", lineHeight: 1.45, weight: 400, color: "ink", sample: "Built an engineering-led computing company." },
  },
});

const RESUME_PROSE_CLASS = "openpress-prose h-full min-h-0 min-w-0";

function ResumePage({ frameKey, chainId, pageIndex, totalPages }: SectionsPageProps) {
  return (
    <Frame frameKey={frameKey} role="manuscript.content" className="reader-page--resume" data-page-index={pageIndex}>
      <div className="page-frame grid h-full min-h-[inherit] w-full grid-rows-[auto_minmax(0,1fr)_auto] bg-[var(--op-theme-color-paper)] px-[15mm] py-[13mm]">
        <header className="page-header flex items-center justify-between border-b [font-family:var(--op-theme-type-mono-font-family)] uppercase" style={{ borderColor: "var(--op-theme-color-line)", paddingBottom: "2mm", color: "var(--op-theme-color-muted)", fontSize: "6.3pt", letterSpacing: "0.14em" }}>
          <span>Jensen Huang · NVIDIA</span>
          <span className="text-[var(--op-theme-color-accent)]">Public-source profile</span>
        </header>
        <main className="page-body min-h-0" style={{ paddingBlock: "6.5mm" }}>
          <MdxArea chainId={chainId} className={RESUME_PROSE_CLASS} style={{ fontFamily: "var(--op-theme-type-body-font-family)", fontSize: "8.15pt", lineHeight: 1.45, color: "var(--op-theme-color-ink)" }} />
        </main>
        <footer className="page-footer flex items-center justify-between border-t border-[var(--op-theme-color-line)] [font-family:var(--op-theme-type-mono-font-family)] uppercase text-[var(--op-theme-color-muted)]" style={{ paddingTop: "2mm", fontSize: "6.3pt", letterSpacing: "0.12em" }}>
          <span>Executive resume</span>
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
      title="Jensen Huang — Executive Resume"
      type="pages"
      page="a4"
      theme={resumeTheme}
      sources={[mdxSource({ id: "resume", preset: "file-list", files: ["resume/chapters/01-profile.mdx"] })]}
    >
      <Sections source="resume" page={ResumePage} />
    </Press>
  );
}
