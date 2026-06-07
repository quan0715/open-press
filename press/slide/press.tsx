import { Press, Text } from "@open-press/core";
import { DeckSlide } from "./components/DeckSlide";

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

      <DeckSlide id="test-06" variant="content">
        <section className="content-layout">
          <div className="content-heading">
            <Text as="p" objectId="eyebrow" label="Slide 06 eyebrow" className="kicker">Reorder Test</Text>
            <Text as="h2" objectId="title" label="Slide 06 title">Slide 06 — 拖曳重排測試</Text>
          </div>
          <div className="content-grid">
            <article className="content-card">
              <Text as="h3" objectId="card-a-title" label="Slide 06 card A title">Card A</Text>
              <Text as="p" objectId="card-a-text" label="Slide 06 card A text">試著把這頁拖到最前面。</Text>
            </article>
            <article className="content-card">
              <Text as="h3" objectId="card-b-title" label="Slide 06 card B title">Card B</Text>
              <Text as="p" objectId="card-b-text" label="Slide 06 card B text">左側縮圖顯示拖曳把手。</Text>
            </article>
            <article className="content-card">
              <Text as="h3" objectId="card-c-title" label="Slide 06 card C title">Card C</Text>
              <Text as="p" objectId="card-c-text" label="Slide 06 card C text">Drop 後頁序應即時更新。</Text>
            </article>
          </div>
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

      <DeckSlide id="test-07" variant="agenda">
        <section className="agenda-layout">
          <div>
            <Text as="p" objectId="eyebrow" label="Slide 07 eyebrow" className="kicker">Reorder Test</Text>
            <Text as="h2" objectId="title" label="Slide 07 title">Slide 07 — 列表頁</Text>
          </div>
          <ol className="agenda-list">
            <li>
              <span className="agenda-number">01</span>
              <div>
                <Text as="h3" objectId="item-01-title" label="Slide 07 item 1 title">source-edit API</Text>
                <Text as="p" objectId="item-01-note" label="Slide 07 item 1 note">POST /__openpress/source-edit with type discriminator</Text>
              </div>
            </li>
            <li>
              <span className="agenda-number">02</span>
              <div>
                <Text as="h3" objectId="item-02-title" label="Slide 07 item 2 title">AST reorder</Text>
                <Text as="p" objectId="item-02-note" label="Slide 07 item 2 note">TypeScript AST parse → reorder JSX children → write back</Text>
              </div>
            </li>
            <li>
              <span className="agenda-number">03</span>
              <div>
                <Text as="h3" objectId="item-03-title" label="Slide 07 item 3 title">Shared status context</Text>
                <Text as="p" objectId="item-03-note" label="Slide 07 item 3 note">WorkbenchEditStatusProvider 讓所有操作共享狀態</Text>
              </div>
            </li>
          </ol>
        </section>
      </DeckSlide>

      <DeckSlide id="test-08" variant="process">
        <section className="process-layout">
          <div className="process-heading">
            <Text as="p" objectId="eyebrow" label="Slide 08 eyebrow" className="kicker">Reorder Test</Text>
            <Text as="h2" objectId="title" label="Slide 08 title">Slide 08 — 流程圖頁</Text>
          </div>
          <div className="process-map">
            <article className="process-step">
              <Text as="span" objectId="s1-num" label="Slide 08 step 1 num">01</Text>
              <Text as="h3" objectId="s1-title" label="Slide 08 step 1 title">Drag</Text>
              <Text as="p" objectId="s1-text" label="Slide 08 step 1 text">拖曳縮圖把手。</Text>
            </article>
            <article className="process-step">
              <Text as="span" objectId="s2-num" label="Slide 08 step 2 num">02</Text>
              <Text as="h3" objectId="s2-title" label="Slide 08 step 2 title">Drop</Text>
              <Text as="p" objectId="s2-text" label="Slide 08 step 2 text">放到目標位置。</Text>
            </article>
            <article className="process-step">
              <Text as="span" objectId="s3-num" label="Slide 08 step 3 num">03</Text>
              <Text as="h3" objectId="s3-title" label="Slide 08 step 3 title">Rebuild</Text>
              <Text as="p" objectId="s3-text" label="Slide 08 step 3 text">WorkbenchRebuildOverlay 顯示儲存進度。</Text>
            </article>
            <article className="process-step">
              <Text as="span" objectId="s4-num" label="Slide 08 step 4 num">04</Text>
              <Text as="h3" objectId="s4-title" label="Slide 08 step 4 title">Done</Text>
              <Text as="p" objectId="s4-text" label="Slide 08 step 4 text">頁面順序更新完成。</Text>
            </article>
          </div>
        </section>
      </DeckSlide>

      <DeckSlide id="test-09" variant="content">
        <section className="content-layout">
          <div className="content-heading">
            <Text as="p" objectId="eyebrow" label="Slide 09 eyebrow" className="kicker">Reorder Test</Text>
            <Text as="h2" objectId="title" label="Slide 09 title">Slide 09 — 三欄內容</Text>
          </div>
          <div className="content-grid">
            <article className="content-card">
              <Text as="h3" objectId="col1-title" label="Slide 09 col 1 title">框架</Text>
              <Text as="p" objectId="col1-text" label="Slide 09 col 1 text">Press / Frame / ObjectEntity 三層結構。</Text>
            </article>
            <article className="content-card">
              <Text as="h3" objectId="col2-title" label="Slide 09 col 2 title">工具</Text>
              <Text as="p" objectId="col2-text" label="Slide 09 col 2 text">Inline editor、Inspector、Screenshot。</Text>
            </article>
            <article className="content-card">
              <Text as="h3" objectId="col3-title" label="Slide 09 col 3 title">輸出</Text>
              <Text as="p" objectId="col3-text" label="Slide 09 col 3 text">PDF export、Deploy、Presentation mode。</Text>
            </article>
          </div>
        </section>
      </DeckSlide>

      <DeckSlide id="test-10" variant="agenda">
        <section className="agenda-layout">
          <div>
            <Text as="p" objectId="eyebrow" label="Slide 10 eyebrow" className="kicker">Reorder Test</Text>
            <Text as="h2" objectId="title" label="Slide 10 title">Slide 10 — 第十頁</Text>
          </div>
          <ol className="agenda-list">
            <li>
              <span className="agenda-number">01</span>
              <div>
                <Text as="h3" objectId="item-01-title" label="Slide 10 item 1 title">測試邊界條件</Text>
                <Text as="p" objectId="item-01-note" label="Slide 10 item 1 note">把最後一頁拖到第一頁之前。</Text>
              </div>
            </li>
            <li>
              <span className="agenda-number">02</span>
              <div>
                <Text as="h3" objectId="item-02-title" label="Slide 10 item 2 title">測試中間插入</Text>
                <Text as="p" objectId="item-02-note" label="Slide 10 item 2 note">把第三頁插到第七頁後面。</Text>
              </div>
            </li>
            <li>
              <span className="agenda-number">03</span>
              <div>
                <Text as="h3" objectId="item-03-title" label="Slide 10 item 3 title">確認 press.tsx 更新</Text>
                <Text as="p" objectId="item-03-note" label="Slide 10 item 3 note">儲存後檢查 press/slide/press.tsx 的 JSX 順序。</Text>
              </div>
            </li>
          </ol>
        </section>
      </DeckSlide>

      <DeckSlide id="test-11" variant="content">
        <section className="content-layout">
          <div className="content-heading">
            <Text as="p" objectId="eyebrow" label="Slide 11 eyebrow" className="kicker">Reorder Test</Text>
            <Text as="h2" objectId="title" label="Slide 11 title">Slide 11 — 第十一頁</Text>
          </div>
          <div className="content-grid">
            <article className="content-card">
              <Text as="h3" objectId="a-title" label="Slide 11 A title">DnD API</Text>
              <Text as="p" objectId="a-text" label="Slide 11 A text">HTML5 原生 drag-and-drop，無第三方函式庫。</Text>
            </article>
            <article className="content-card">
              <Text as="h3" objectId="b-title" label="Slide 11 B title">frameKey</Text>
              <Text as="p" objectId="b-text" label="Slide 11 B text">id prop 對應 data-openpress-frame-key attribute。</Text>
            </article>
            <article className="content-card">
              <Text as="h3" objectId="c-title" label="Slide 11 C title">AST</Text>
              <Text as="p" objectId="c-text" label="Slide 11 C text">typescript 模組解析並重組 JSX 子節點。</Text>
            </article>
          </div>
        </section>
      </DeckSlide>

      <DeckSlide id="test-12" variant="process">
        <section className="process-layout">
          <div className="process-heading">
            <Text as="p" objectId="eyebrow" label="Slide 12 eyebrow" className="kicker">Reorder Test</Text>
            <Text as="h2" objectId="title" label="Slide 12 title">Slide 12 — 第十二頁</Text>
          </div>
          <div className="process-map">
            <article className="process-step">
              <Text as="span" objectId="n1" label="Slide 12 n1">A</Text>
              <Text as="h3" objectId="t1" label="Slide 12 t1">useSlideReorder</Text>
              <Text as="p" objectId="p1" label="Slide 12 p1">封裝 useSourceEdit。</Text>
            </article>
            <article className="process-step">
              <Text as="span" objectId="n2" label="Slide 12 n2">B</Text>
              <Text as="h3" objectId="t2" label="Slide 12 t2">useSourceEdit</Text>
              <Text as="p" objectId="p2" label="Slide 12 p2">fetch + 共享 status context。</Text>
            </article>
            <article className="process-step">
              <Text as="span" objectId="n3" label="Slide 12 n3">C</Text>
              <Text as="h3" objectId="t3" label="Slide 12 t3">WorkbenchEditStatusProvider</Text>
              <Text as="p" objectId="p3" label="Slide 12 p3">全局 saving / saved / failed 狀態。</Text>
            </article>
            <article className="process-step">
              <Text as="span" objectId="n4" label="Slide 12 n4">D</Text>
              <Text as="h3" objectId="t4" label="Slide 12 t4">WorkbenchRebuildOverlay</Text>
              <Text as="p" objectId="p4" label="Slide 12 p4">視覺回饋 spinner / checkmark。</Text>
            </article>
          </div>
        </section>
      </DeckSlide>

      <DeckSlide id="test-13" variant="content">
        <section className="content-layout">
          <div className="content-heading">
            <Text as="p" objectId="eyebrow" label="Slide 13 eyebrow" className="kicker">Reorder Test</Text>
            <Text as="h2" objectId="title" label="Slide 13 title">Slide 13 — 第十三頁</Text>
          </div>
          <div className="content-grid">
            <article className="content-card">
              <Text as="h3" objectId="x1-title" label="Slide 13 x1 title">Screenshot</Text>
              <Text as="p" objectId="x1-text" label="Slide 13 x1 text">Toolbar 截圖按鈕複製當前頁面到剪貼簿。</Text>
            </article>
            <article className="content-card">
              <Text as="h3" objectId="x2-title" label="Slide 13 x2 title">Reorder</Text>
              <Text as="p" objectId="x2-text" label="Slide 13 x2 text">拖曳縮圖重新排列 slide 順序。</Text>
            </article>
            <article className="content-card">
              <Text as="h3" objectId="x3-title" label="Slide 13 x3 title">Inline Edit</Text>
              <Text as="p" objectId="x3-text" label="Slide 13 x3 text">點擊文字直接編輯 source。</Text>
            </article>
          </div>
        </section>
      </DeckSlide>

      <DeckSlide id="test-14" variant="agenda">
        <section className="agenda-layout">
          <div>
            <Text as="p" objectId="eyebrow" label="Slide 14 eyebrow" className="kicker">Reorder Test</Text>
            <Text as="h2" objectId="title" label="Slide 14 title">Slide 14 — 第十四頁</Text>
          </div>
          <ol className="agenda-list">
            <li>
              <span className="agenda-number">01</span>
              <div>
                <Text as="h3" objectId="i1-title" label="Slide 14 i1 title">MDX 排除</Text>
                <Text as="p" objectId="i1-note" label="Slide 14 i1 note">source type 為 mdx 時不顯示拖曳把手。</Text>
              </div>
            </li>
            <li>
              <span className="agenda-number">02</span>
              <div>
                <Text as="h3" objectId="i2-title" label="Slide 14 i2 title">frameKey 必填</Text>
                <Text as="p" objectId="i2-note" label="Slide 14 i2 note">每張 slide 的 id prop 即 frameKey。</Text>
              </div>
            </li>
            <li>
              <span className="agenda-number">03</span>
              <div>
                <Text as="h3" objectId="i3-title" label="Slide 14 i3 title">樂觀更新</Text>
                <Text as="p" objectId="i3-note" label="Slide 14 i3 note">前端先更新順序，rebuild 後以 server 為準。</Text>
              </div>
            </li>
          </ol>
        </section>
      </DeckSlide>

      <DeckSlide id="test-15" variant="closing">
        <section className="conclusion-layout">
          <Text as="p" objectId="eyebrow" label="Slide 15 eyebrow" className="kicker">
            Reorder Test
          </Text>
          <Text as="h2" objectId="title" label="Slide 15 title">
            Slide 15 — 最後一頁
          </Text>
          <div className="conclusion-points">
            <Text as="p" objectId="note-1" label="Slide 15 note 1">
              恭喜！你已經有 15 張投影片可以測試拖曳重排。
            </Text>
            <Text as="p" objectId="note-2" label="Slide 15 note 2">
              試著把這頁拖到 cover 之後，驗證 AST reorder 正確運作。
            </Text>
          </div>
        </section>
      </DeckSlide>
    </Press>
  );
}
