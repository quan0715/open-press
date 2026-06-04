import { Press, Text } from "@open-press/core";
import { DeckSlide } from "./components/DeckSlide";

function SlidePlaceholder() {
  return (
    <>
      <DeckSlide id="cover" variant="cover">
        <section className="cover-layout">
          <div className="cover-copy">
            <Text as="p" objectId="eyebrow" label="Slide 01 eyebrow" className="kicker">
              OpenPress Canvas Deck
            </Text>
            <Text as="h1" objectId="title" label="Slide 01 title">
              Hello OpenPress
            </Text>
            <Text as="p" objectId="lede" label="Slide 01 lede" className="cover-lede">
              用幾張基礎簡報頁測試：固定尺寸、可縮放、可註解、可匯出。
            </Text>
          </div>
          <figure className="cover-photo-panel">
            <img
              src="/openpress/media/openpress-hero-art.png"
              alt="Abstract editorial illustration of flowing pages and a stacked document"
            />
            <figcaption>Source to artifact</figcaption>
          </figure>
        </section>
      </DeckSlide>

      <DeckSlide id="agenda" variant="agenda">
        <section className="agenda-layout">
          <div>
            <Text as="p" objectId="eyebrow" label="Slide 02 eyebrow" className="kicker">
              Agenda
            </Text>
            <Text as="h2" objectId="title" label="Slide 02 title">
              今天先看三件事
            </Text>
          </div>
          <ol className="agenda-list">
            <li>
              <span className="agenda-number">01</span>
              <div>
                <Text as="h3" objectId="agenda-01-title" label="Slide 02 agenda item 1 title">
                  Press 可以同時承載 document / social / slide
                </Text>
                <Text as="p" objectId="agenda-01-note" label="Slide 02 agenda item 1 note">
                  同一個 workspace 內保留不同 artifact 的來源邊界。
                </Text>
              </div>
            </li>
            <li>
              <span className="agenda-number">02</span>
              <div>
                <Text as="h3" objectId="agenda-02-title" label="Slide 02 agenda item 2 title">
                  Canvas 類型以一頁一個 Frame 為核心
                </Text>
                <Text as="p" objectId="agenda-02-note" label="Slide 02 agenda item 2 note">
                  每頁都能穩定對應 inspector、comment 與輸出。
                </Text>
              </div>
            </li>
            <li>
              <span className="agenda-number">03</span>
              <div>
                <Text as="h3" objectId="agenda-03-title" label="Slide 02 agenda item 3 title">
                  Viewer 只做 scale，不重新排版內容
                </Text>
                <Text as="p" objectId="agenda-03-note" label="Slide 02 agenda item 3 note">
                  版面責任留在 source 與 export pipeline。
                </Text>
              </div>
            </li>
          </ol>
        </section>
      </DeckSlide>

      <DeckSlide id="kernel-model" variant="content">
        <section className="content-layout">
          <div className="content-heading">
            <Text as="p" objectId="eyebrow" label="Slide 03 eyebrow" className="kicker">
              Kernel model
            </Text>
            <Text as="h2" objectId="title" label="Slide 03 title">
              一頁就是一個可追蹤物件
            </Text>
          </div>
          <div className="content-grid">
            <article className="content-card">
              <Text as="span" objectId="card-frame-label" label="Slide 03 card frame label">Frame</Text>
              <Text as="h3" objectId="card-frame-title" label="Slide 03 card frame title">
                固定頁面
              </Text>
              <Text as="p" objectId="card-frame-text" label="Slide 03 card frame text">
                固定大小、角色、chrome 與 page metadata。
              </Text>
            </article>
            <article className="content-card">
              <Text as="span" objectId="card-object-label" label="Slide 03 card object label">ObjectEntity</Text>
              <Text as="h3" objectId="card-object-title" label="Slide 03 card object title">
                共同錨點
              </Text>
              <Text as="p" objectId="card-object-text" label="Slide 03 card object text">
                提供 comment / edit / inspector 的定位能力。
              </Text>
            </article>
            <article className="content-card">
              <Text as="span" objectId="card-export-label" label="Slide 03 card export label">Export</Text>
              <Text as="h3" objectId="card-export-title" label="Slide 03 card export title">
                一次輸出
              </Text>
              <Text as="p" objectId="card-export-text" label="Slide 03 card export text">
                同一份頁面可進 reader、image、PDF 與 deploy。
              </Text>
            </article>
          </div>
        </section>
      </DeckSlide>

      <DeckSlide id="authoring-flow" variant="process">
        <section className="process-layout">
          <div className="process-heading">
            <Text as="p" objectId="eyebrow" label="Slide 04 eyebrow" className="kicker">
              Authoring flow
            </Text>
            <Text as="h2" objectId="title" label="Slide 04 title">
              從草稿到輸出
            </Text>
          </div>
          <div className="process-map">
            <article className="process-step">
              <Text as="span" objectId="step-01-number" label="Slide 04 step 1 number">01</Text>
              <Text as="h3" objectId="step-01-title" label="Slide 04 step 1 title">Press setup</Text>
              <Text as="p" objectId="step-01" label="Slide 04 step 1">建立 Press 與 page size。</Text>
            </article>
            <article className="process-step">
              <Text as="span" objectId="step-02-number" label="Slide 04 step 2 number">02</Text>
              <Text as="h3" objectId="step-02-title" label="Slide 04 step 2 title">Frame tree</Text>
              <Text as="p" objectId="step-02" label="Slide 04 step 2">用 Frame 組出每一頁。</Text>
            </article>
            <article className="process-step">
              <Text as="span" objectId="step-03-number" label="Slide 04 step 3 number">03</Text>
              <Text as="h3" objectId="step-03-title" label="Slide 04 step 3 title">Review</Text>
              <Text as="p" objectId="step-03" label="Slide 04 step 3">在 viewer 內 comment / edit。</Text>
            </article>
            <article className="process-step">
              <Text as="span" objectId="step-04-number" label="Slide 04 step 4 number">04</Text>
              <Text as="h3" objectId="step-04-title" label="Slide 04 step 4 title">Export</Text>
              <Text as="p" objectId="step-04" label="Slide 04 step 4">匯出 PDF 或圖片。</Text>
            </article>
          </div>
        </section>
      </DeckSlide>

      <DeckSlide id="next-steps" variant="closing">
        <section className="conclusion-layout">
          <Text as="p" objectId="eyebrow" label="Slide 05 eyebrow" className="kicker">
            Next
          </Text>
          <Text as="h2" objectId="title" label="Slide 05 title">
            下一步：抽出可重用基礎元件
          </Text>
          <div className="conclusion-points">
            <Text as="p" objectId="note-text" label="Slide 05 text note">
              Text / Media / Frame 不決定視覺風格。
            </Text>
            <Text as="p" objectId="note-media" label="Slide 05 media note">
              它們只提供可編輯、可註解、可輸出的底層能力。
            </Text>
          </div>
        </section>
      </DeckSlide>
    </>
  );
}

export default function SlidePress() {
  return (
    <Press
      slug="slide"
      title="OpenPress Dogfood Slides"
      type="slides"
      page="slide-16-9"
      componentsDir="./components"
      mediaDir="./media"
    >
      <SlidePlaceholder />
    </Press>
  );
}
