---
title: "生命週期"
eyebrow: "CLI · 第一層"
description: "每個 workspace 使用的五個標準指令 — create / dev / build / preview / typecheck。形狀與 Vite 或 Astro 相同，沒有 openpress: 前綴。"
---
<p>
    第一層涵蓋了日常的 workspace 循環：建立它、在其中開發、發佈它、驗證它。
    下面每個指令在產生的 <code>package.json</code> 中都有對應的 <code>npm run</code> 腳本，所以這是大多數作者與 CI 腳本使用的主要介面。
  </p>

  <ApiEntry
    name="create"
    kind="command"
    importFrom="npm create @open-press <target> -- --type slides [flags]"
    summary="在 <target> 建立一個新的 OpenPress workspace。寫入 package metadata，安裝 framework skill 套件包，預設執行 npm install + git init，並建立一個最小化的每個資料夾一張投影片的 Press。"
  >
    <PropsTable
      title="位置參數與內容旗標 (Positional + content flags)"
      rows={[
        {
          name: "<target>",
          type: "string",
          required: true,
          description: "目標目錄 — 若不存在會自動建立。必須為空（單獨存在 <code>.git/</code>、<code>.gitignore</code>、<code>.gitkeep</code> 或 <code>.DS_Store</code> 是可以的 — 這在將專案建立到全新的儲存庫時很常見）。",
        },
        { name: "--type slides", type: "string", required: true, description: "建立一個 slides Press。以頁面為基礎的框架建立功能在第一版 create 介面中被延後實作。" },
        { name: "--title", type: "string", description: "文件標題 — 寫入至 <code>press/<target>/press.tsx</code> 中的 <code>&lt;Press title&gt;</code> 內。副標題、組織、作者等並不是 CLI 旗標 — 請直接在 JSX 中渲染它們。" },
      ]}
    />

    <PropsTable
      title="行為旗標 (Behavior flags)"
      rows={[
        {
          name: "--no-install",
          type: "flag",
          description:
            "跳過自動化的 <code>npm install</code>。當您在離線工作、自行使用 pnpm/bun 管理相依套件，或是從父層 monorepo 中執行腳本時使用此參數。",
        },
        {
          name: "--no-git",
          type: "flag",
          description:
            "跳過 <code>git init</code> + 初始提交。當您在現有的儲存庫中建立專案，或是您的工具另外管理 git 狀態時使用此參數。",
        },
      ]}
    />

    ### 範例：帶有標題的建立指令

```bash
npm create @open-press my-deck -- \
  --type slides \
  --title "Transport models in dense networks"
```

    ### 範例：在現有儲存庫中建立

```bash
# 在現有的 git 儲存庫內，沒有自動提交，自行管理相依套件：
npm create @open-press ./docs -- \
  --type slides \
  --no-git \
  --no-install
pnpm install
```

    ### 範例：新增另一個 slides Press

```bash
open-press create appendix --type slides --title "Appendix"
```

    ### 範例：產生的檔案樹結構

```text
my-deck/
  package.json
  .gitignore
  press/
    my-deck/
      press.tsx          # 有順序的索引
      slides/
        intro/
          slide.tsx      # meta + 預設匯出的元件
      themes/
        default.css
```

    <p>
      特定領域的 starters 並未包含在 CLI 中。請安裝一個領域 skill (<code>npx skills add &lt;owner/repo&gt;</code>) 並要求 agent 從該 skill 的 starter 填充 <code>press/</code>。關於完整的 <code>slide.tsx</code> 與 <code>SlideMeta</code> 契約，請參閱 <a href="/docs/concepts/slides">Slides 架構</a>。
    </p>
  </ApiEntry>

  <ApiEntry
    name="dev"
    kind="command"
    importFrom="npm run dev"
    summary="在 http://127.0.0.1:5173 啟動本機 workbench。支援熱重載 (Hot-reload) CSS、theme tokens 與 React UI 介面；MDX 內容編輯會透過引擎的原始碼監聽器進行更新。"
  >
    ### 範例：啟動 workbench

```bash
npm run dev
# → workspace 在 http://127.0.0.1:5173/workspace
# → 文件預覽在 http://127.0.0.1:5173/<press-slug>/preview
```

    <p>
      workbench 使用基於路徑的路由：<code>/workspace</code> 用於專案畫廊，而 <code>/&lt;press-slug&gt;/preview</code> 用於特定文件的預覽，並啟用 inspector、原始碼編輯端點與註解標記。
    </p>
  </ApiEntry>

  <ApiEntry
    name="build"
    kind="command"
    importFrom="npm run build"
    summary="在 dist-react/ 中產生準備好部署的打包檔案。串聯了原始碼驗證、MDX → React 匯出，以及 Vite 的正式環境建置。如果驗證失敗，建置將在 Vite 執行前中止。"
  >
    ### 範例：為正式環境建置

```bash
npm run build
# → dist-react/ 準備好可以被託管
```

    <p>
      中間引擎步驟 (<code>export</code>, <code>validate</code>) 是為了進階的呼叫者存在，但它們不直接面向使用者 — 它們會在 <code>build</code> 中自動執行。如果只想進行驗證而不進行渲染，請直接呼叫 <code>open-press validate .</code>；這主要作為 CI lint 或是 agent 在發布前的前置檢查。
    </p>
  </ApiEntry>

  <ApiEntry
    name="preview"
    kind="command"
    importFrom="npm run preview"
    summary="以靜態網站的形式提供 dist-react/ 的服務，不包含 workbench 介面。在部署前用來驗證公開讀者的所見是否符合預期。"
  >
    ### 範例：建置後進行預覽

```bash
npm run build
npm run preview
# → 閱讀器在 http://127.0.0.1:4173 (沒有 workbench)
```
  </ApiEntry>

  <ApiEntry
    name="typecheck"
    kind="command"
    importFrom="npm run typecheck"
    summary="對 workspace 樹狀結構執行 TypeScript 檢查。實際上就是執行 tsc --noEmit -p tsconfig.json — 可捕捉打包工具未顯示的型別錯誤 (未使用的 exports、屬性不匹配、因編輯而被破壞的限縮型別)。"
  >
    <p>
      <strong>它不包含的功能：</strong> 驗證 MDX 內容形狀、解析跨區塊連結、或是檢查 theme tokens — 這些屬於 <a href="/docs/reference/cli-tools">第三層工具</a> (<code>validate</code>, <code>inspect</code>) 的範疇。Typecheck 純粹只負責 TypeScript 的正確性。
    </p>
  </ApiEntry>
