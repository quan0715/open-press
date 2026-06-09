---
title: "佈景主題 (Themes)"
eyebrow: "press/<slugtheme/"
description: "OpenPress 會讀取資料夾局部的 theme 目錄以及選擇性的 press/shared/theme 的 CSS — 包含 tokens.css, fonts.css, base/, page-surfaces/, shell/, 以及選擇性的 patterns/。每個資料夾只有單一用途；不會載入其他任何內容。"
---
  <p>
    一個佈景主題 (theme) 只是處於已知版面配置中的 CSS 檔案。引擎會在建置時期解析它們，注入頁面幾何 (page-geometry) 變數，並將所有東西打包為扁平的 <code>theme.css</code> 輸出。
    這裡沒有佈景主題執行期 (runtime) 或是 JS hooks — 新增一個佈景主題意味著撰寫使用這些文件的 tokens 的 CSS。
  </p>

  <h2>目錄契約 (Directory contract)</h2>

  <PropsTable
    title="引擎從 theme 資料夾讀取什麼"
    rows={[
      { name: "tokens.css", type: "必要", description: "CSS 變數 — 顏色、字型、間距，以及頁面幾何預設值。這是其他 CSS 依賴的第一個檔案。" },
      { name: "fonts.css", type: "必要", description: "用於打包的 webfonts 的 <code>@font-face</code> 規則。如果只使用系統字型，則可以是空的。" },
      { name: "base/page-contract.css", type: "必要", description: "<code>@page</code> 規則 + 使用幾何 tokens 的頁面表面 CSS。定義了可列印的區域。" },
      { name: "base/typography.css", type: "必要", description: "用於 <code>MdxArea</code> 內部的 <code>h1</code> … <code>p</code> 預設排版比例。" },
      { name: "base/print.css", type: "必要", description: "用於 PDF 匯出的 <code>@media print</code> 規則。可能內容很少，但檔案必須存在。" },
      { name: "page-surfaces/{cover,toc,back-cover}.css", type: "選擇性", description: "各別 Frame 角色的樣式。保留空檔作為樁 (stub)，以便 starter 日後可以添加封面而不必動到基礎佈局。" },
      { name: "shell/reader-controls.css", type: "選擇性", description: "Workbench / 閱讀器介面覆寫。大多數 starters 會留空，因為 framework 已提供預設控制項。" },
      { name: "patterns/*.css", type: "選擇性", description: "內容可選用的實用類別 — 圖片網格、圖表框架、表格儲存格輔助。長篇 A4 starters 會提供一小部分；簡報 / 社交媒體 starters 則會跳過此資料夾。" },
    ]}
  />

  <div class="callout">
    <strong>引擎會將頁面幾何作為 CSS 變數注入。</strong> 絕對不要在您的 theme 內寫死 (hardcode)
    <code>210mm</code> 或是 <code>1080px</code> — 請從
    <code>--openpress-page-width</code>、<code>--openpress-page-height</code>、
    <code>--openpress-page-aspect-ratio</code> 讀取。幾何形狀來自
    <code>&lt;Press page&gt;</code> prop (<a href="/docs/reference/components-press">Press</a>)。
  </div>

  <h2>tokens.css</h2>

  <ApiEntry
    name="tokens.css"
    kind="css-var"
    summary="視覺樣式的唯一事實來源。所有其他 theme 檔案都從這些 tokens 讀取 — 絕對不要在其他地方寫死顏色 / 字型 / 間距的值。"
  >
    ### 範例：最小化的 tokens.css

```css
:root {
  /* 顏色 */
  --op-ink: #1a1a1a;
  --op-ink-strong: #000;
  --op-paper: #fff;
  --op-paper-soft: #fafafa;
  --op-accent: #2563eb;
  --op-hairline: #e5e5e5;

  /* 字型 */
  --op-font-body: "Inter", system-ui, sans-serif;
  --op-font-display: "Inter Display", "Inter", sans-serif;
  --op-font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* 排版比例 */
  --op-text-xs: 0.72rem;
  --op-text-sm: 0.85rem;
  --op-text-base: 1rem;
  --op-text-lg: 1.15rem;
  --op-text-2xl: 1.6rem;

  /* 間距 */
  --op-space-1: 4px;
  --op-space-2: 8px;
  --op-space-3: 12px;
  --op-space-4: 16px;

  /* 頁面幾何 — 引擎在匯出時會注入設定的值。 */
  --openpress-page-width: 210mm;
  --openpress-page-height: 297mm;
}
```

    <p>
      按照慣例，Token 名稱使用 <code>--op-</code> 前綴；頁面幾何的三個變數使用 <code>--openpress-page-*</code>，因為它們是由引擎注入的。客製化 themes 可以新增它們自己的變數 — 任何不以 <code>--openpress-</code> 開頭的變數都屬於您的 theme。
    </p>
  </ApiEntry>

  <h2>base/ — 排版基礎</h2>

  <ApiEntry
    name="base/page-contract.css"
    kind="css-var"
    summary="固定佈局的基礎。定義 @page 規則、頁面表面，以及內容如何位於可列印區域內。從引擎注入的變數讀取幾何資訊。"
  >
    ### 範例：典型的頁面契約

