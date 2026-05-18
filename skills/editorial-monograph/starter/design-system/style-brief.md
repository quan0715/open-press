---
kind: chapter
chapter: 1
slug: style-positioning
title: 風格目標與使用場景
---

## 風格目標與使用場景

QDoc 初始模板面向長文件，而不是單頁網站或 dashboard。它要支援課程講義、提案、報告、白皮書、產品文件與公開說明文件，重點是穩定閱讀、可輸出、可被 AI 持續修改。

這套風格的基調是「安靜、可信、可交付」。文件使用白底、近黑文字、細線分隔、低彩度輔助資訊與少量暖色圖表色。章節標題保留 editorial 感，但正文、表格與圖表仍優先服務資訊密度。

### 設計原則

| 原則 | 規則 | Agent 操作提醒 |
| --- | --- | --- |
| 文件優先 | 第一眼應該像可交付的 A4 文件，不像 landing page | 不要加入 hero marketing section、浮動卡片或裝飾性背景 |
| 規格透明 | User 看到的 Design page 就是 Agent 依循的 design source | 修改風格時先更新 `document/design-system/`，再更新 `document/theme/` |
| 來源可改 | 內容從 Markdown、JSON 與 media assets 產生 | 不把關鍵文字或數據鎖死在截圖或手寫 SVG |
| 輸出穩定 | 所有樣式要支援 reader、mobile preview 與 PDF | 避免 uncontrolled overflow、孤立 caption 與跨 footer 元件 |

### 使用場景

這份 design system 適合需要被仔細閱讀、審查或交付的文件。它不追求活潑動態，而是讓讀者能快速判斷文件結構與資訊可信度。

| 場景 | 適合原因 | 不適合方向 |
| --- | --- | --- |
| 提案與商業報告 | 需要清楚章節、數據、圖表與結論 | 過度銷售語氣、滿版裝飾 |
| 課程講義與白皮書 | 需要長文閱讀與穩定分頁 | 插畫密集或社群貼文式排版 |
| 產品文件與說明書 | 需要流程、規格、表格與檢查清單 | Dashboard-like 操作面板 |
| Design System Manual | 需要 user 與 Agent 看到同一份規格 | 另一套 token gallery 或 demo source |

### User 與 Agent 的分工

User 檢查這份文件時，主要判斷「這是不是我要的文件風格」。Agent 閱讀這份文件時，主要判斷「接下來生成正式文件時要遵守哪些規格」。

| 角色 | 讀這份文件時要取得的資訊 | 主要章節 |
| --- | --- | --- |
| User | 風格是否符合品牌、文件是否易讀、輸出是否可信 | 全文 |
| Agent | 語氣、字級、色彩、元件規則、驗收清單 | `style-brief.md`, `tokens.md`, `components.md` |
| QDoc renderer | source mapping、bookmarks、page state、PDF-safe preview | `document/design-system/*.md` |
