import { Frame, PageFolio, Press, Text, Workspace } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, Toc } from "@open-press/core/manuscript";
import type { ReactNode } from "react";

// 1.0 contract: document metadata lives on <Press> props, operational
// settings (deploy / pdf) live in the root package.json under
// "openpress", and paths follow convention. There is no
// openpress.config.mjs.

function Cover() {
  return (
    <Frame
      frameKey="cover"
      role="manuscript.cover"
      chrome={false}
      className="reader-page--cover"
      data-page-title="封面"
      aria-labelledby="report-title"
    >
      <header className="cover-meta">
        <span className="cover-meta-title">OpenPress Storybook</span>
      </header>
      <div className="cover-main">
        <h1 id="report-title" className="cover-title">OpenPress Storybook</h1>
        <p className="cover-tagline">AI-first fixed-layout document framework</p>
        <div className="cover-rule"></div>
        <p className="cover-subtitle">用一份公開、可部署的指南，說明 OpenPress 如何把 AI 協作、固定版面、PDF 輸出與 web reader 串成同一條文件工作流。</p>
        <p className="cover-summary">這本 user story book 從使用者角度介紹 OpenPress：什麼時候該用它、如何初始化專案、如何和 agent 一起擴充內容，以及如何匯出與部署。</p>
      </div>
      <footer className="cover-byline">
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
      className="reader-page--back-cover"
      data-page-title="封底"
    >
      <header className="back-cover-meta">
        <span className="cover-meta-title">OpenPress Storybook</span>
      </header>
      <div className="back-cover-main">
        <p className="back-cover-kicker">open-press</p>
        <div className="back-cover-rule"></div>
        <p className="back-cover-statement">OpenPress 適合需要長期維護、可審查、可匯出、可部署的正式文件。它讓 AI 不只是產出一次性文字，而是進入一個可以反覆修改與交付的 workspace。</p>
        <p className="back-cover-summary">從初始化到部署，OpenPress 的核心想法是讓 AI 產出的內容進入可維護的文件系統，而不是停在一次性的檔案。</p>
      </div>
      <footer className="back-cover-byline">
        <span>open-press</span>
        <span>open-press-story</span>
      </footer>
    </Frame>
  );
}

// Minimal social Press — multiple 1080² canvas frames, no MDX source.
// Each card is authored as a source-backed Text graph so it exercises the
// same inline edit/comment path that real canvas-style outputs need.
function SocialPlaceholder() {
  return (
    <>
      <SocialFrame frameKey="card-01" variant="cover" chip="01 · hello" meta="1080 × 1080">
        <section className="social-magazine__hero">
          <Text as="p" objectId="kicker" label="Social card 01 kicker" className="social-magazine__kicker">
            OpenPress Social Kit
          </Text>
          <Text as="h1" objectId="title" label="Social card 01 title" className="social-magazine__title">
            Hello OpenPress
          </Text>
          <Text as="p" objectId="subtitle" label="Social card 01 subtitle" className="social-magazine__subtitle">
            AI 文件工作台
          </Text>
          <Text as="p" objectId="lede" label="Social card 01 lede" className="social-magazine__lede">
            把 AI 產出的內容放進固定版面，保留註解、編輯、匯出等交付流程。
          </Text>
        </section>
        <aside className="social-magazine__side-note" aria-label="OpenPress social card contract">
          <Text as="span" objectId="contract-format" label="Social card 01 format note">Square canvas</Text>
          <Text as="span" objectId="contract-source" label="Social card 01 source note">Source backed text</Text>
          <Text as="span" objectId="contract-output" label="Social card 01 output note">Image ready</Text>
        </aside>
      </SocialFrame>

      <SocialFrame frameKey="card-02" variant="model" chip="02 · model" meta="Frame first">
        <section className="social-magazine__hero">
          <Text as="p" objectId="kicker" label="Social card 02 kicker" className="social-magazine__kicker">
            Canvas Model
          </Text>
          <Text as="h1" objectId="title" label="Social card 02 title" className="social-magazine__title">
            一頁就是一個固定畫布
          </Text>
          <Text as="p" objectId="lede" label="Social card 02 lede" className="social-magazine__lede">
            Social post 不走章節流。每張卡都是一個 Frame，保留尺寸、ObjectEntity 與 export 邊界。
          </Text>
        </section>
        <div className="social-magazine__ledger">
          <article className="social-magazine__ledger-row">
            <span>01</span>
            <Text as="strong" objectId="press-label" label="Social card 02 press label">Press</Text>
            <Text as="p" objectId="press-text" label="Social card 02 press text">
              設定交付物、尺寸與輸出方式。
            </Text>
          </article>
          <article className="social-magazine__ledger-row">
            <span>02</span>
            <Text as="strong" objectId="frame-label" label="Social card 02 frame label">Frame</Text>
            <Text as="p" objectId="frame-text" label="Social card 02 frame text">
              承載一頁一個 component 的版面。
            </Text>
          </article>
          <article className="social-magazine__ledger-row">
            <span>03</span>
            <Text as="strong" objectId="object-label" label="Social card 02 object label">Object</Text>
            <Text as="p" objectId="object-text" label="Social card 02 object text">
              讓文字、媒體、元件都能被 comment。
            </Text>
          </article>
        </div>
      </SocialFrame>

      <SocialFrame frameKey="card-03" variant="workflow" chip="03 · publish" meta="openpress.social">
        <section className="social-magazine__hero">
          <Text as="p" objectId="kicker" label="Social card 03 kicker" className="social-magazine__kicker">
            Workflow
          </Text>
          <Text as="h1" objectId="title" label="Social card 03 title" className="social-magazine__title">
            寫、改、交付
          </Text>
        </section>
        <blockquote className="social-magazine__quote">
          <Text as="p" objectId="workflow-quote" label="Social card 03 quote">
            不是做完一張圖，而是建立一份可以被 agent 持續修改的 publication。
          </Text>
        </blockquote>
        <ul className="social-magazine__notes" aria-label="OpenPress workflow highlights">
          <Text as="li" objectId="workflow-note-edit" label="Social card 03 edit note">Inline edit</Text>
          <Text as="li" objectId="workflow-note-comment" label="Social card 03 comment note">Comment thread</Text>
          <Text as="li" objectId="workflow-note-export" label="Social card 03 export note">Image / PDF export</Text>
        </ul>
      </SocialFrame>
    </>
  );
}

