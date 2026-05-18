# QDoc

QDoc 是一個 **為 AI 協作設計的固定版面文件工作區**。

它的目的不是讓人手動排版每一頁，而是讓使用者可以透過 Codex、CloudCode 或其他 AI agent 來製作需要固定視覺樣式的長篇文件。

使用者負責目的、事實與最終判斷；agent 負責整理內容、調整結構與設計；QDoc 負責把文件邊界、驗證、預覽與 PDF 輸出固定下來。

> Status: v0。此 repo 是 QDoc framework checkout；npm packages（`@qdoc/cli` / `@qdoc/core` / `@qdoc/react`）尚未發布。

## 適用範圍

QDoc 適合用在「內容會反覆修改，但版面風格需要穩定」的文件工作：

- 計畫書、提案書、標案文件
- 白皮書、研究報告、產品規格
- 書本、手冊、教材、長篇專題
- 論文、技術報告、內部知識文件
- 報章雜誌、專刊、品牌刊物等長文編輯

如果文件需要一致的封面、章節、圖表、註腳、頁面節奏與 PDF 輸出，QDoc 會比一般聊天式寫作或自由排版工具更適合。它把「可由 AI 編輯的內容」和「必須穩定交付的版面」分開，讓長文件可以持續迭代。

## QDoc 提供什麼價值

- **讓 AI 有明確邊界**：agent 編輯 Markdown、theme、components 與 media，不直接改生成產物。
- **讓文件可以穩定交付**：同一份 source 可以驗證、預覽、render，最後輸出 A4 PDF。
- **讓設計不是空白畫布**：style pack 先提供可工作的版面與設計規則，agent 在框架內調整。
- **讓長文件可維護**：內容、元件、媒體、設計系統與輸出流程分層管理。
- **讓使用者保有控制權**：重要事實、商業數字、法律承諾與公開部署，都需要使用者確認。

## 我們怎麼跟 QDoc 互動

這個專案基本上就是為了 AI 互動而設計。日常工作不是手改產物，而是用自然語言指揮 agent 修改可維護的 source files。

核心流程：

1. 從一個 style pack 建立文件工作區。
2. 用自然語言告訴 agent 要寫什麼、改什麼、調整什麼。
3. Agent 編輯 source files：`content/`、`theme/`、`components/`、`media/`。
4. 執行驗證與輸出：`qdoc:validate`、`qdoc:export`、`qdoc:pdf`。
5. 使用者預覽、修正事實、確認版本。

QDoc 不取代使用者的判斷；它提供一個讓 AI 可以安全工作的文件生產環境。

## 透過 Codex 或 CloudCode 使用

QDoc 的預期用法是直接要求 agent 載入對應 skill。你不需要一開始指定每個檔案怎麼改；只要說清楚文件目標、讀者、限制，並要求 agent 完成後驗證。

可以這樣說：

```txt
請參考這一份文件（自行上傳），使用 qdoc skill 協助把它整理成給投資人看的 8 頁提案。
保留既有事實，不要新增未確認的數字。完成後跑 validate 和 pdf。
```

```txt
請以 editorial-monograph skill 作為風格，使用 qdoc skill 幫我建立一份研究報告。
主題是產品導入評估，讀者是管理層，先用 placeholder 標出需要我補充的事實。
```

```txt
請使用 qdoc-writing skill 幫我重寫章節，讓第一章先講問題、第二章講方案。
語氣要像正式研究報告，保留原本已確認的事實。
```

```txt
請使用 qdoc-design skill 幫我調整版面、theme 和 components，
讓這份文件符合 editorial-monograph 的風格。完成後提供預覽與驗證結果。
```

```txt
請使用 qdoc-rounddev skill 打開本機 workbench，讓我先看文件、Design System 和 Project 狀態。
我確認後再進入部署流程。
```

```txt
請使用 qdoc-deploy skill 幫我檢查部署設定。
先做 dry run，不要直接公開部署；需要我確認 project name 和目標網址。
```

```txt
請使用 qdoc-style-pack-contributor skill 協助我設計一個新的 QDoc style pack。
先聚焦在視覺哲學、starter 架構、design-system、theme tokens 與驗證方式。
```

```txt
請使用 chinese-ai-writing-polish skill 幫我潤飾中文。
保留原意，不要新增事實，也不要把語氣改得像廣告文案。
```

常用 skill 分工：

