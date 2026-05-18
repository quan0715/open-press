---
kind: chapter
chapter: 2
slug: tokens-and-type-scale
title: Typography、Color 與 Spacing Tokens
---

## Typography Specimen

這一頁讓 User 直接檢查文字層級，也讓 Agent 看到每個 typography token 的規格。左側是 token 與數值，右側是實際文件語境的 sample。

<qdoc-component name="type-specimen" />

### Typography Scale

QDoc 初始模板使用兩組字體：正文與介面使用無襯線，封面與章節標題使用襯線，讓文件在資訊密度與 editorial 氣質之間取得平衡。

| 用途 | CSS selector / token | 字體 | 大小 | 字重 | 行高 / 字距 | 使用規則 |
| --- | --- | --- | --- | --- | --- | --- |
| Metric display | `.metric-display`, chart figure number | `--qd-font-body` | `34pt` | 700 | line-height `1`, letter `0` | 只用於資料圖表或單一重點數字 |
| Cover title | `.cover-title` | `--qd-font-serif` | `clamp(36px, 8.5cqw, 64px)` | 300 | line-height `1`, letter `0.01em` | 文件名稱或產品名，整份文件只在封面使用 |
| Cover tagline | `.cover-tagline` | `--qd-font-serif` | `clamp(14px, 2.4cqw, 20px)` | 300 | letter `0.08em` | 封面一句話定位，不承載長句 |
| Cover subtitle | `.cover-subtitle` | `--qd-font-body` | `10.5pt-12.5pt` | 400 | line-height `1.55` | 封面主說明，最多一段 |
| Chapter title | `h2` | `--qd-font-serif` | `14pt-17pt` | 300 | line-height `1.45`, letter `0.04em` | 每個 `##` 產生一個章節 bookmark |
| Section title | `h3` | `--qd-font-serif` | `11pt-13pt` | 400 | line-height `1.55`, letter `0.03em` | 用於章節內小節，不要過度切碎 |
| Minor heading | `h4` | `--qd-font-body` | `10pt-11pt` | 500 | muted, letter `0.04em` | 表格前提示或局部標題 |
| Body text | `p`, `li` | `--qd-font-body` | `9.5pt-10.5pt` | 400 | line-height `1.85` | 長文閱讀基準；不要用過短行距 |
| Table text | `table` | `--qd-font-body` | `8pt-9pt` | 400 / th 500 | line-height `1.45` | 密集資料，保持掃讀 |
| Caption | `figcaption`, `caption` | `--qd-font-body` | `7.5pt-8.5pt` | 400 | line-height `1.5`, letter `0.02em` | 圖表下方置中，需可自動編號 |

Agent 寫作時不應用「字變大」解決層級問題。若章節不清楚，先調整內容結構與 heading；若仍不足，再調整 token。

## Color Specimen

色票是視覺驗收工具，不取代表格規格。User 可以用這一頁判斷文件氣質；Agent 應依照每張色票的 usage 決定是否使用。

<qdoc-component name="token-swatch-grid" />

### Color Tokens

| Token | Value | 用途 |
| --- | --- | --- |
| `--qd-color-document` | `#ffffff` | A4 文件紙面、表格與圖表背景 |
| `--qd-color-ink` | `#161616` | 主文字、標題、主要線條 |
| `--qd-color-muted` | `#6f6f6f` | caption、頁碼、章節編號、輔助說明 |
| `--qd-color-line` | `#e0e0e0` | 表格列線、細分隔線 |
| `--qd-color-soft-line` | `#f4f4f4` | 輕量分隔、flow stage 內部線 |
| `--qd-color-app-bg` | `#161616` | Workbench 外層深色 chrome |
| `--qd-chart-gold` | `#FFB000` | 主要 chart accent、current / starting point |
| `--qd-chart-coral` | `#FF6A4D` | chart 第二層強調 |
| `--qd-chart-coral-deep` | `#C9522B` | chart 深層強調 |
| `--qd-chart-dark` | `#1F2328` | chart anchor / mature state |
| `--qd-status-warn` | `#C9522B` | 行內語意強調：風險、警示、注意（`.status-warn`） |
| `--qd-status-success` | `#5C8C4F` | 行內語意強調：達標、通過、確認（`.status-success`） |
| `--qd-status-info` | `#4A6B8A` | 行內語意強調：補充說明、註腳（`.status-info`） |

