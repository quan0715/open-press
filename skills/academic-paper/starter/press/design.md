# open-press 樣式規格

> 一份合併的設計說明,給內容作者、AI Agent 與 starter skill contributor 共用。
> Editorial-monograph starter 從這份檔案複製到 `document/design.md`;之後請依專案需要改寫,維持單一檔案結構。

---

## 1. 風格目標與使用場景

open-press 初始模板面向長文件,而不是單頁網站或 dashboard。它要支援課程講義、提案、報告、白皮書、產品文件與公開說明文件,重點是穩定閱讀、可輸出、可被 AI 持續修改。

這套風格的基調是「安靜、可信、可交付」。文件使用白底、近黑文字、細線分隔、低彩度輔助資訊與少量暖色圖表色。章節標題保留 editorial 感,但正文、表格與圖表仍優先服務資訊密度。

### 設計原則

| 原則 | 規則 | Agent 操作提醒 |
| --- | --- | --- |
| 文件優先 | 第一眼應該像可交付的 A4 文件,不像 landing page | 不要加入 hero marketing section、浮動卡片或裝飾性背景 |
| 規格透明 | User 看到的 Design page 就是 Agent 依循的 design source | 修改風格時先更新 `document/design.md`,再更新 `document/theme/` |
| 來源可改 | 內容從 MDX、React props 與 media assets 產生 | 不把關鍵文字或數據鎖死在截圖或手寫 SVG |
| 輸出穩定 | 所有樣式要支援 reader、mobile preview 與 PDF | 避免 uncontrolled overflow、孤立 caption 與跨 footer 元件 |

### 使用場景

| 場景 | 適合原因 | 不適合方向 |
| --- | --- | --- |
| 提案與商業報告 | 需要清楚章節、數據、圖表與結論 | 過度銷售語氣、滿版裝飾 |
| 課程講義與白皮書 | 需要長文閱讀與穩定分頁 | 插畫密集或社群貼文式排版 |
| 產品文件與說明書 | 需要流程、規格、表格與檢查清單 | Dashboard-like 操作面板 |
| Design System Manual | 需要 user 與 Agent 看到同一份規格 | 另一套 token gallery 或 demo source |

### User 與 Agent 的分工

User 檢查這份文件時,主要判斷「這是不是我要的文件風格」。Agent 閱讀這份文件時,主要判斷「接下來生成正式文件時要遵守哪些規格」。

| 角色 | 讀這份文件時要取得的資訊 |
| --- | --- |
| User | 風格是否符合品牌、文件是否易讀、輸出是否可信 |
| Agent | 語氣、字級、色彩、元件規則、驗收清單 |
| open-press renderer | source mapping、bookmarks、page state、PDF-safe preview |

---

## 2. Tokens

### Typography Scale

open-press 初始模板使用兩組字體:正文與介面使用無襯線,封面與章節標題使用襯線,讓文件在資訊密度與 editorial 氣質之間取得平衡。

| 用途 | CSS selector / token | 字體 | 大小 | 字重 | 行高 / 字距 | 使用規則 |
| --- | --- | --- | --- | --- | --- | --- |
| Metric display | `.metric-display`, chart figure number | `--openpress-font-body` | `34pt` | 700 | line-height `1`, letter `0` | 只用於資料圖表或單一重點數字 |
| Cover title | `.cover-title` | `--openpress-font-serif` | `clamp(36px, 8.5cqw, 64px)` | 300 | line-height `1`, letter `0.01em` | 文件名稱或產品名,整份文件只在封面使用 |
| Cover tagline | `.cover-tagline` | `--openpress-font-serif` | `clamp(14px, 2.4cqw, 20px)` | 300 | letter `0.08em` | 封面一句話定位,不承載長句 |
| Cover subtitle | `.cover-subtitle` | `--openpress-font-body` | `10.5pt-12.5pt` | 400 | line-height `1.55` | 封面主說明,最多一段 |
| Chapter title | `h2` | `--openpress-font-serif` | `14pt-17pt` | 300 | line-height `1.45`, letter `0.04em` | 每個 `##` 產生一個章節 bookmark |
| Section title | `h3` | `--openpress-font-serif` | `11pt-13pt` | 400 | line-height `1.55`, letter `0.03em` | 用於章節內小節,不要過度切碎 |
| Minor heading | `h4` | `--openpress-font-body` | `10pt-11pt` | 500 | muted, letter `0.04em` | 表格前提示或局部標題 |
| Body text | `p`, `li` | `--openpress-font-body` | `9.5pt-10.5pt` | 400 | line-height `1.85` | 長文閱讀基準;不要用過短行距 |
| Table text | `table` | `--openpress-font-body` | `8pt-9pt` | 400 / th 500 | line-height `1.45` | 密集資料,保持掃讀 |
| Caption | `figcaption`, `caption` | `--openpress-font-body` | `7.5pt-8.5pt` | 400 | line-height `1.5`, letter `0.02em` | 圖表下方置中,需可自動編號 |

