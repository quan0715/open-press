# QDoc 使用說明

這份說明給 agent 在 QDoc workspace 中建立、修改、驗證文件時使用。本 repo 的核心原則是：可編輯來源集中在 `document/`，樣式實作放在 `document/theme/`，產物放在 `public/qdoc/` 與 `dist-react/`，不要手改產物。

## 最小完整文件

當使用者要先看一份可生成的示範文件，或 `document/content/` 不存在、太薄、缺少可預覽內容時，建立下列 5 個來源檔：

```txt
document/content/
  00-cover.md
  01-toc.md
  02-chapter-one.md
  03-chapter-two.md
  99-back-cover.md
```

Engine 掃 `content/*.md` 按檔名排序，依每個檔的 frontmatter `kind:`（cover / toc / chapter-opener / chapter / back-cover；缺省為 chapter）分派 renderer。`chapter` 數字與 `slug` 都是 optional，engine 會自動編號 / 從檔名推導。

這個最小文件要能產出：

- 封面：品牌、文件標題、主張、摘要，可含一張主視覺。
- 目錄：由 exporter 依章節頁面自動生成，不手寫目錄內容。
- 第一章：至少一個 `##` 標題與可閱讀段落。
- 第二章：至少一個 `##` 標題，並建議包含表格、圖表或重點列表，用來測試排版。
- 封底：結尾主張、摘要、品牌或聯絡資訊。

## Document 身份

Document title / subtitle / organization 放在 `qdoc.config.mjs`（或 nested layout 內的 `document/qdoc.config.mjs`），不放 frontmatter：

```js
export default {
  title: "QDoc 使用說明",
  subtitle: "AI-first fixed-layout document workflow",
  organization: "QDoc",
  // workspaceLabel 缺省 fallback 到 title
};
```

每個 `*.md` 自己用 frontmatter `kind:` / `title:` 標示自己的角色。`kind: chapter` 為缺省值；想要顯式 chapter 編號可寫 `chapter: N`，否則 engine 按 cover/toc/chapter-opener 之後出現順序自動編號。

## 封面範本

封面使用 `kind: cover`。內容可以用 HTML，因為封面通常需要較精準的排版 class。圖片路徑從 document root 解析，例如 `media/cover.jpg` 會對應到 `document/media/cover.jpg`。

```md
---
kind: cover
title: 封面
---

<header class="cover-meta">
  <span class="cover-meta-title">QDoc 使用說明</span>
</header>
<div class="cover-main">
  <h1 id="report-title" class="cover-title">QDoc</h1>
  <p class="cover-tagline">AI-first fixed-layout document workflow</p>
  <div class="cover-rule"></div>
  <p class="cover-subtitle">從內容、設計到 PDF 的可驗證文件流程。</p>
  <p class="cover-summary">這份文件示範如何用 QDoc 生成封面、目錄、章節與封底，並透過固定版面輸出可交付的 A4 文件。</p>
</div>
<footer class="cover-byline">
  <span>QDoc</span>
  <span>Usage Guide</span>
</footer>
```

## 目錄範本

目錄頁只需要占位檔。`engine/page-renderer.mjs` 會在 export 階段依章節頁自動注入目錄項目與頁碼；目錄頁不顯示 footer。

```md
---
kind: toc
title: 目錄
---

<!-- 目錄由 QDoc exporter 自動生成，請勿手寫。 -->
```

## 章節封面範本

章節封面使用 `kind: chapter-opener`，適合書籍、教材、手冊等章節相對獨立的文件。它不進正式目錄、不顯示 footer，也不取代真正的 `kind: chapter` 內容頁。

```md
---
kind: chapter-opener
chapter: 4
title: Linked List
subtitle: 鏈結串列
summary: 本章建立 node、pointer、insert/delete/reverse 的操作模型。
---

本章你會學到：

- node 與 pointer 的記憶體模型
- singly / doubly / circular linked list
- insertion、deletion、reverse 的操作成本
```

## 章節範本

章節使用一般 Markdown。每個 chapter file 至少要有一個 `##`；exporter 會把每個 `##` 拆成 A4 頁，並依 manifest 的 `chapter` 自動加上中文章節編號。

```md
---
kind: chapter
title: 建立工作流程
---

## 建立工作流程

QDoc 將文件製作拆成內容來源、媒體資產、元件包、設計樣式、渲染產物與驗證指令。Agent 應先編輯 `document/content/`、`document/media/` 或 `document/components/<name>/` 內的來源檔（含元件包自帶的 `data.json`），再重新 export，最後驗證輸出。

### 來源與產物

- `document/content/` 是唯一可編輯正文來源。
- `document/media/` 是圖片與二進位素材來源。
- `document/components/<name>/` 是文件專屬元件來源，每個資料夾自包成體（`data.json` + `style.css` ± `component.mjs` / `schema.json` / `README.md`）。Markdown 用 `<qdoc-component name="<package>" />` 插入。
- `document/theme/` 是文件視覺樣式來源。
- `public/qdoc/` 與 `dist-react/` 是生成產物，不手動修改。
```

第二章可加入表格或圖表，用來測試資料密度。

### LaTeX 公式

QDoc Markdown 支援以 KaTeX 伺服器端渲染 LaTeX 公式，適合論文、技術筆記與演算法推導。內容作者只寫公式語法，不手寫 KaTeX HTML。