文件頁面以黑白灰為主，暖色只用在圖表與少量 emphasis。不要把整份文件改成單一強烈品牌色，也不要用大面積漸層當背景。

## Inline Emphasis

Markdown 內的文字強調走兩條路徑：

1. **MD 原生語法**：`**bold**` → `<strong>`，`*italic*` → `<em>`，`~~strike~~` → `<del>`，`` `code` `` → `<code>`，`[text](url)` → `<a>`，`<mark>text</mark>` → highlight。每個都已綁 token 樣式，不用手動加 class。
2. **語意強調色**：在 markdown 內以 `<span class="status-warn|status-success|status-info">` 標註。class 限制在三色 status，避免按色相命名（如 `.accent-gold`）破壞語意系統。

| Selector | 預設樣式來源 | 使用時機 |
| --- | --- | --- |
| `strong` | `font-weight: 600` + ink color | 段落內關鍵詞、列表 key term |
| `em` | serif italic + ink color | 引用、術語、書名 |
| `del` / `s` | muted + strike | 刪除、修正前後對照 |
| `code` | mono font + 淺背景 + padding | 路徑、識別字、命令 |
| `a` | ink + dotted underline | 超連結；underline 避免實線以區隔印刷正文 |
| `mark` | gold tint 背景 + ink | 「primary highlight」——一份文件只挑少量重點數字或關鍵句 |
| `.status-warn` | `--qd-status-warn` + 600 | 風險、延遲、警示語境 |
| `.status-success` | `--qd-status-success` + 600 | 已達標、通過、完成 |
| `.status-info` | `--qd-status-info` + 600 | 補充、註記、輔助資訊 |
| `.text-muted` | `--qd-color-muted` | 非語意性「再弱一級」 |

不提供 `<u>` underline 樣式——印刷上跟 `<a>` 撞，反而降低可讀性。若要強調，改用 `<strong>` 或 `<mark>`。

Block-level 強調（callout / warning / note）目前不在 design system 範圍；若文件需要區塊式提示，先評估是否能用既有 figure 或 table 表達。

## Chapter & Section Numbering

Engine 不在 h2/h3 內容前注入任何編號或前綴；pagination runtime 計數後寫入 `data-chapter` / `data-section` attribute（值是 `01`、`1.1` 這種兩位數阿拉伯格式）。實際顯示樣式由 theme 的 `::before content` 決定，這讓不同文件能挑不同 numbering vocabulary 而不動 engine。

預設（editorial-monograph 起手樣式）：

```css
/* document/theme/base/typography.css */
.report-page .page-body > h2:first-child::before {
  content: attr(data-chapter);   /* 顯示「02」 */
}

.report-page h3[data-section]::before {
  content: attr(data-section);   /* 顯示「2.1」 */
}
```

要換成「一、二、（一）（二）」風格，**不動 engine、不動 pagination**，只改 `typography.css` 的 `::before content`：

```css
@counter-style qj-cjk-decimal {
  system: cyclic;
  symbols: "一" "二" "三" "四" "五" "六" "七" "八" "九" "十";
  suffix: "、";
}

@counter-style qj-cjk-section {
  system: cyclic;
  symbols: "（一）" "（二）" "（三）" "（四）" "（五）"
           "（六）" "（七）" "（八）" "（九）" "（十）";
  suffix: "";
}

/* Chapter h2: 一、 */
.report-page .page-body > h2:first-child {
  counter-reset: qj-chapter calc(attr(data-chapter type(<integer>), 0));
}
.report-page .page-body > h2:first-child::before {
  content: counter(qj-chapter, qj-cjk-decimal);
}

/* Section h3: （一） */
.report-page h3[data-section] {
  counter-reset: qj-section calc(attr(data-section, "0") * 10);
}
.report-page h3[data-section]::before {
  content: counter(qj-section, qj-cjk-section);
}
```

