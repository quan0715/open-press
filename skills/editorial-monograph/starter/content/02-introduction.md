---
chapter: 1
slug: introduction
title: 起手範例：editorial-monograph 怎麼讀
---

## 起手範例：editorial-monograph 怎麼讀

這份文件示範 editorial-monograph 風格的基本排版：serif 章首 + sans body、hairline 分隔、固定 A4 節奏。Agent 收到 user 指令後，請以這份起手樣板為基礎改寫；不必保留示範文字，但保留 frontmatter 與檔名前綴（決定排序）。

### 段落、列表與強調

正文採無襯線、行距 1.85，適合長篇閱讀。重點詞用 `**粗體**` 標示，例如 **核心論點**；補述用 *斜體*（serif italic）營造引用感。狀態用語意 class：

- 已驗證或達標：<span class="status-success">成功標示</span>
- 風險或延遲：<span class="status-warn">警示標示</span>
- 補充資訊或註腳：<span class="status-info">註記標示</span>
- 弱化前一句的語氣：<span class="text-muted">輔助說明</span>

短列表三到五項最舒服，超過就改成表格。

### 表格與密集資料

editorial-monograph 預設表格走 thin-rule，header 帶下劃線、列邊用 hairline、偶數列淡背景。表前用「表：」開頭的 caption 觸發自動編號。

表：起手三個必確認決策
| 決策項 | 預設 | 何時該改 |
| --- | --- | --- |
| 紙張尺寸 | A4（210mm × 297mm） | 出 letter / B5 / 16:9 投影片時改 `--qd-page-*` token |
| 章節編號 | `01` `02` / `1.1` | 想換「一、二、（一）」改 `theme/base/typography.css` 的 `::before content` |
| 預設字體 | Noto Serif TC（serif） + IBM Plex Sans（sans） | 換品牌字體改 `tokens.css` 的 `--qd-font-serif` / `--qd-font-body` |

### 圖片與圖表

單張圖直接用 markdown 語法 `![alt](media/x.jpg "圖：說明")`，engine 會自動編成「圖 N：說明」。多張並列用 `<div class="figure-grid">`：

<div class="figure-grid">
  <figure><img src="media/placeholder-1.svg" alt=""><figcaption>並排圖一</figcaption></figure>
  <figure><img src="media/placeholder-2.svg" alt=""><figcaption>並排圖二</figcaption></figure>
</div>

資料圖表用 `<qdoc-component>`，data 與 style 都自包在 `document/components/<name>/`。詳見 `document/design-system/components.md`。

### 換成你自己的內容

刪掉這個檔案、新增 `03-...md` / `04-...md` / ... 排序檔名即可（章節編號 engine 自動算）。需要更深規則時讀 `document/design-system/` 內各 chapter。
