---
chapter: 2
slug: workflow
title: User Guide：手把手上手 QDoc
---

## User Guide：手把手上手 QDoc

QDoc 的使用方式不是先學會每個檔案怎麼改，而是用自然語言帶著 Agent 完成一份固定版面文件。User 負責說明目的、提供事實與做最後判斷；Agent 依照 skill 編輯 source files；QDoc 負責預覽、驗證、PDF 與部署流程。

### Step 1：準備文件目標

開始前，User 只需要準備三件事：這份文件要給誰看、讀者看完要做什麼決策、哪些事實不能由 Agent 自行補充。若已有素材，可以上傳簡報、草稿、訪談逐字稿、研究筆記或既有文件；若還沒有素材，也可以先請 Agent 產生一份需要 User 補事實的草稿。

可以這樣說：

```txt
請參考這一份文件（自行上傳），使用 qdoc-writing skill 幫我整理成一份產品說明文件。
讀者是第一次接觸 QDoc 的使用者。保留既有事實，不要新增未確認的數字。
```

### Step 2：選擇文件風格

QDoc 從 style pack 起手。Style pack 會提供可運行的 starter、版面節奏、字體、顏色、封面、章節、表格與 PDF 輸出規則。User 不需要先設計整套視覺系統，只要指定文件需要的風格方向。

如果是從 GitHub 開始，可以先取得 QDoc framework：

```bash
git clone https://github.com/quan0715/qdoc.git
cd qdoc
npm install
npm run dev
```

例如：

```txt
請以 editorial-monograph skill 作為風格，使用 qdoc-writing skill 建立文件。
我希望它像正式白皮書，不要像行銷 landing page。
```

### Step 3：讓 Agent 編輯 source files

| 位置 | 用途 | 常見 Agent 任務 |
| --- | --- | --- |
| `content/` | 正文、封面、目錄、章節、封底 | 重寫章節、調整順序、加入表格 |
| `design-system/` | 文件風格說明，也是可預覽的設計文件 | 說明風格規則、紀錄設計決策 |
| `theme/` | CSS tokens、版面、typography、print rules | 調整字體、顏色、頁面節奏 |
| `components/` | 文件專屬圖表或視覺元件 | 抽出可重用資料視覺 |
| `media/` | 圖片與二進位素材 | 整理封面圖、插圖、照片 |

User 可以直接描述想改什麼，不需要指定檔案路徑。Agent 會回到這些 source files 編輯，而不是手改生成產物。這讓文件能被版本控制、能被驗證，也能在多輪修改後維持同一套設計。

### Step 4：打開本機 workbench 一起看稿

QDoc 本機 workbench 是 User 和 Agent 共同工作的預設入口。Agent 透過 `qdoc` skill 打開本機 workbench，User 在瀏覽器裡檢查三個視角：Document 看正式文件、Design System 看風格規則、Project 看來源與素材狀態。

可以這樣說：

```txt
請使用 qdoc skill 打開本機 workbench。
我會看 Document、Design System 和 Project，再告訴你要調整哪裡。
```

### Step 5：用回饋迭代到可交付

審稿時，User 可以用自然語言指出問題：某章太抽象、表格太密、語氣太像廣告、缺少新手指引、或部署設定還不清楚。Agent 會把回饋轉成內容、設計或 workflow 變更，完成後重新 export 與 validate。

常見回饋方式：

| User 想做的事 | 可以怎麼說 |
| --- | --- |
| 改寫章節 | 這章改成 user guide，請手把手帶新手上手。 |
| 調整語氣 | 這段不要像宣傳文，改成產品文件的語氣。 |
| 補工作流 | 加上我應該怎麼下 prompt、Agent 會做什麼、我需要確認什麼。 |
| 檢查交付 | 跑 export、validate 和 PDF，確認可以公開給其他 user 看。 |

### Step 6：輸出或部署

文件可交付前，Agent 應先跑 `qdoc:export`、`qdoc:validate`，必要時再跑 `qdoc:pdf`。若要公開上線，改用 `qdoc-deploy` 進入部署流程；部署前必須確認 target project、公開網址、授權素材與文件中的事實。

常見部署檢查如下：

```bash
npm run qdoc:export
npm run qdoc:validate
npm run qdoc:pdf
npm run qdoc:deploy:dry-run
```

真正公開發布時，再由 User 明確確認目標專案：

```bash
npm run qdoc:deploy -- --confirm
```
