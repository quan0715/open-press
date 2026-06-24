import { Frame, MdxArea, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, Toc } from "@open-press/core/manuscript";
import type { SectionsPageProps, TocPageProps } from "@open-press/core/manuscript";
import { defineDocumentTheme } from "@open-press/core/theme";

const userStoryTheme = defineDocumentTheme({
  name: "OpenPress Documentation",
  description: "A4 document theme for the OpenPress framework documentation.",
  colors: {
    bg: "#161616",
    paper: "#ffffff",
    surface: "#ffffff",
    surfaceMuted: "#f4f4f4",
    ink: "#161616",
    muted: "#6f6f6f",
    line: "#e0e0e0",
    accent: "#c9522b",
    link: "#161616",
    quote: "#4a6b8a",
    marker: "#c9522b",
    annotation: "#ffb000",
  },
  fonts: {
    body: '"UserStory Sans Latin", "PingFang TC", "Noto Sans TC", "Hiragino Sans", "Microsoft JhengHei", sans-serif',
    serif: '"Noto Serif TC", "Songti TC", "Source Han Serif TC", "PMingLiU", serif',
    mono: '"SFMono-Regular", "Menlo", "Consolas", monospace',
    display: '"Noto Serif TC", "Songti TC", "Source Han Serif TC", "PMingLiU", serif',
  },
  typography: {
    title: { font: "display", size: "clamp(36px, 8.5cqw, 64px)", lineHeight: 1, weight: 300, tracking: "0.01em", color: "ink", sample: "OpenPress Storybook" },
    heading: { font: "serif", size: "clamp(5.7pt, 3.4cqw, 17pt)", lineHeight: 1.45, weight: 300, tracking: "0.04em", color: "ink", sample: "文件如何進入可維護的工作流" },
    subheading: { font: "serif", size: "clamp(4.8pt, 2.4cqw, 13pt)", lineHeight: 1.55, weight: 400, tracking: "0.03em", color: "ink", sample: "章節內的小標" },
    body: { font: "body", size: "clamp(4.2pt, 1.85cqw, 10.5pt)", lineHeight: 1.85, weight: 400, color: "ink", sample: "OpenPress 把 AI 協作、固定版面與輸出流程放在同一個 workspace。" },
    bodyStrong: { font: "body", size: "clamp(4.2pt, 1.85cqw, 10.5pt)", lineHeight: 1.85, weight: 600, color: "ink", sample: "重要的文件邊界" },
    caption: { font: "body", size: "clamp(3.8pt, 1.45cqw, 8.5pt)", lineHeight: 1.5, weight: 400, tracking: "0.02em", color: "muted", sample: "圖 1 文件工作流" },
    footnote: { font: "body", size: "8pt", lineHeight: 1.35, weight: 400, color: "muted", sample: "來源由使用者提供。" },
    pageNumber: { font: "mono", size: "8pt", lineHeight: 1, weight: 600, tracking: "0.14em", color: "muted", sample: "01" },
    eyebrow: { font: "body", size: "8pt", lineHeight: 1, weight: 600, tracking: "0.12em", color: "muted", transform: "uppercase", sample: "OpenPress Storybook" },
    marker: { font: "mono", size: "8pt", lineHeight: 1, weight: 700, color: "marker", sample: "01" },
    mono: { font: "mono", size: "clamp(3.5pt, 1.45cqw, 8.5pt)", lineHeight: 1.55, weight: 400, color: "ink", sample: "npm run build" },
  },
  extend: {
    typography: {
      sectionHeading: { font: "body", size: "clamp(4.4pt, 1.9cqw, 11pt)", lineHeight: 1.45, weight: 500, tracking: "0.04em", color: "muted", sample: "段落標題" },
      table: { font: "body", size: "clamp(3.5pt, 1.55cqw, 9pt)", lineHeight: 1.45, weight: 400, color: "ink", sample: "表格內容" },
      code: { font: "mono", size: "clamp(3.5pt, 1.45cqw, 8.5pt)", lineHeight: 1.55, weight: 400, color: "ink", sample: "<MdxArea />" },
    },
  },
});

