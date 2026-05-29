import { Frame, Press, Workspace } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, Toc } from "@open-press/core/manuscript";

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

const socialFixturePages = [
  {
    frameKey: "card-01",
    variant: "cover",
    title: "Hello\nOpenPress",
    eyebrow: "Editorial card set",
    subtitle: "AI 文件工作台",
    lede: "把 AI 產出的內容放進固定版面、可註解、可編輯、可匯出的 publishing workflow。",
    chip: "01 · hello",
    meta: "1080 × 1080",
  },
  {
    frameKey: "card-02",
    variant: "ledger",
    title: "一頁就是\n一個固定畫布",
    eyebrow: "Frame-first",
    lede: "Social post 不需要章節模型。每張卡都是一個 Frame，保留尺寸、ObjectEntity 與 export 邊界。",
    rows: [
      { label: "Press", text: "設定交付物、尺寸與輸出方式" },
      { label: "Frame", text: "承載一頁一個 component 的版面" },
      { label: "Object", text: "讓文字、媒體、元件能被 comment" },
    ],
    chip: "02 · model",
    meta: "Frame only",
  },
  {
    frameKey: "card-03",
    variant: "quote",
    title: "寫、改、\n交付",
    eyebrow: "Workflow",
    quote: "不是做完一張圖，而是建立一份可以被 agent 持續修改的 publication。",
    notes: ["Inline edit", "Comment thread", "Image / PDF export"],
    chip: "03 · publish",
    meta: "openpress.social",
  },
];

const slideFixturePages = [
  {
    frameKey: "slide-01",
    variant: "title",
    eyebrow: "OpenPress Canvas Deck",
    title: "固定畫布\n簡報工作流",
    lede: "用幾張基礎簡報頁測試：固定尺寸、可縮放、可註解、可匯出。",
    notes: ["1920 × 1080", "Frame-first", "No MDX required"],
    chip: "01 · cover",
  },
  {
    frameKey: "slide-02",
    variant: "agenda",
    eyebrow: "Agenda",
    title: "今天先看三件事",
    items: [
      "Press 可以同時承載 document / social / slide",
      "Canvas 類型以一頁一個 Frame 為核心",
      "Viewer 只做 scale, 不重新排版內容",
    ],
    chip: "02 · agenda",
  },
  {
    frameKey: "slide-03",
    variant: "cards",
    eyebrow: "Kernel model",
    title: "一頁就是一個可追蹤物件",
    cards: [
      { label: "Frame", text: "固定大小、角色、chrome 與 page metadata。" },
      { label: "ObjectEntity", text: "提供 comment / edit / inspector 的共同錨點。" },
      { label: "Export", text: "同一份頁面可進 reader、image、PDF 與 deploy。" },
    ],
    chip: "03 · model",
  },
  {
    frameKey: "slide-04",
    variant: "timeline",
    eyebrow: "Authoring flow",
    title: "從草稿到輸出",
    steps: [
      { number: "01", text: "建立 Press 與 page size" },
      { number: "02", text: "用 Frame 組出每一頁" },
      { number: "03", text: "在 viewer 內 comment / edit" },
      { number: "04", text: "匯出 PDF 或圖片" },
    ],
    chip: "04 · workflow",
  },
  {
    frameKey: "slide-05",
    variant: "closing",
    eyebrow: "Next",
    title: "下一步：抽出可重用基礎元件",
    lede: "Text / Media / Frame 不決定視覺風格，只提供可編輯、可註解、可輸出的底層能力。",
    notes: ["Text object", "Media object", "Nested Frame"],
    chip: "05 · next",
  },
];