Agent 寫作時不應用「字變大」解決層級問題。若章節不清楚,先調整內容結構與 heading;若仍不足,再調整 token。

### Color Tokens

色票是視覺驗收工具,不取代表格規格。User 可以用視覺對照判斷文件氣質;Agent 應依照每張色票的 usage 決定是否使用。

| Token | Value | 用途 |
| --- | --- | --- |
| `--openpress-color-document` | `#ffffff` | A4 文件紙面、表格與圖表背景 |
| `--openpress-color-ink` | `#161616` | 主文字、標題、主要線條 |
| `--openpress-color-muted` | `#6f6f6f` | caption、頁碼、章節編號、輔助說明 |
| `--openpress-color-line` | `#e0e0e0` | 表格列線、細分隔線 |
| `--openpress-color-soft-line` | `#f4f4f4` | 輕量分隔、flow stage 內部線 |
| `--openpress-color-app-bg` | `#161616` | Workbench 外層深色 chrome |
| `--openpress-chart-gold` | `#FFB000` | 主要 chart accent、current / starting point |
| `--openpress-chart-coral` | `#FF6A4D` | chart 第二層強調 |
| `--openpress-chart-coral-deep` | `#C9522B` | chart 深層強調 |
| `--openpress-chart-dark` | `#1F2328` | chart anchor / mature state |
| `--openpress-status-warn` | `#C9522B` | 行內語意強調:風險、警示、注意 |
| `--openpress-status-success` | `#5C8C4F` | 行內語意強調:達標、通過、確認 |
| `--openpress-status-info` | `#4A6B8A` | 行內語意強調:補充說明、註腳 |

文件頁面以黑白灰為主,暖色只用在圖表與少量 emphasis。不要把整份文件改成單一強烈品牌色,也不要用大面積漸層當背景。

Starter 可以用 React 元件建立視覺對照頁,例如 `document/components/TypeSpecimen/`(typography)與 `document/components/TokenSwatchGrid/`(color)。

### Inline Emphasis

Markdown 內的文字強調走兩條路徑:

1. **MD 原生語法**:`**bold**` → `<strong>`,`*italic*` → `<em>`,`~~strike~~` → `<del>`,`` `code` `` → `<code>`,`[text](url)` → `<a>`,`<mark>text</mark>` → highlight。每個都已綁 token 樣式,不用手動加 class。
2. **語意強調色**:優先用 React inline component 或 Tailwind arbitrary utility,例如 `font-semibold text-[var(--openpress-status-warn)]`。避免按色相命名(如 `.accent-gold`)破壞語意系統。

| Selector | 預設樣式來源 | 使用時機 |
| --- | --- | --- |
| `strong` | `font-weight: 600` + ink color | 段落內關鍵詞、列表 key term |
| `em` | serif italic + ink color | 引用、術語、書名 |
| `del` / `s` | muted + strike | 刪除、修正前後對照 |
| `code` | mono font + 淺背景 + padding | 路徑、識別字、命令 |
| `a` | ink + dotted underline | 超連結;underline 避免實線以區隔印刷正文 |
| `mark` | gold tint 背景 + ink | 「primary highlight」——一份文件只挑少量重點數字或關鍵句 |
| `text-[var(--openpress-status-warn)] font-semibold` | `--openpress-status-warn` + 600 | 風險、延遲、警示語境 |
| `text-[var(--openpress-status-success)] font-semibold` | `--openpress-status-success` + 600 | 已達標、通過、完成 |
| `text-[var(--openpress-status-info)] font-semibold` | `--openpress-status-info` + 600 | 補充、註記、輔助資訊 |
| `text-[var(--openpress-color-muted)]` | `--openpress-color-muted` | 非語意性「再弱一級」 |

不提供 `<u>` underline 樣式——印刷上跟 `<a>` 撞,反而降低可讀性。若要強調,改用 `<strong>` 或 `<mark>`。

Block-level 強調(callout / warning / note)目前不在 design system 範圍;若文件需要區塊式提示,先評估是否能用既有 figure 或 table 表達。