function SocialFrame({
  frameKey,
  variant,
  chip,
  meta,
  children,
}: {
  frameKey: string;
  variant: "cover" | "model" | "workflow";
  chip: string;
  meta: string;
  children: ReactNode;
}) {
  return (
    <Frame
      frameKey={frameKey}
      role="canvas.card"
      chrome={false}
      className="reader-page--social-test"
      data-page-title={chip}
    >
      <div className={`social-magazine social-magazine--${variant}`}>
        <div className="social-magazine__grain" aria-hidden="true" />
        {variant === "cover" ? <div className="social-magazine__cover-art" aria-hidden="true" /> : null}
        <header className="social-magazine__header">
          <span className="social-magazine__issue">OpenPress</span>
          <span className="social-magazine__dot" aria-hidden="true" />
          <span>{meta}</span>
        </header>
        <main className="social-magazine__content">
          {children}
        </main>
        <footer className="social-magazine__footer">
          <span>{chip}</span>
          <span>hello.openpress</span>
        </footer>
      </div>
    </Frame>
  );
}

// Minimal slide Press — multiple 16:9 hero slides, no MDX source.
function SlidePlaceholder() {
  return (
    <>
      <SlideFrame frameKey="slide-01" variant="title" chip="01 · cover">
        <section className="canvas-test__body">
          <Text as="p" objectId="eyebrow" label="Slide 01 eyebrow" className="canvas-test__eyebrow">
            OpenPress Canvas Deck
          </Text>
          <Text as="h1" objectId="title" label="Slide 01 title" className="canvas-test__title">
            Hello Open Press
          </Text>
          <Text as="p" objectId="lede" label="Slide 01 lede" className="canvas-test__lede">
            用幾張基礎簡報頁測試：固定尺寸、可縮放、可註解、可匯出。
          </Text>
        </section>
        <aside className="canvas-test__notes">
          <Text as="span" objectId="note-size" label="Slide 01 size note">1920 × 1080</Text>
          <Text as="span" objectId="note-frame" label="Slide 01 frame note">Frame-first</Text>
          <Text as="span" objectId="note-mdx" label="Slide 01 MDX note">No MDX required</Text>
        </aside>
      </SlideFrame>

      <SlideFrame frameKey="slide-02" variant="agenda" chip="02 · agenda">
        <section className="canvas-test__body">
          <Text as="p" objectId="eyebrow" label="Slide 02 eyebrow" className="canvas-test__eyebrow">
            Agenda
          </Text>
          <Text as="h1" objectId="title" label="Slide 02 title" className="canvas-test__title">
            今天先看三件事
          </Text>
        </section>
        <ol className="canvas-test__agenda">
          <li>
            <span>01</span>
            <Text as="strong" objectId="agenda-01" label="Slide 02 agenda item 1">
              Press 可以同時承載 document / social / slide
            </Text>
          </li>
          <li>
            <span>02</span>
            <Text as="strong" objectId="agenda-02" label="Slide 02 agenda item 2">
              Canvas 類型以一頁一個 Frame 為核心
            </Text>
          </li>
          <li>
            <span>03</span>
            <Text as="strong" objectId="agenda-03" label="Slide 02 agenda item 3">
              Viewer 只做 scale，不重新排版內容
            </Text>
          </li>
        </ol>
      </SlideFrame>

      <SlideFrame frameKey="slide-03" variant="cards" chip="03 · model">
        <section className="canvas-test__body">
          <Text as="p" objectId="eyebrow" label="Slide 03 eyebrow" className="canvas-test__eyebrow">
            Kernel model
          </Text>
          <Text as="h1" objectId="title" label="Slide 03 title" className="canvas-test__title">
            一頁就是一個可追蹤物件
          </Text>
        </section>
        <div className="canvas-test__cards">
          <article>
            <Text as="span" objectId="card-frame-label" label="Slide 03 card frame label">Frame</Text>
            <Text as="p" objectId="card-frame-text" label="Slide 03 card frame text">
              固定大小、角色、chrome 與 page metadata。
            </Text>
          </article>
          <article>
            <Text as="span" objectId="card-object-label" label="Slide 03 card object label">ObjectEntity</Text>
            <Text as="p" objectId="card-object-text" label="Slide 03 card object text">
              提供 comment / edit / inspector 的共同錨點。
            </Text>
          </article>
          <article>
            <Text as="span" objectId="card-export-label" label="Slide 03 card export label">Export</Text>
            <Text as="p" objectId="card-export-text" label="Slide 03 card export text">
              同一份頁面可進 reader、image、PDF 與 deploy。
            </Text>
          </article>
        </div>
      </SlideFrame>

      <SlideFrame frameKey="slide-04" variant="timeline" chip="04 · workflow">
        <section className="canvas-test__body">
          <Text as="p" objectId="eyebrow" label="Slide 04 eyebrow" className="canvas-test__eyebrow">
            Authoring flow
          </Text>
          <Text as="h1" objectId="title" label="Slide 04 title" className="canvas-test__title">
            從草稿到輸出
          </Text>
        </section>
        <ol className="canvas-test__timeline">
          <li>
            <span>01</span>
            <Text as="p" objectId="step-01" label="Slide 04 step 1">建立 Press 與 page size</Text>
          </li>
          <li>
            <span>02</span>
            <Text as="p" objectId="step-02" label="Slide 04 step 2">用 Frame 組出每一頁</Text>
          </li>
          <li>
            <span>03</span>
            <Text as="p" objectId="step-03" label="Slide 04 step 3">在 viewer 內 comment / edit</Text>
          </li>
          <li>
            <span>04</span>
            <Text as="p" objectId="step-04" label="Slide 04 step 4">匯出 PDF 或圖片</Text>
          </li>
        </ol>
      </SlideFrame>

      <SlideFrame frameKey="slide-05" variant="closing" chip="05 · next">
        <section className="canvas-test__body">
          <Text as="p" objectId="eyebrow" label="Slide 05 eyebrow" className="canvas-test__eyebrow">
            Next
          </Text>
          <Text as="h1" objectId="title" label="Slide 05 title" className="canvas-test__title">
            下一步：抽出可重用基礎元件
          </Text>
          <Text as="p" objectId="lede" label="Slide 05 lede" className="canvas-test__lede">
            Text / Media / Frame 不決定視覺風格，只提供可編輯、可註解、可輸出的底層能力。
          </Text>
        </section>
        <aside className="canvas-test__notes">
          <Text as="span" objectId="note-text" label="Slide 05 text note">Text object</Text>
          <Text as="span" objectId="note-media" label="Slide 05 media note">Media object</Text>
          <Text as="span" objectId="note-frame" label="Slide 05 frame note">Nested Frame</Text>
        </aside>
      </SlideFrame>
    </>
  );
}

