import { Frame, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, Toc } from "@open-press/core/manuscript";

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
        <span className={COVER_META_TITLE_CLASS}>OpenPress Storybook</span>
      </header>
      <div className={COVER_MAIN_CLASS}>
        <h1 id="report-title" className={COVER_TITLE_CLASS}>OpenPress Storybook</h1>
        <p className={COVER_TAGLINE_CLASS}>AI-first fixed-layout document framework</p>
        <div className={COVER_RULE_CLASS}></div>
        <p className={COVER_SUBTITLE_CLASS}>用一份公開、可部署的指南，說明 OpenPress 如何把 AI 協作、固定版面、PDF 輸出與 web reader 串成同一條文件工作流。</p>
        <p className={COVER_SUMMARY_CLASS}>這本 user story book 從使用者角度介紹 OpenPress：什麼時候該用它、如何初始化專案、如何和 agent 一起擴充內容，以及如何匯出與部署。</p>
      </div>
      <footer className={COVER_BYLINE_CLASS}>
        <span>open-press</span>
        <span>story.open-press.dev</span>
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
        <span className={COVER_META_TITLE_CLASS}>OpenPress Storybook</span>
      </header>
      <div className={BACK_COVER_MAIN_CLASS}>
        <p className={BACK_COVER_KICKER_CLASS}>open-press</p>
        <div className={COVER_RULE_CLASS}></div>
        <p className={BACK_COVER_STATEMENT_CLASS}>OpenPress 適合需要長期維護、可審查、可匯出、可部署的正式文件。它讓 AI 不只是產出一次性文字，而是進入一個可以反覆修改與交付的 workspace。</p>
        <p className={BACK_COVER_SUMMARY_CLASS}>從初始化到部署，OpenPress 的核心想法是讓 AI 產出的內容進入可維護的文件系統，而不是停在一次性的檔案。</p>
      </div>
      <footer className={COVER_BYLINE_CLASS}>
        <span>open-press</span>
        <span>open-press-story</span>
      </footer>
    </Frame>
  );
}

export default function UserStoryPress() {
  return (
    <Press
      slug="userstory"
      title="OpenPress User Story"
      page="a4"
      componentsDir="./components"
      mediaDir="./media"
      sources={[
        mdxSource({ id: "story", preset: "section-folders", root: "userstory/chapters" }),
      ]}
      captionNumbering={{ figure: "圖", table: "表" }}
    >
      <Cover />
      <Toc source="story" maxLevel={2} />
      <Sections source="story" />
      <BackCover />
    </Press>
  );
}