### Chapter & Section Numbering

Engine 不在 h2/h3 內容前注入任何編號或前綴;export pipeline 會在 build-time 寫入 `data-chapter` / `data-section` attribute(值是 `01`、`1.1` 這種兩位數阿拉伯格式)。實際顯示樣式由 theme 的 `::before content` 決定,這讓不同文件能挑不同 numbering vocabulary 而不動 reader runtime。

預設(editorial-monograph 起手樣式):

```css
/* document/theme/base/typography.css */
.reader-page--content .page-body > h2:first-child::before {
  content: attr(data-chapter);   /* 顯示「02」 */
}

.reader-page--content h3[data-section]::before {
  content: attr(data-section);   /* 顯示「2.1」 */
}
```

要換成「一、二、(一)(二)」風格,**不動 engine、不動 pagination**,只改 `typography.css` 的 `::before content`:

```css
@counter-style qj-cjk-decimal {
  system: cyclic;
  symbols: "一" "二" "三" "四" "五" "六" "七" "八" "九" "十";
  suffix: "、";
}

@counter-style qj-cjk-section {
  system: cyclic;
  symbols: "(一)" "(二)" "(三)" "(四)" "(五)"
           "(六)" "(七)" "(八)" "(九)" "(十)";
  suffix: "";
}

/* Chapter h2: 一、 */
.reader-page--content .page-body > h2:first-child {
  counter-reset: qj-chapter calc(attr(data-chapter type(<integer>), 0));
}
.reader-page--content .page-body > h2:first-child::before {
  content: counter(qj-chapter, qj-cjk-decimal);
}

/* Section h3: (一) */
.reader-page--content h3[data-section] {
  counter-reset: qj-section calc(attr(data-section, "0") * 10);
}
.reader-page--content h3[data-section]::before {
  content: counter(qj-section, qj-cjk-section);
}
```

或更簡單:用 `attr()` 不做 counter,直接在 attribute 做字串映射(CSS 沒這能力時就回到 `@counter-style`)。要 `Chapter 1` / `§1.1` / 純數字無前綴等等,都改一條 `content:` 即可。

要點:
- engine 只給 raw counter(`data-chapter="02"`、`data-section="2.1"`)
- 顯示是 theme 的責任
- 換樣式不需要改 markdown、不需要動 engine、不需要 rebuild pagination

### Spacing 與 Page Rhythm

Spacing 定義頁面節奏,不是用來硬塞內容。若一頁過密,優先拆成新的 `##` 頁面,而不是縮小字級或移除留白。

| Token | Value | 用途 |
| --- | --- | --- |
| `--openpress-space-1` | `2mm` | caption、局部小間距 |
| `--openpress-space-2` | `4mm` | 段落、封面小區塊間距 |
| `--openpress-space-3` | `6mm` | h3 前後、figure margin |
| `--openpress-space-4` | `9mm` | h2 後、TOC 與大區塊 |
| `--openpress-space-5` | `13mm` | 少數需要更大呼吸的頁面區塊 |

頁面節奏應該由 heading、paragraph、table、figure 的固定 spacing 自然形成,不用額外插入空白段落。固定版面中,寧可拆章節,也不要把過多內容硬塞在同一頁。

### Page Geometry

文件實體尺寸的 canonical 來源是 document config 的 `page`。Exporter 會把
`page` 寫進 measurement CSS 與 `document.theme`;page-contract、reader
runtime、PDF print route 都讀同一組 `--openpress-page-*` 變數。這些 CSS
變數是輸出介面,不是切換文件尺寸的主要 API。

| Config | Value | 用途 |
| --- | --- | --- |
| `page` | `"a4"` | 這個 starter 的固定 A4 版面 |
| `page.width` / `page.height` | absolute CSS length | 自訂固定尺寸時使用 |

要做社群貼文,優先安裝外部 social-card skill;要做 16:9 投影片,另建專用
skill 或自訂 Press tree。要做
Letter、B5 或其他固定尺寸,在 `press/<slug>/press.tsx` 的 `<Press page>` 宣告 custom page object,不要只改
`tokens.css`。

body 內容區的 page padding(content margin)由 `.reader-page` 內的
`--page-margin-*` 變數控制,與 page geometry 是兩件事。前者是「內容到頁面
邊緣的距離」,後者是整份文件的 canonical page size。

---

## 3. Components

這一節定義 open-press 生成文件時可以使用的核心元件。Agent 新增內容時,應先判斷資訊類型,再選擇 paragraph、table、figure、chart 或 checklist,而不是為了視覺豐富度任意加入卡片。