function CanvasTitle({ children }: { children: string }) {
  const lines = children.split("\n");
  return (
    <>
      {lines.map((line, index) => (
        <span key={`${line}-${index}`}>
          {line}
          {index < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </>
  );
}

// Minimal social-post Press — multiple 1080² canvas frames, no MDX source.
// Exists in the dogfood to exercise multi-Press export + the workspace
// gallery; a real social Press would have its own chapters/ and theme.
function SocialPlaceholder() {
  return (
    <>
      {socialFixturePages.map((page) => (
        <Frame
          key={page.frameKey}
          frameKey={page.frameKey}
          role="canvas.card"
          chrome={false}
          className="reader-page--social-test"
          data-page-title={page.chip}
        >
          <SocialCanvas page={page} />
        </Frame>
      ))}
    </>
  );
}

function SocialCanvas({ page }: { page: (typeof socialFixturePages)[number] }) {
  return (
    <div className={`social-magazine social-magazine--${page.variant}`}>
      <div className="social-magazine__grain" aria-hidden="true" />
      <div className="social-magazine__wash" aria-hidden="true" />
      <header className="social-magazine__header">
        <span className="social-magazine__issue">OpenPress</span>
        <span className="social-magazine__dot" aria-hidden="true" />
        <span>{page.meta}</span>
      </header>
      <main className="social-magazine__content">
        <section className="social-magazine__hero">
          <p className="social-magazine__kicker">{page.eyebrow}</p>
          <h1 className="social-magazine__title"><CanvasTitle>{page.title}</CanvasTitle></h1>
          {"subtitle" in page ? <p className="social-magazine__subtitle">{page.subtitle}</p> : null}
          {"lede" in page ? <p className="social-magazine__lede">{page.lede}</p> : null}
        </section>
        {"rows" in page ? (
          <div className="social-magazine__ledger">
            {page.rows.map((row, index) => (
              <article key={row.label} className="social-magazine__ledger-row">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{row.label}</strong>
                <p>{row.text}</p>
              </article>
            ))}
          </div>
        ) : null}
        {"quote" in page ? (
          <blockquote className="social-magazine__quote">
            <p>{page.quote}</p>
          </blockquote>
        ) : null}
        {"notes" in page ? (
          <ul className="social-magazine__notes" aria-label="OpenPress workflow highlights">
            {page.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        ) : null}
      </main>
      <footer className="social-magazine__footer">
        <span>{page.chip}</span>
        <span>hello.openpress</span>
      </footer>
    </div>
  );
}

// Minimal slide Press — multiple 16:9 hero slides, no MDX source.
function SlidePlaceholder() {
  return (
    <>
      {slideFixturePages.map((page) => (
        <Frame
          key={page.frameKey}
          frameKey={page.frameKey}
          role="canvas.slide"
          chrome={false}
          className="reader-page--slide-test"
          data-page-title={page.chip}
        >
          <SlideCanvas page={page} />
        </Frame>
      ))}
    </>
  );
}

function SlideCanvas({ page }: { page: (typeof slideFixturePages)[number] }) {
  return (
    <div className={`canvas-test canvas-test--slide canvas-test--slide-${page.variant}`}>
      <div className="canvas-test__grid" aria-hidden="true" />
      <header className="canvas-test__header">
        <span className="canvas-test__mark">◐</span>
        <span className="canvas-test__brand">open-press</span>
      </header>
      <main className="canvas-test__slide-layout">
        <section className="canvas-test__body">
          <p className="canvas-test__eyebrow">{page.eyebrow}</p>
          <h1 className="canvas-test__title"><CanvasTitle>{page.title}</CanvasTitle></h1>
          {"lede" in page ? <p className="canvas-test__lede">{page.lede}</p> : null}
        </section>
        {"items" in page ? (
          <ol className="canvas-test__agenda">
            {page.items.map((item, index) => (
              <li key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item}</strong>
              </li>
            ))}
          </ol>
        ) : null}
        {"cards" in page ? (
          <div className="canvas-test__cards">
            {page.cards.map((card) => (
              <article key={card.label}>
                <span>{card.label}</span>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        ) : null}
        {"steps" in page ? (
          <ol className="canvas-test__timeline">
            {page.steps.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        ) : null}
        {"notes" in page ? (
          <aside className="canvas-test__notes">
            {page.notes.map((note) => <span key={note}>{note}</span>)}
          </aside>
        ) : null}
      </main>
      <footer className="canvas-test__footer">
        <span className="canvas-test__chip">{page.chip}</span>
        <span className="canvas-test__path"><code>slide-16-9</code></span>
      </footer>
    </div>
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

      <Press slug="slide" title="Hello, slide" page="slide-16-9">
        <SlidePlaceholder />
      </Press>
    </Workspace>
  );
}