Inline 公式：

```md
多項式可寫成 $A(x)=6x^5+5x^3-4x^2+8$，也可寫成 \(A(x)\)。
```

Display 公式：

```md
$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

\[
A(x)=6x^5+5x^3-4x^2+8
\]
```

若公式只是程式碼範例或字面文字，請放在 code span / code fence 內，例如 `` `$x^2$` ``，renderer 會保留原樣。

```md
---
kind: chapter
title: 驗證與輸出
---

## 驗證與輸出

完成內容或樣式變更後，先 export，再 validate。需要檢查頁面與 PDF 時，再執行 render 或 pdf。

表：常用指令

| 目的 | 指令 | 備註 |
| --- | --- | --- |
| 匯出文件模型 | `npm run qdoc:export` | 產生 `public/qdoc/document.json` |
| 驗證 workspace | `npm run qdoc:validate` | 檢查 QDoc 邊界 |
| 建置預覽 | `npm run qdoc:render` | 產生 `dist-react/` |
```

## 封底範本

封底使用 `kind: back-cover`，通常維持短句與品牌收束。

```md
---
kind: back-cover
title: 結尾
---

<div class="back-cover-main">
  <p class="back-cover-kicker">QDoc</p>
  <div class="back-cover-rule"></div>
  <p class="back-cover-statement">把文件寫作、設計與輸出變成可驗證流程。</p>
  <p class="back-cover-summary">內容從 `document/content/` 開始，樣式在 `document/theme/` 收斂，產物由 QDoc CLI 生成。</p>
</div>
<footer class="back-cover-byline">
  <span>QDoc</span>
  <span>Usage Guide</span>
</footer>
```

## 生成與驗證流程

每次新增或修改 `document/content/`、`document/components/`、`document/theme/`、`document/design-system/` 後，至少執行：

```bash
npm run qdoc:export
npm run qdoc:validate
```

需要建置瀏覽器預覽時：

```bash
npm run qdoc:render
```

需要 PDF 時：

```bash
npm run qdoc:pdf
```

需要互動工作區時：

```bash
npm run dev
```

## Design Workspace 文件

Design workspace 的定位不同於正式文件來源：

```txt
document/design-system/
  Design.md
  style-brief.md
  tokens.md
  components.md
  preview-scale.md
```

- `Design.md` 是這份 Design System Document 的封面與風格定位。
- `style-brief.md`、`tokens.md`、`components.md`、`preview-scale.md` 是同一份文件的章節與封底，不是另一套隱藏規格。
- `tokens.md` 應同時保留 visual specimen 與精確表格：typography 用左右分欄 specimen，color 用色票卡，表格則保留 token、value、usage 給 Agent 讀取。
- User 在 Design tab 看到的內容，就是 Agent 修改正式文件時要讀的設計來源；Agent 可以按任務讀單一章節，不需要每次載入整份 Design.md。
- Design workspace 前端應渲染 `document/design-system/*.md` 組成的 preview document，live panel 應使用 preview document 的 bookmarks 與 current-page state。
- Design Preview 不取代正式 `document/content/`，也不應手寫到 React component 裡。
- 不再維護 `document/design-system/demo/` 第二套 source；除非使用者明確要求獨立 sandbox，否則 design files 本身就是 preview。

## Theme CSS 分類

`document/theme/` 是正式文件與 Design Preview 共用的樣式來源。Agent 取用時依下列分類，不要把所有樣式都塞進 typography：

- `document/theme/tokens.css`：只放 CSS variables，例如 color、font、spacing、chart token；不放 selector。
- `document/theme/base/`：全域文件規則，例如 A4 page contract、cover、TOC、heading、paragraph、figure、table、caption、print。
- `document/theme/patterns/`：由 Markdown/HTML class 直接使用的具名視覺 pattern，例如 chart frame、色票、typography specimen、image grid。
- `document/theme/shell/`：匯出後包住文件的 reader controls；不要放 document typography 或內容元件。
- `document/components/<name>/style.css`：屬於 `<qdoc-component name="<name>">` 元件包的樣式（包含 component.mjs 自訂 renderer 與只靠 class 觸發的 style-only 兩種形態）。

## Agent 規則

- 先改 `document/content/*.md`，不要手改 `public/qdoc/document.json`。
- 大段可重用 HTML 應優先抽成 `<qdoc-component>`，一個視覺對應一個 `document/components/<name>/` 元件包，內含 `data.json`（資料）+ `style.css`（樣式）+ 可選 `component.mjs`（自訂 renderer）/ `schema.json` / `README.md`。
- Design preview 內容改 `document/design-system/*.md`，不要硬編碼在 React。
- Theme CSS 依 `tokens.css`、`base/`、`components/`、`shell/` 分層；component-specific 樣式不要放進 `base/typography.css`。
- 新文件至少包含 cover、toc、兩個 chapter、back-cover，除非使用者明確要求更小。
- 目錄只放占位，交給 exporter 生成。
- 不憑空加入數字、合作單位、成果、法律或財務承諾；需要使用者確認時用明確標記或先詢問。
- 內容生成後，執行 `npm run qdoc:export` 與 `npm run qdoc:validate` 才能說文件結構已通過。