const COVER_FRAME_CLASS = "reader-page--cover !flex flex-col justify-between gap-[clamp(16px,2.5cqw,24px)] bg-[var(--openpress-color-document)] px-[clamp(24px,4.5cqw,42px)] py-[clamp(28px,5cqw,48px)]";
const BACK_COVER_FRAME_CLASS = "reader-page--back-cover !flex flex-col justify-between gap-[clamp(16px,2.5cqw,24px)] bg-[var(--openpress-color-document)] px-[clamp(24px,4.5cqw,42px)] py-[clamp(28px,5cqw,48px)]";
const COVER_META_CLASS = "cover-meta flex shrink-0 items-start justify-between gap-[var(--openpress-space-3)] border-b border-[var(--openpress-color-ink)] pb-[var(--openpress-space-2)] [font-family:var(--openpress-font-body)] !text-[clamp(8pt,1.25cqw,9.5pt)] !tracking-[0.12em] !text-[var(--openpress-color-muted)]";
const COVER_META_TITLE_CLASS = "cover-meta-title ml-auto max-w-[48%] whitespace-nowrap pt-[0.35em] text-right";
const COVER_MAIN_CLASS = "cover-main flex min-h-0 flex-1 flex-col";
const COVER_TITLE_CLASS = "cover-title !m-0 [font-family:var(--openpress-font-serif)] !text-[clamp(36px,8.5cqw,64px)] !font-light !leading-none !tracking-[0.01em] !text-[var(--openpress-color-ink)]";
const COVER_TAGLINE_CLASS = "cover-tagline mt-[var(--openpress-space-2)] !mb-0 [font-family:var(--openpress-font-serif)] !text-[clamp(14px,2.4cqw,20px)] !font-light !tracking-[0.08em] !text-[var(--openpress-color-muted)]";
const COVER_RULE_CLASS = "cover-rule my-[var(--openpress-space-3)] h-px w-10 bg-[var(--openpress-color-ink)]";
const COVER_SUBTITLE_CLASS = "cover-subtitle !m-0 [font-family:var(--openpress-font-body)] !text-[clamp(10.5pt,1.85cqw,12.5pt)] !font-normal !leading-[1.55] !tracking-[0.02em] !text-[var(--openpress-color-ink)]";
const COVER_SUMMARY_CLASS = "cover-summary mt-[var(--openpress-space-2)] !mb-0 max-w-[90%] [font-family:var(--openpress-font-body)] !text-[clamp(9pt,1.65cqw,10pt)] !leading-[1.8] !text-[var(--openpress-color-muted)]";
const COVER_BYLINE_CLASS = "cover-byline flex shrink-0 items-baseline justify-between border-t border-[var(--openpress-color-ink)] pt-[var(--openpress-space-2)] [font-family:var(--openpress-font-body)] !text-[clamp(8pt,1.25cqw,9.5pt)] !tracking-[0.12em] !text-[var(--openpress-color-muted)] [&>span:first-child]:[font-family:var(--openpress-font-serif)] [&>span:first-child]:!font-normal [&>span:first-child]:!tracking-[0.04em] [&>span:first-child]:!text-[var(--openpress-color-ink)]";
const BACK_COVER_MAIN_CLASS = "back-cover-main flex min-h-0 flex-1 flex-col justify-center";
const BACK_COVER_KICKER_CLASS = "back-cover-kicker !m-0 [font-family:var(--openpress-font-serif)] !text-[clamp(30px,6.8cqw,54px)] !font-light !leading-none !tracking-[0.01em] !text-[var(--openpress-color-ink)]";
const BACK_COVER_STATEMENT_CLASS = "back-cover-statement !m-0 max-w-[84%] [font-family:var(--openpress-font-body)] !text-[clamp(11.5pt,2.05cqw,14pt)] !font-normal !leading-[1.6] !tracking-[0.02em] !text-[var(--openpress-color-ink)]";
const BACK_COVER_SUMMARY_CLASS = "back-cover-summary mt-[var(--openpress-space-2)] !mb-0 max-w-[90%] [font-family:var(--openpress-font-body)] !text-[clamp(9pt,1.65cqw,10pt)] !leading-[1.8] !text-[var(--openpress-color-muted)]";
const USERSTORY_PAGE_FRAME_CLASS = "page-frame grid h-full min-h-[inherit] w-full grid-rows-[var(--page-header-height)_minmax(0,1fr)_var(--page-footer-height)] gap-y-[var(--page-frame-gap)] bg-[var(--openpress-color-document)] px-[var(--page-margin-x)] pb-[var(--page-margin-bottom)] pt-[var(--page-margin-top)]";
const USERSTORY_TOC_PAGE_FRAME_CLASS = "page-frame grid h-full min-h-[inherit] w-full [grid-template-rows:auto_minmax(0,1fr)] gap-y-[var(--page-frame-gap)] bg-[var(--openpress-color-document)] px-[var(--page-margin-x)] pb-[var(--page-margin-bottom)] pt-[var(--page-margin-top)]";
const USERSTORY_PAGE_HEADER_CLASS = "page-header pointer-events-none flex min-w-0 items-start overflow-hidden text-[clamp(7pt,1.2cqw,8pt)] tracking-[0.1em] text-[var(--openpress-color-muted)] opacity-[0.62]";
const USERSTORY_TOC_HEADER_CLASS = "page-header toc-header pointer-events-none block min-w-0 overflow-visible text-[clamp(7pt,1.2cqw,8pt)] tracking-[0.1em] text-[var(--openpress-color-muted)] opacity-100";
const USERSTORY_PAGE_BODY_CLASS = "page-body min-h-0 min-w-0 overflow-visible";
const USERSTORY_MDX_PROSE_CLASS = "openpress-prose userstory-prose";
const USERSTORY_PAGE_FOOTER_CLASS = "page-footer pointer-events-none flex min-w-0 items-baseline justify-between gap-3 overflow-hidden text-[clamp(7pt,1.25cqw,8pt)] tracking-[0.1em] text-[var(--openpress-color-muted)] opacity-70";
const USERSTORY_FOOTER_LEFT_CLASS = "footer-left min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap";
const USERSTORY_FOOTER_RIGHT_CLASS = "footer-right shrink-0 tracking-[0.14em] [font-variant-numeric:tabular-nums]";
const USERSTORY_TOC_HEADING_CLASS = "toc-heading !m-0 !border-b-0 !p-0 !pb-0 [font-family:var(--openpress-font-serif)] !text-[clamp(15pt,3.6cqw,18pt)] !font-light !tracking-[0.12em]";
const USERSTORY_TOC_HEADING_CONTINUATION_CLASS = `${USERSTORY_TOC_HEADING_CLASS} toc-heading--continuation hidden`;
const USERSTORY_TOC_AREA_CLASS = "openpress-toc-area h-full";
const USERSTORY_TOC_LIST_CLASS = "toc-list m-0 flex list-none flex-col gap-[0.45mm] p-0 pt-[8mm] [&_a]:grid [&_a]:grid-cols-[10mm_1fr_14mm] [&_a]:items-baseline [&_a]:gap-[4mm]";

