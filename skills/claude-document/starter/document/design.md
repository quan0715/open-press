# Claude Document 樣式規格

> Claude-like A4 文件樣式:暖紙張、細線、清楚章節、安靜的 editorial 節奏與可被 AI 穩定維護的內容區塊。
> 本文件給內容作者、AI 編輯助手、style pack contributor 共用。

---

## 1. 風格目標與使用場景

這套樣板面向 Claude-style 工作文件:可以是筆記、研究摘要、產品 brief、規格草稿、教材、提案或內部說明。它不是簡報、海報或科技感 landing page,而是一套能列印、能標註、能長時間閱讀的 A4 文件系統。

風格基調是溫暖、理性、乾淨。頁面使用米白紙紋背景、深藍灰標題、霧藍細線與淡實色資訊區塊;裝飾只保留必要的章節標籤、表格線、caption 與簡單概念圖。

### 設計原則

| 原則 | 規則 | Agent 操作提醒 |
| --- | --- | --- |
| 文件優先 | 第一眼像正式工作文件,不像投影片或宣傳頁 | 不加入大面積深色背景、炫光、電路紋或複雜裝飾 |
| 紙面一致 | 每張 A4 頁面共用淡紙紋與極弱縱向節奏 | 背景只能提供紙本感,不應搶過正文 |
| 可被 AI 維護 | prose、table、figure、caption 各自有清楚職責 | 不把關鍵結論鎖在截圖或不可編輯 SVG |
| 一圖一概念 | 一張圖只說明一個關係、決策或狀態變化 | 不把定義、流程、風險與結論塞進同一張圖 |
| 公開可交付 | Starter 不放私人名稱、客戶資料、部署密鑰 | 文件可以作為新專案起點,不是個人作業紙 |
| 輸出穩定 | 所有樣式支援 reader、mobile preview 與 PDF | 避免 uncontrolled overflow、孤立 caption 與跨 footer 元件 |

### 使用場景

| 場景 | 適合原因 | 不適合方向 |
| --- | --- | --- |
| 工作筆記 | 需要脈絡、決策、證據與下一步共存 | 鬆散聊天紀錄 |
| 產品 brief / spec | 需要清楚章節、表格、風險與輸出 | Dashboard-like 操作面板 |
| 研究摘要 | 需要長文閱讀、引用式說明與圖表 | 過度行銷語氣 |
| 教材與公開說明 | 需要可列印、可投影、可批註 | 花俏簡報版型 |

---

## 2. Tokens

### Typography Scale

Claude Document 以 sans 作為主要閱讀字體,讓正文、表格與長段落保持穩定;H1/H2/H3 與目錄標題使用 serif display stack,讓主要章節有 editorial title 的質感;需要呈現程式碼、路徑或識別字時使用 monospace。

若 style pack 後續引入非系統字體,字型檔必須放在 `document/theme/fonts/`,並由 `document/theme/fonts.css` 的 `@font-face` 載入。不要只依賴 `local(...)`,否則公開頁面、iPad 與 PDF 可能不一致。

| 用途 | CSS selector / token | 字體 | 大小 | 使用規則 |
| --- | --- | --- | --- | --- |
| 封面主標 | `.cover-title` | `--openpress-font-serif` | notebook cover scale | 文件名稱或工作主題;不放私人填寫欄位 |
| H2 章節標題 | `h2` | `--openpress-font-serif` | 約 26pt 視覺層級 | 每個 `##` 產生主要章節與 bookmark |
| H3 子章節標題 | `h3` | `--openpress-font-serif` | 約 18pt 視覺層級 | 章節內概念分段 |
| H4 項目標題 | `h4` | `--openpress-font-body` | 約 13pt 視覺層級 | 局部規則、操作、風險或小型 procedure |
| 內文 | `p`, `li` | `--openpress-font-body` | 約 11pt 系統層級 | 長文閱讀基準 |
| 程式碼 / literal | `pre code`, `code` | `--openpress-font-mono` | 約 10.5pt 系統層級 | 程式碼區塊、識別字、命令、路徑 |
| 表格內容 | `table` | `--openpress-font-body` | 約 10.5pt 系統層級 | 規格表、比較表、決策表、檢查表 |
| caption | `figcaption`, `caption` | `--openpress-font-body` | 約 9pt 系統層級 | 圖表下方置中,由 renderer 自動編號 |

### Color Tokens