```css
@page {
  size: var(--openpress-page-width) var(--openpress-page-height);
  margin: 0;
}

.openpress-page {
  width: var(--openpress-page-width);
  height: var(--openpress-page-height);
  background: var(--op-paper);
  color: var(--op-ink);
  /* 內部留白在這裡定義 — 頁面貼齊 @page 邊緣，
     內容則透過這個 padding 內縮。 */
  padding: 22mm 18mm;
}
```
  </ApiEntry>

  <ApiEntry
    name="base/typography.css"
    kind="css-var"
    summary="MdxArea 內的預設排版比例。在這裡為標題、段落、清單、引言 — 任何 MDX 檔案可能渲染的東西設定樣式。"
  />

  <ApiEntry
    name="base/print.css"
    kind="css-var"
    summary="@media print 規則。分頁、色彩設定檔、字型微調，任何在螢幕與 PDF 之間有所不同的東西。可能內容很少，但檔案必須存在。"
  />

  <h2>page-surfaces/ — 依角色設計的樣式</h2>

  <p>
    每個檔案對應於一個 <code>Frame role="…"</code> 的命名空間。名稱直接對應到檔案：帶有 <code>role="document.cover"</code> 的 Frame 讀取 <code>cover.css</code>，
    <code>role="document.toc"</code> 讀取 <code>toc.css</code>，依此類推。檔案是可選的，但 starter skills 通常會附帶空的樁 (stub)，以便日後添加封面時不需要改動基礎檔案佈局。
  </p>

  ### 範例：一個封面表面

```css
/* page-surfaces/cover.css */
.openpress-page[data-role="document.cover"] {
  display: grid;
  place-content: end start;
  padding: 28mm 22mm;
  background: linear-gradient(180deg, var(--op-paper) 0%, var(--op-paper-soft) 100%);
}
.openpress-page[data-role="document.cover"] h1 {
  font-family: var(--op-font-display);
  font-size: 64pt;
  line-height: 1.05;
}
```

  <h2>patterns/ — 選擇性的實用類別</h2>

  <p>
    這是唯一一個其存在取決於內容類型的資料夾。A4 長篇的 starters 會附帶一個小型的實用類別庫 (圖片網格、圖表框架包裝器、表格儲存格輔助)；簡報與社交媒體 starters 每頁只渲染一個主區塊且不需要它，因此它們完全跳過了這個資料夾。
  </p>

  <PropsTable
    title="常見的模式檔案 (編輯專著 / 學術論文)"
    rows={[
      { name: "figure-grid.css", type: "實用類別", description: "多欄位圖片佈局 (<code>.figure-grid</code>, <code>.figure-grid--2</code> 等等)。" },
      { name: "_chart-frame.css", type: "實用類別", description: "用於 <code>&lt;ChartFigure&gt;</code> 的外部包裝器 — 圖片說明位置、註腳規則。" },
      { name: "table-utilities.css", type: "實用類別", description: "儲存格輔助工具 — <code>.cell-numeric</code>, <code>.cell-strong</code>, 交替行樣式掛鉤。" },
    ]}
  />

  <div class="callout">
    <strong>新增一個模式是內容驅動的。</strong> 不要 "以防萬一有人需要" 就預先寫好實用類別 — 請等到 MDX 實際需要它們時，再添加檔案並在 <code>patterns/README.md</code> 內記錄。內建的 starter skills 就是這樣做的；請遵循這個習慣。
  </div>

  <h2>shell/ — 閱讀器介面覆寫</h2>

  <p>
    <code>shell/reader-controls.css</code> 覆寫了 framework 的預設 workbench 介面 (工具列按鈕、頁面縮放控制、面板邊界)。大多數 themes 讓這裡保持空白，因為預設設定運作良好；只有在您的品牌需要不同的控制項時才進行覆寫。
  </p>

  <h2>編寫一個新的佈景主題</h2>

  <ol>
    <li>從最接近您預期輸出的 starter 開始 (長篇 → editorial-monograph；社交卡片 → 外部創意 skill)。</li>
    <li>在 <code>tokens.css</code> 替換 tokens — 顏色、字型、排版比例。大多數的視覺識別變更只發生在這裡。</li>
    <li>如果您的頁面幾何形狀與預設值不同，請在 <code>press/&lt;slug&gt;/press.tsx</code> 中設定 <code>&lt;Press page&gt;</code> JSX prop — 不要在 CSS 中寫死幾何。</li>
    <li>如有需要，調整 <code>base/typography.css</code> 的排版比例與節奏。</li>
    <li>只有當特定 Frame 角色需要自訂佈局時，才修改 <code>page-surfaces/*.css</code>。</li>
    <li>只有當 MDX 實際使用了實用類別時才增加 <code>patterns/*.css</code> 項目 — 不要提早增加。</li>
    <li>在 <code>npm run build</code> 之前先在 workbench (<code>npm run dev</code>) 內進行驗證。</li>
  </ol>
