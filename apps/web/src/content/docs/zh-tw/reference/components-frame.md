---
title: "Frame"
eyebrow: "@open-press/core"
description: "一個固定的頁面表面或是在頁面內的嵌套區域。根 Frame 會變成輸出的頁面；嵌套的 Frame 則會變成當前頁面內可選取的物件邊界。"
---
<ApiEntry
    name="<Frame>"
    kind="component"
    importFrom={'import { Frame } from "@open-press/core";'}
    signature={`<Frame
  frameKey="cover"
  role?="document.cover"
  chrome?={true}
  className?="reader-page--cover"
  ...sectionProps
>
  {/* page or region contents */}
</Frame>`}
    summary="渲染一個帶有資料屬性 (data-openpress-*) 供引擎讀取的 <section>。根 Frame 是頁面位址，用於分配 (allocation)、註解、編輯與匯出。嵌套的 Frame 是一個受限於當前頁面範圍內的區域物件。"
  >
    <PropsTable
      title="Props"
      rows={[
        {
          name: "frameKey",
          type: "string",
          required: true,
          description:
            "穩定的識別碼。對於根 Frame 來說，這是頁面的分配鍵、頁面位址，以及 <code>data-openpress-frame-key</code>。對於嵌套的 Frame，這是受父 Frame 約束的區域鍵，並且會寫入至 <code>data-openpress-region-frame-key</code>。必須為非空字串，且不能包含 <code>:extended:</code>。",
        },
        {
          name: "children",
          type: "ReactNode",
          required: true,
          description:
            "頁面內容。通常是包裝在佈局 (<code>.page-frame</code> / <code>.page-body</code>) 內的一個或多個 <code>&lt;MdxArea&gt;</code> 插槽，再加上任何 header/footer 介面控制項 (chrome)。",
        },
        {
          name: "role",
          type: "string",
          description:
            "語意標籤。核心執行期不會根據此值產生分支行為。它會將值寫入到 <code>data-frame-role</code>；根 Frame 也會從最後一個點 (.) 分隔片段衍生出 <code>data-page-kind</code>，例如從 <code>document.cover</code> 衍生出 <code>cover</code>。Themes、檢查器 (inspectors) 以及 agents 可以將它當作穩定的提示使用。",
        },
        {
          name: "chrome",
          type: "boolean",
          default: "true",
          description:
            "僅適用於根 Frame。當設為 false 時，會寫入 <code>data-frame-chrome=\"false\"</code> 與 <code>data-page-footer=\"false\"</code>。Theme 輔助工具會使用這些旗標來隱藏頁面介面 (chrome)，例如 footer/header 區帶。嵌套的 Frame 會繼承頁面狀態且不發出 chrome 旗標。",
        },
        {
          name: "className",
          type: "string",
          description:
            "會附加到渲染的 section 標籤上。根 Frame 會自動包含 <code>reader-page</code>；嵌套的 Frame 則不會，所以它們可以被當作中性的區域邊界使用。",
        },
        {
          name: "...rest",
          type: "HTMLAttributes",
          description:
            "所有其他的 props 都會傳遞到下層的 <code>&lt;section&gt;</code> 中。<code>data-*</code> 屬性通常用於 CSS 或 inspector 讀取的佈局旗標。",
        },
      ]}
    />

    ### 範例：A4 內容頁面 (manuscript role)

```tsx
<Frame frameKey="ch-2" role="document.content" className="reader-page--content">
  <div className="page-frame">
    <header className="page-header" aria-hidden="true" />
    <main className="page-body">
      <MdxArea chainId="story" />
    </main>
    <footer className="page-footer">
      <span className="footer-left">{title}</span>
      <span className="footer-right">{pageIndex + 1}/{totalPages}</span>
    </footer>
  </div>
</Frame>
```

    ### 範例：畫布風格的簡報 (沒有 chrome)