- `qdoc`：協調文件邊界、驗證、預覽、PDF 輸出。
- `qdoc-rounddev`：打開本機 workbench，讓 User 和 Agent 共同檢查文件。
- `qdoc-deploy`：部署設定、preflight、dry run、公開發布確認。
- `qdoc-writing`：章節重寫、語氣調整、內容整理。
- `qdoc-design`：版面、theme、components 與設計系統。
- `qdoc-style-pack-contributor`：新增或改良 style pack 的貢獻者工作流。
- `editorial-monograph`：目前內建的 A4 monograph 風格。
- `chinese-ai-writing-polish`：中文潤飾與去 AI 味。

## 建立文件工作區

`qdoc init <target>` 會在空資料夾建立新的 QDoc workspace：

```bash
node engine/cli.mjs init ~/projects/my-document --skill editorial-monograph
```

## 常用指令

```bash
npm run dev               # 開啟 workbench
npm run qdoc:validate     # 驗證 workspace 結構
npm run qdoc:export       # 產生 public/qdoc/document.json
npm run qdoc:render       # 建置 dist-react/
npm run qdoc:preview      # 預覽 production build
npm run qdoc:pdf          # 輸出 PDF
npm run qdoc:deploy:dry-run # 檢查部署流程，不公開發布
npm run qdoc:deploy -- --confirm # 確認後公開部署
npm test                  # framework tests
```

CLI 也可直接使用：

```bash
node engine/cli.mjs --help
```

## Workspace 長什麼樣子

初始化後的文件專案大致如下：

```txt
my-document/
  AGENTS.md
  README.md
  package.json
  qdoc.config.mjs

  content/          # Markdown 正文來源
  design-system/    # 設計規則，也可被預覽成文件
  components/       # 文件專屬視覺元件
  media/            # 圖片與素材
  theme/            # CSS tokens、版面、typography、print rules
```

QDoc framework repo 另外包含：

```txt
engine/             # Node CLI 與 render pipeline
src/                # React/Vite workbench
skills/             # bundled skills 與 style packs
spec/qdoc/          # framework specs
tests/              # node --test 測試
document/           # git-ignored，本機測試文件
```

## Style packs

QDoc workspace 從 style pack 開始。Style pack 是一組文件設計規則，加上一份可直接運行的 `starter/`。

目前內建：

| Pack | 狀態 | 適合 |
| --- | --- | --- |
| `editorial-monograph` | shipped | A4 monograph、提案、白皮書、研究報告 |

新增 style pack 時，建立：

```txt
skills/<name>/
  SKILL.md
  starter/
```

只要有 `starter/`，QDoc engine 就會自動發現。

Style pack 貢獻者應先定義清楚的視覺哲學，再把它落到 starter workspace。不要讓一個 pack 同時服務所有風格；一個 pack 應該代表一種可辨識、可延伸、可驗證的文件語氣。

貢獻 style pack 時，可以請 agent 這樣工作：

```txt
請使用 qdoc-style-pack-contributor skill 設計一個新的 style pack。
這個 pack 面向正式技術白皮書，請先建立設計原則、starter 結構、theme tokens、
design-system 文件與最小可驗證內容。不要放入未授權素材或特定客戶資訊。
```

Style pack 的基本交付：

- `skills/<name>/SKILL.md`：何時使用、風格原則、Agent 操作邊界。
- `skills/<name>/starter/qdoc.config.mjs`：文件中繼資料與 workspace 設定。
- `skills/<name>/starter/content/`：可直接預覽的最小文件。
- `skills/<name>/starter/design-system/`：公開可讀的設計規則與 review checklist。
- `skills/<name>/starter/theme/`：tokens、typography、page surfaces、print rules。
- `skills/<name>/starter/components/`：必要時放入可重用視覺元件。

## Framework 開發者

如果你是在修改 QDoc 本身，可以編輯：

- `engine/`
- `src/`
- `skills/`
- `spec/qdoc/`
- `tests/`
- root config files

不要提交 `document/`、`public/qdoc/`、`dist-react/`、`.deploy/` 或其他生成內容。

若要在這個 framework checkout 裡驗證一份本機文件：

```bash
npm install
mkdir -p document
cp -r skills/editorial-monograph/starter/. document/

npm run dev              # http://127.0.0.1:5173/?dev=1
npm run qdoc:validate
npm run qdoc:pdf
```

框架變更後至少執行：

```bash
npm run typecheck
npm test
```
