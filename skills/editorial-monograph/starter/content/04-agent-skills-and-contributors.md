---
chapter: 3
slug: agent-skills-contributors
title: Agent 互動、Skill 分工與貢獻者
---

## Agent 互動、Skill 分工與貢獻者

使用 Codex、CloudCode 或其他 CLI agent 時，建議直接要求它使用對應 skill。使用者不需要描述每一個檔案怎麼改，而是要說清楚文件目標、讀者、風格、限制，以及完成後要執行哪些驗證。

### 常用互動方式

| 目標 | 可以這樣說 |
| --- | --- |
| 從既有資料建立文件 | 請參考這一份文件（自行上傳），使用 `qdoc skill` 協助整理成 8 頁產品提案。保留既有事實，不要新增未確認的數字。 |
| 以風格起手建立新文件 | 請以 `editorial-monograph skill` 作為風格，使用 `qdoc skill` 建立一份研究報告。讀者是管理層，缺少的事實請標成 placeholder。 |
| 開啟本機審稿 | 請使用 `qdoc-rounddev skill` 打開本機 workbench，讓我檢查 Document、Design System 與 Project 狀態。 |
| 重寫章節 | 請使用 `qdoc-writing skill` 重整章節，讓第一章先講問題、第二章講方案，語氣維持正式研究報告。 |
| 調整版面 | 請使用 `qdoc-design skill` 調整 theme 與 components，讓文件維持 A4 長文閱讀節奏。 |
| 中文潤飾 | 請使用 `chinese-ai-writing-polish skill` 潤飾中文，保留原意，不要改成廣告文案。 |
| 部署檢查 | 請使用 `qdoc-deploy skill` 檢查部署設定，先跑 dry run，不要直接公開部署。 |

好的指令通常包含四件事：文件要給誰看、讀完要做什麼決策、哪些事實不能改、完成後要跑哪些驗證。若文件會公開上線，還應明確要求 Agent 不要新增未確認的客戶案例、數字、法律承諾或發布日期。

### Skill 分工

QDoc 使用 skill 讓 Agent 在不同層次工作。`qdoc` skill 負責協調邊界與驗證；本機審稿、部署、寫作、設計、風格與語言潤飾則由其他 skill 承擔。這樣做可以避免把所有規則硬寫進框架，也讓每份文件保有自己的風格。

| Skill | 主要用途 | 使用時機 |
| --- | --- | --- |
| `qdoc` | 文件邊界、workspace 探查、驗證、預覽、PDF 輸出 | 幾乎所有 QDoc 任務的協調層 |
| `qdoc-rounddev` | 本機 workbench、in-app browser、Document / Design / Project 審稿 | 使用者要一起看文件或給回饋 |
| `qdoc-deploy` | 部署設定、preflight、dry run、公開發布確認 | 準備上線或接前端部署按鈕 |
| `qdoc-writing` | 章節順序、敘事結構、表格與 caption 文案 | 建立、重寫或重整內容 |
| `qdoc-design` | theme、版面、page rhythm、components | 調整視覺系統與輸出穩定性 |
| `qdoc-style-pack-contributor` | style pack 設計、starter 契約、貢獻驗證 | 新增或改良 `skills/<pack>/starter/` |
| `editorial-monograph` | A4 嚴肅長文風格 | 報告、提案、白皮書、產品說明 |
| `chinese-ai-writing-polish` | 繁體中文專業潤飾、去除 AI 腔 | 公開文件、提案、網站與報告文案 |

RoundDev 是 QDoc 與使用者互動的基本入口。Agent 透過 `npm run dev` 打開 workbench，讓使用者在 Document、Design System 與 Project 三個視角中檢查內容。部署則由 `qdoc-deploy` 接手，先完成設定、preflight 與 dry run，再由使用者確認公開發布。

### Style pack 貢獻者

Style pack 是 QDoc 的重要概念。它不是單純的 CSS，而是把設計規則、starter 內容、theme、design-system 與可運行範例包在一起。Agent 可以用 style pack 建立工作區，再依照文件目的調整細節。

新的貢獻者角色先聚焦在 style pack 的設計。這個角色不需要一開始修改 engine，而是要把一種清楚的文件風格轉成可被 Agent 使用、可被使用者預覽、可被 CLI 驗證的 starter workspace。

貢獻 style pack 時，可以這樣要求 Agent：

```txt
請使用 qdoc-style-pack-contributor skill 設計一個新的 QDoc style pack。
這個 pack 面向需要固定版面輸出的長篇文件，請先定義視覺哲學、
starter 結構、design-system、theme tokens、頁面樣式與驗證方式。
```

`editorial-monograph` 的風格特徵是細線、克制色彩、A4 固定版面、serif 章首、sans 正文、TOC 與 figure/table 編號。它適合正式、長篇、需要交付 PDF 的文件，也能讓讀者在 showcase 中看見 QDoc 對固定版面文件的控制能力。