```tsx
<Frame
  frameKey="slide-1"
  role="canvas.slide"
  chrome={false}
  className="reader-page--slide"
>
  <div className="page-frame">
    <main className="page-body">
      <MdxArea chainId="slides" overflow="truncate" />
    </main>
  </div>
</Frame>
```
  </ApiEntry>

  <h2>頁面幾何 (Page geometry)</h2>

  <p>
    <code>&lt;Frame&gt;</code> 的契約不包含 <code>page</code> prop。紙張或是畫布的尺寸是設定在每個 <code>&lt;Press page&gt;</code> JSX prop 上的。一個 Press → 一種固定的幾何尺寸；混合尺寸的專案需要使用包含多個 Press 的 <code>&lt;Workspace&gt;</code>，每個 Press 有一種幾何尺寸。
  </p>

  <ApiEntry
    name="FrameContext"
    kind="context"
    importFrom={'import { FrameContext } from "@open-press/core";'}
    signature={`const frame = useContext(FrameContext);
// -> { frameKey, objectId, pageId, consumeArea(chainId) } | null`}
    summary="用於客製化輔助工具的低階 context。MdxArea 會呼叫 consumeArea 來宣告其在引擎分配表 (allocation table) 中的插槽。一般文件通常不需要直接讀取這個 context。"
  >
    <p>
      <code>consumeArea(chainId)</code> 在每次呼叫時都會遞增個別 chain 的計數器，因此在同一個 frame 中擁有多個相同 <code>chainId</code> 的 <code>&lt;MdxArea&gt;</code> 會按照原始碼順序對應到不同的分配插槽。
    </p>
  </ApiEntry>

  <ApiEntry
    name="FRAME_MARKER"
    kind="symbol"
    importFrom={'import { FRAME_MARKER } from "@open-press/core";'}
    summary="渲染器 (renderer) 在遍歷樹狀結構時，用來偵測 Frame 實例的 Symbol 識別碼。客製化的 frame 包裝器可以重新匯出 Frame 並附上此標記。"
  />

  <h2>渲染器寫入的 Data 屬性</h2>

  <p>渲染出來的 <code>&lt;section&gt;</code> 會帶有這些屬性 — theme 的選擇器與檢查器的行為都依賴於它們：</p>

  <PropsTable
    rows={[
      { name: "data-openpress-frame-key", type: "string", description: "僅根 Frame 擁有。反映頁面的 <code>frameKey</code>。" },
      { name: "data-openpress-region-frame-key", type: "string", description: "僅嵌套的 Frame 擁有。反映在當前頁面內的區域 <code>frameKey</code>。" },
      { name: "data-openpress-object-id", type: "string", description: "給檢查器、編輯層與註解標記系統使用的物件 id。" },
      { name: "data-frame-role", type: "string", description: "反映 <code>role</code> prop 的值。" },
      { name: "data-page-kind", type: "string", description: "僅根 Frame 擁有。取 <code>role</code> 最後一個點之後的片段，例如從 <code>document.cover</code> 取得 <code>cover</code>。" },
      { name: "data-frame-chrome", type: '"true" | "false"', description: "僅根 Frame 擁有。反映 <code>chrome</code> prop 的值。" },
      { name: "data-page-footer", type: '"true" | "false"', description: "僅根 Frame 擁有。預設與 <code>data-frame-chrome</code> 相符。" },
    ]}
  />

  <h2>角色命名慣例 (Role naming convention)</h2>

  <p>
    <code>role</code> 可以是任意字串，但 framework 在文件中採用雙片段慣例，以保持 themes 與文件的風格一致：
  </p>

  <ul>
    <li>
      <strong><code>document.*</code></strong> — 讓 MDX 內容透過分配器流動的長篇頁面：<code>document.cover</code>, <code>document.toc</code>, <code>document.content</code>, <code>document.back-cover</code>。
    </li>
    <li>
      <strong><code>canvas.*</code></strong> — 固定格式的頁面，具有單一設計好的表面且附帶 <code>overflow="truncate"</code> 的 MDX 區域：<code>canvas.slide</code>, <code>canvas.post</code>, <code>canvas.card</code>。
    </li>
    <li>
      <strong><code>manuscript.*</code></strong> — 由打包的文稿輔助工具使用 (來自 <code>DefaultSectionPage</code> 的 <code>manuscript.content</code>)。
    </li>
  </ul>
