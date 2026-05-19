---
kind: chapter
chapter: 3
slug: components-and-charts
title: 文件元件與圖表規則
---

## 文件元件與圖表規則

這一章定義 QDoc 生成文件時可以使用的核心元件。Agent 新增內容時，應先判斷資訊類型，再選擇 paragraph、table、figure、chart 或 checklist，而不是為了視覺豐富度任意加入卡片。

### Page Surfaces

| 元件 | Source 寫法 | 視覺規則 | Agent 使用時機 |
| --- | --- | --- | --- |
| Cover | `kind: cover` + HTML cover block | logo 左上、meta 右上、serif 大標、短 subtitle、可選 hero image | 文件開場，建立文件身份 |
| TOC | `kind: toc` 或 exporter 插入 | 自動收集 `##`，顯示章節頁碼 | 不手寫目錄內容 |
| Chapter page | `##` heading | h2 產生章節頁與 bookmark，章節號由 renderer 注入 | 每個主要概念一個 `##` |
| Back cover | `kind: back-cover` | 大 kicker、收束 statement、短 summary | 文件結尾與品牌收束 |

### Text Components

- **Paragraph**：處理脈絡、判斷、說明與轉折。單段不宜過長；若同段超過三個概念，改成列表或表格。
- **Ordered list**：表示流程、階段、優先順序。
- **Unordered list**：表示同層級規則、注意事項或檢查項。
- **Table**：比較角色、token、component、狀態與輸出規則。表格前使用 `表：` caption，讓 exporter 自動編號。
- **Caption**：必須能獨立說明圖表用途，不只寫「示意圖」。

### Tables

表格使用 thin-rule style：上方主線、header 底線、row hairline、偶數列淡背景。密集表格的文字比正文小一級，但仍要保留足夠行高。

表：表格使用規則

| 表格類型 | 欄位建議 | 注意事項 |
| --- | --- | --- |
| 規格表 | token / value / usage | value 保持短，usage 說明使用情境 |
| 比較表 | item / rule / agent action | 避免超過四欄；長說明移到段落 |
| 檢查表 | check / pass condition / risk | 適合放在章末或封底 |

### Figures 與 Charts

圖片與圖表都要有 caption，並避免孤立在頁尾。一般圖片使用 `figure`；資料視覺化與大段可重用 HTML 都抽成 `&lt;qdoc-component name="..." /&gt;`，每個 component 是 `document/components/<name>/` 下的一個自包成體（`data.json` + `style.css` ± `component.mjs`）。

> **示範元件未隨 starter 提供。** editorial-monograph 不預設打包任何 chart 或 bespoke component；專案需要時自己在 `document/components/` 下建立。`tokens.md` 內的 `type-specimen` / `token-swatch-grid` 是 design-system 用的兩個 generic 示範元件，已隨 starter 提供。

### Chart Rules

| 規則 | 說明 |
| --- | --- |
| 資料歸資料 | chart data 放在元件包內 `data.json`，不寫死在 CSS |
| 樣式歸樣式 | chart frame 等通用規則放在 `document/theme/patterns/`；變體 CSS 放在元件自己的 `style.css` |
| 元件歸元件 | 一個視覺 = 一個 `document/components/<name>/` 包；Markdown 只保留 `&lt;qdoc-component name="..." /&gt;` 呼叫 |
| Caption 必填 | caption 說明圖表要證明什麼，不只描述圖形 |
| PDF-safe | 圖表需 `break-inside: avoid`，高度不可壓到 footer |

如果使用者要求新的視覺元件，Agent 應先更新 `document/design-system/` 說明，再改對應的 `document/components/<name>/style.css` 或 `document/theme/` CSS，最後用 Design Preview 檢查 reader 與 PDF 輸出。