| Token | 用途 |
| --- | --- |
| `--openpress-color-document` | 淡黃紙;封面、目錄、內文共用頁面底紙 |
| `--openpress-color-ink` | 深藍灰;標題、主線條、章節標籤 |
| `--openpress-color-body` | 深灰;正文閱讀文字 |
| `--openpress-color-muted` | 霧藍;輔助標題、頁碼、次要線條 |
| `--openpress-color-soft-line` | 淡黃灰;程式碼、表頭、區塊背景 |
| `--openpress-color-block` | code block 與圖表的淡實色底;蓋住頁面格線 |

文件頁面以淡黃紙為統一底色,搭配深藍灰文字與少量霧藍輔助資訊。色彩服務文件層級,不做強烈科技感或裝飾性漸層。

### Page Geometry

文件實體尺寸由 page geometry token 共同決定,page-contract 的 `@page`、reader runtime、shell measurement、PDF print route 都讀同一組值。切頁模式下每一張 `.reader-page` 都必須維持固定 page ratio;若內容超出,應回到 pagination / component overflow 修正,不能讓單張頁面自行長高。

| Token | Default | 用途 |
| --- | --- | --- |
| `--openpress-page-width` | `210mm` | 紙張寬 |
| `--openpress-page-height` | `297mm` | 紙張高 |
| `--openpress-page-aspect-ratio` | `210 / 297` | CSS `aspect-ratio` |
| `--openpress-page-height-ratio` | `1.4142857143` | responsive height 計算 |
| `--openpress-page-margin` | `18mm` | `@page` CSS print 邊距 |

---

## 3. Components

### Page Surfaces

| 元件 | Source 寫法 | Agent 使用時機 |
| --- | --- | --- |
| Cover | `kind: cover` + cover JSX | 文件開場,建立文件身份 |
| TOC | `kind: toc` 或 exporter 插入 | 不手寫目錄內容 |
| Chapter opener | `kind: chapter-opener` | 書籍、教材、手冊等章節相對獨立的文件 |
| Chapter page | `##` heading | 每個主要概念一個 `##` |
| Back cover | `kind: back-cover` | 文件結尾與品牌收束 |

### Text Components

- **Paragraph**:處理脈絡、判斷、說明與轉折。
- **Ordered list**:表示流程、階段、優先順序。
- **Unordered list**:表示同層級規則、注意事項或檢查項。
- **Code block**:只在需要 literal、命令或程式碼時使用;完整大型檔案應拆成附錄或 repo link。
- **Table**:比較角色、規則、風險、決策、狀態追蹤與 edge cases。
- **Caption**:必須能獨立說明圖表用途,不只寫「示意圖」。

### Tables

Markdown table 前使用 `<TableCaption>...</TableCaption>`,內容只寫說明文字;runtime 會輸出 `表 N：...`。不要手寫表號,也不要使用舊 `表：...` marker。

<TableCaption>表格使用規則</TableCaption>

| 表格類型 | 欄位建議 | 注意事項 |
| --- | --- | --- |
| 決策表 | option / tradeoff / decision | 讓讀者快速比較選項 |
| 追蹤表 | step / state / result | 適合流程、審稿、狀態變化 |
| 比較表 | item / rule / action | 避免超過四欄;長說明移到段落 |

### Figures

Figure component 應輸出標準 `<figure><figcaption>...</figcaption></figure>`。`figcaption` 只放 caption 文字,不放手寫圖號;runtime 會依 content pages 的 DOM 順序產生可見的 `圖 N：` / `表 N：` 前綴,並加上統一的 `data-openpress-caption="true"` 與 `data-openpress-caption-label`。

### Diagram Rules

| 規則 | 說明 |
| --- | --- |
| 一圖一概念 | 圖表標題與 caption 要能回答「這張圖說明什麼關係」 |
| 資料歸資料 | chart data 透過 React props 或鄰近 data module 傳入,不寫死在 CSS |
| 樣式歸樣式 | chart frame 等通用規則放在 `document/theme/patterns/` |
| 元件歸元件 | 一個可重用視覺 = 一個 `document/components/ComponentName/` 包 |

---

## 4. CSS 權責

| Layer | Path | Owns |
| --- | --- | --- |
| Tokens | `document/theme/tokens.css` | 色彩、字體、間距、page geometry |
| Fonts | `document/theme/fonts.css` | webfont import / bundled font-face |
| Base | `document/theme/base/` | page contract、typography、table、figure、caption、print |
| Page surfaces | `document/theme/page-surfaces/` | cover、TOC、chapter opener、back cover |
| Patterns | `document/theme/patterns/` | chart frame、figure grid、table utilities |
| Shell | `document/theme/shell/` | reader controls around the document |
| Components | `document/components/<Component>/style.css` | component-local visuals |

Generated files in `public/openpress/`, `dist-react/`, and `.deploy/` are output only. Do not hand-edit them.