function SlideFrame({
  frameKey,
  variant,
  chip,
  children,
}: {
  frameKey: string;
  variant: "title" | "agenda" | "cards" | "timeline" | "closing";
  chip: string;
  children: ReactNode;
}) {
  return (
    <Frame
      frameKey={frameKey}
      role="canvas.slide"
      chrome={false}
      className="reader-page--slide-test"
      data-page-title={chip}
    >
      <div className={`canvas-test canvas-test--slide canvas-test--slide-${variant}`}>
        <div className="canvas-test__grid" aria-hidden="true" />
        <header className="canvas-test__header">
          <span className="canvas-test__mark">◐</span>
          <span className="canvas-test__brand">open-press</span>
        </header>
        <main className="canvas-test__slide-layout">
          {children}
        </main>
        <footer className="canvas-test__footer">
          <span className="canvas-test__chip">{chip}</span>
          <PageFolio variant="slash" currentFormat="2-digit" totalFormat="2-digit" className="canvas-test__folio" />
        </footer>
      </div>
    </Frame>
  );
}

export default function OpenPressStorybook() {
  return (
    <Workspace name="OpenPress Storybook">
      <Press
        slug="userstory"
        title="OpenPress User Story"
        page="a4"
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

      <Press slug="social" title="Hello, social" page="social-square">
        <SocialPlaceholder />
      </Press>

      <Press slug="slide" title="Hello, slide" type="slides" page="slide-16-9">
        <SlidePlaceholder />
      </Press>
    </Workspace>
  );
}