或更簡單：用 `attr()` 不做 counter，直接在 attribute 做字串映射（CSS 沒這能力時就回到 `@counter-style`）。要 `Chapter 1` / `§1.1` / 純數字無前綴等等，都改一條 `content:` 即可。

要點：
- engine 只給 raw counter（`data-chapter="02"`、`data-section="2.1"`）
- 顯示是 theme 的責任
- 換樣式不需要改 markdown、不需要動 engine、不需要 rebuild pagination

## Spacing 與 CSS 權責

Spacing 定義頁面節奏，不是用來硬塞內容。若一頁過密，優先拆成新的 `##` 頁面，而不是縮小字級或移除留白。

### Spacing 與 Page Rhythm

| Token | Value | 用途 |
| --- | --- | --- |
| `--qd-space-1` | `2mm` | caption、局部小間距 |
| `--qd-space-2` | `4mm` | 段落、封面小區塊間距 |
| `--qd-space-3` | `6mm` | h3 前後、figure margin |
| `--qd-space-4` | `9mm` | h2 後、TOC 與大區塊 |
| `--qd-space-5` | `13mm` | 少數需要更大呼吸的頁面區塊 |

頁面節奏應該由 heading、paragraph、table、figure 的固定 spacing 自然形成，不用額外插入空白段落。固定版面中，寧可拆章節，也不要把過多內容硬塞在同一頁。

### Page Geometry

文件實體尺寸由三個 token 共同決定，page-contract 的 `@page`、reader runtime、shell measurement、PDF print route 都讀同一組值。要從 A4 換到 Letter / B5 / 16:9 投影片，改這三條即可，其他 CSS 不用動。

| Token | Value | 用途 |
| --- | --- | --- |
| `--qd-page-width` | `210mm` | 紙張寬；`@page size` 第一參數、`.reader-page` width、PDF 印出寬 |
| `--qd-page-height` | `297mm` | 紙張高；`@page size` 第二參數、`.reader-page` height、PDF 印出高 |
| `--qd-page-margin` | `18mm` | `@page margin`（CSS print 邊距，不是 body 內容 padding） |

切到非 A4 的範例：

```css
/* Letter (8.5 × 11 in) */
--qd-page-width: 215.9mm;
--qd-page-height: 279.4mm;

/* B5 */
--qd-page-width: 176mm;
--qd-page-height: 250mm;

/* 16:9 投影片（landscape） */
--qd-page-width: 297mm;
--qd-page-height: 167mm;
```

body 內容區的 page padding（content margin）由 `.reader-page` 內的 `--page-margin-*` 變數控制，與 `--qd-page-margin` 是兩件事。前者是「內容到頁面邊緣的距離」，後者是「@page CSS 邊距」（PDF 印出時的物理邊距）。

### CSS 權責

| 層級 | 位置 | 責任 |
| --- | --- | --- |
| QDoc core | package runtime / `engine/` / `src/qdoc/` | Pagination、export、validation、React reader runtime |
| Theme tokens | `document/theme/tokens.css` | CSS variables：color、font、spacing、chart token，不放 selector |
| Theme base | `document/theme/base/` | A4 page contract、cover、TOC、heading、paragraph、figure、table、caption、print |
| Theme patterns | `document/theme/patterns/` | Markdown/HTML class pattern：chart frame、色票、typography specimen、image grid |
| Component-owned CSS | `document/components/<name>/style.css` | `<qdoc-component>` renderer 專用樣式 |
| Theme shell | `document/theme/shell/` | Exported reader controls，不放文件 typography |
| Design System Document | `document/design-system/*.md` | 說明目前 theme 的規格、取捨與驗收方式 |
| Generated output | `public/qdoc/`, `dist-react/` | export/render 產物，不手動修改 |