function Cover() {
  return (
    <Frame
      frameKey="cover"
      role="manuscript.cover"
      chrome={false}
      className={COVER_FRAME_CLASS}
      data-page-title="封面"
      aria-labelledby="report-title"
    >
      <header className={COVER_META_CLASS}>
        <span className={COVER_META_TITLE_CLASS}>OpenPress 文件</span>
      </header>
      <div className={COVER_MAIN_CLASS}>
        <h1 id="report-title" className={COVER_TITLE_CLASS}>OpenPress 文件</h1>
        <p className={COVER_TAGLINE_CLASS}>AI-first fixed-layout document framework</p>
        <div className={COVER_RULE_CLASS}></div>
        <p className={COVER_SUBTITLE_CLASS}>OpenPress 是一個以 Agent-First 哲學為核心的固定版面文件框架。本文件涵蓋從快速開始、核心概念、Workbench 操作，到 CLI 參考與部署的完整說明。</p>
        <p className={COVER_SUMMARY_CLASS}>內容來自 open-press.dev 官方網站與框架文件，作為 dogfood workspace 的真實文件範例。</p>
      </div>
      <footer className={COVER_BYLINE_CLASS}>
        <span>open-press</span>
        <span>open-press.dev</span>
      </footer>
    </Frame>
  );
}