### Page Surfaces

| 元件 | Source 寫法 | 視覺規則 | Agent 使用時機 |
| --- | --- | --- | --- |
| Cover | `kind: cover` + HTML cover block | logo 左上、meta 右上、serif 大標、短 subtitle、可選 hero image | 文件開場,建立文件身份 |
| TOC | `kind: toc` 或 exporter 插入 | 自動收集 `##`,顯示章節頁碼;不顯示 footer | 不手寫目錄內容 |
| Chapter opener | `kind: chapter-opener` | H2 主題入口 mini cover,只保留大標、副標與一句 summary;不顯示 footer、不進正式目錄 | 書籍、教材、手冊等章節相對獨立的文件;只放在 `##` 全新主題之前 |
| Chapter page | `##` heading | h2 產生章節頁與 bookmark,章節號由 renderer 注入 | 每個主要概念一個 `##` |
| Back cover | `kind: back-cover` | 大 kicker、收束 statement、短 summary | 文件結尾與品牌收束 |

### Text Components

- **Paragraph**:處理脈絡、判斷、說明與轉折。單段不宜過長;若同段超過三個概念,改成列表或表格。
- **Ordered list**:表示流程、階段、優先順序。
- **Unordered list**:表示同層級規則、注意事項或檢查項。
- **Table**:比較角色、token、component、狀態與輸出規則。Markdown table 前使用 `<TableCaption>...</TableCaption>`,讓 renderer 自動編號。
- **Caption**:必須能獨立說明圖表用途,不只寫「示意圖」。

### Tables

表格使用 thin-rule style:上方主線、header 底線、row hairline、偶數列淡背景。密集表格的文字比正文小一級,但仍要保留足夠行高。

<TableCaption>表格使用規則</TableCaption>

| 表格類型 | 欄位建議 | 注意事項 |
| --- | --- | --- |
| 規格表 | token / value / usage | value 保持短,usage 說明使用情境 |
| 比較表 | item / rule / agent action | 避免超過四欄;長說明移到段落 |
| 檢查表 | check / pass condition / risk | 適合放在章末或封底 |

### Figures 與 Charts

圖片與圖表都要有 caption,並避免孤立在頁尾。一般圖片使用 `figure`;資料視覺化與大段可重用 HTML 都抽成 PascalCase React component,每個 component 是 `document/components/ComponentName.tsx` 或 `document/components/ComponentName/index.tsx`。

> **示範元件未隨 starter 提供完整 chart。** editorial-monograph 不預設打包任何 chart 或 bespoke component;專案需要時自己在 `document/components/` 下建立。

### Chart Rules

| 規則 | 說明 |
| --- | --- |
| 資料歸資料 | chart data 透過 React props 或鄰近的 typed data module 傳入,不寫死在 CSS |
| 樣式歸樣式 | chart frame、image grid 等視覺 pattern 優先做成 React component 並使用 Tailwind class;少數無法用 Tailwind 表達的細節才放在元件自己的 `style.css` |
| 元件歸元件 | 一個視覺 = 一個 `document/components/ComponentName/` 包;MDX 只保留 `<ComponentName />` 呼叫 |
| Caption 必填 | caption 只寫說明文字,不手寫圖號或表號;export pipeline 會替 content pages 的 figure/table 自動編號 |
| PDF-safe | 圖表需 `break-inside: avoid`,高度不可壓到 footer |

如果使用者要求新的視覺元件,Agent 應先更新本檔說明,再改對應的 `document/components/<name>/style.css` 或 `document/theme/` CSS,最後用 reader 預覽檢查 PDF 輸出。

---

## 4. CSS 權責

| 層級 | 位置 | 責任 |
| --- | --- | --- |
| open-press core | package runtime / `engine/` / `src/openpress/` | Pagination、export、validation、React reader runtime |
| Theme tokens | `document/theme/tokens.css` | CSS variables:color、font、spacing、chart token,不放 selector |
| Theme base | `document/theme/base/` | A4 page contract、MDX typography、figure、table、caption、print |
| Legacy compat CSS | `document/theme/page-surfaces/`, `document/theme/patterns/` | 舊 starter 相容層;新設計優先放 React/Tailwind |
| Component-owned CSS | `document/components/ComponentName/style.css` | React component 專用樣式 |
| Design Document | `document/design.md` | 說明目前 theme 的規格、取捨與驗收方式 |
| Generated output | `public/openpress/`, `dist-react/` | export/render 產物,不手動修改 |