function BackCover() {
  return (
    <Frame
      frameKey="back-cover"
      role="manuscript.back-cover"
      chrome={false}
      className={BACK_COVER_FRAME_CLASS}
      data-page-title="封底"
    >
      <header className={COVER_META_CLASS}>
        <span className={COVER_META_TITLE_CLASS}>OpenPress 文件</span>
      </header>
      <div className={BACK_COVER_MAIN_CLASS}>
        <p className={BACK_COVER_KICKER_CLASS}>open-press</p>
        <div className={COVER_RULE_CLASS}></div>
        <p className={BACK_COVER_STATEMENT_CLASS}>創意 skill 決定要做什麼；OpenPress 負責 workbench、行內編輯、評論標記、渲染、PDF/圖片/Word 匯出，以及部署流程。</p>
        <p className={BACK_COVER_SUMMARY_CLASS}>從快速開始到 Cloudflare Pages 部署，OpenPress 讓 AI 產出的內容進入可版本化、可審查、可長期維護的文件工作流。</p>
      </div>
      <footer className={COVER_BYLINE_CLASS}>
        <span>open-press</span>
        <span>open-press.dev</span>
      </footer>
    </Frame>
  );
}

function UserStoryTocPage({ frameKey, chainId, pageIndex, heading, className, maxLevel, overflow }: TocPageProps) {
  const isContinuation = pageIndex > 0;
  const tocClassName = ["reader-page--toc", isContinuation ? "toc-continuation" : null, className].filter(Boolean).join(" ") || undefined;

  return (
    <Frame
      frameKey={frameKey}
      role="manuscript.toc"
      chrome={false}
      className={tocClassName}
    >
      <div className={USERSTORY_TOC_PAGE_FRAME_CLASS}>
        <header className={USERSTORY_TOC_HEADER_CLASS}>
          {heading ?? (
            <h2 className={isContinuation ? USERSTORY_TOC_HEADING_CONTINUATION_CLASS : USERSTORY_TOC_HEADING_CLASS} id={isContinuation ? `${frameKey}-title` : "toc-title"}>
              {isContinuation ? "目錄續" : "目錄"}
            </h2>
          )}
        </header>
        <main className={USERSTORY_PAGE_BODY_CLASS}>
          <MdxArea
            as="ol"
            chainId={chainId}
            className={[USERSTORY_TOC_AREA_CLASS, USERSTORY_TOC_LIST_CLASS, isContinuation ? "pt-[3mm]" : null].filter(Boolean).join(" ") || undefined}
            data-openpress-toc-max-level={maxLevel}
            overflow={overflow}
          />
        </main>
      </div>
    </Frame>
  );
}

function UserStorySectionPage({
  frameKey,
  chainId,
  pageIndex,
  totalPages,
  sectionSlug,
  sectionTitle,
  sectionTone,
}: SectionsPageProps) {
  return (
    <Frame
      frameKey={frameKey}
      role="manuscript.content"
      className="reader-page--content"
      data-page-index={pageIndex}
      data-total-pages={totalPages}
      data-section-id={sectionSlug}
      data-chapter-tone={sectionTone}
    >
      <div className={USERSTORY_PAGE_FRAME_CLASS}>
        <header className={USERSTORY_PAGE_HEADER_CLASS} aria-hidden="true" />
        <main className={USERSTORY_PAGE_BODY_CLASS}>
          <MdxArea chainId={chainId} className={USERSTORY_MDX_PROSE_CLASS} />
        </main>
        <footer className={USERSTORY_PAGE_FOOTER_CLASS} aria-hidden="true">
          <span className={USERSTORY_FOOTER_LEFT_CLASS}>{sectionTitle}</span>
          <span className={USERSTORY_FOOTER_RIGHT_CLASS}>
            {totalPages > 1 ? `${pageIndex + 1}/${totalPages}` : pageIndex + 1}
          </span>
        </footer>
      </div>
    </Frame>
  );
}

export default function UserStoryPress() {
  return (
    <Press
      slug="userstory"
      title="OpenPress 文件"
      page="a4"
      theme={userStoryTheme}
      componentsDir="./components"
      mediaDir="./media"
      sources={[
        mdxSource({ id: "story", preset: "section-folders", root: "userstory/chapters" }),
      ]}
      captionNumbering={{ figure: "圖", table: "表" }}
    >
      <Cover />
      <Toc source="story" maxLevel={2} page={UserStoryTocPage} />
      <Sections source="story" page={UserStorySectionPage} />
      <BackCover />
    </Press>
  );
}
