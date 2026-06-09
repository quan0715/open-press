---
title: "輸出目標"
eyebrow: "CLI · 第二層"
description: "產生標準 HTML 套件包以外的特定交付物：逐頁的 PNG 圖片、PDF，以及部署產物。"
---
<p>
    第二層的指令在相同的引擎輸出周圍，包裝了較重的依賴 (用於 PDF / 圖片的 Chromium，用於部署的轉接器 SDK)。
    它們是明確的指令，而不是 <code>build</code> 上的旗標，因為每個都有其各自的執行期成本 — 如果將它們隱式地放在 <code>build</code> 內部執行，會讓只想要 HTML 套件包的使用者感到驚訝。
  </p>

  <ApiEntry
    name="openpress:pdf"
    kind="command"
    importFrom="npm run openpress:pdf"
    summary="透過 Chromium 在本機產生 PDF。輸出檔名來自 config.pdf.filename。如果 dist-react/ 遺失或過時，會先進行建置；傳遞 --no-build 可以重複使用現有的建置結果。"
  >
    <PropsTable
      title="旗標 (Flags)"
      rows={[
        { name: "--output", type: "string", description: "覆寫輸出路徑。預設為 workspace 根目錄旁的 <code>config.pdf.filename</code>。" },
        { name: "--no-build", type: "flag", description: "重複使用現有的 <code>dist-react/</code> 輸出而不是重新建置。在反覆調整 Chromium 列印 CSS 時很有用。" },
        { name: "--host", type: "string", default: '"127.0.0.1"', description: "Chromium 列印時使用的靜態伺服器主機。" },
        { name: "--port", type: "string", default: '"5185"', description: "靜態伺服器連接埠。" },
        { name: "--dry-run", type: "flag", description: "印出指令序列而不實際渲染或調用 Chromium。" },
      ]}
    />

    ### 範例：一次性的 PDF

```bash
npm run openpress:pdf
# → ./<config.pdf.filename>.pdf
```
  </ApiEntry>

  <ApiEntry
    name="openpress:image"
    kind="command"
    importFrom="npm run openpress:image"
    summary="透過 Chromium 產生逐頁的 PNG 圖片。輸出預設為 dist-react/images/page-001.png, page-002.png 等。除非傳遞了 --no-build，否則會先進行建置。"
  >
    <PropsTable
      title="旗標 (Flags)"
      rows={[
        { name: "--output", type: "string", description: "覆寫輸出目錄。預設為 <code>dist-react/images</code>。" },
        { name: "--no-build", type: "flag", description: "重複使用現有的 <code>dist-react/</code> 輸出而不是重新建置。" },
        { name: "--host", type: "string", default: '"127.0.0.1"', description: "Chromium 擷取頁面時使用的靜態伺服器主機。" },
        { name: "--port", type: "string", default: '"5186"', description: "靜態伺服器連接埠。" },
        { name: "--dry-run", type: "flag", description: "印出指令序列而不渲染或調用 Chromium。" },
      ]}
    />

    ### 範例：逐頁的 PNGs

```bash
npm run openpress:image
# → dist-react/images/page-001.png
```
  </ApiEntry>

  <ApiEntry
    name="openpress:deploy"
    kind="command"
    importFrom="npm run openpress:deploy"
    summary="執行設定的部署轉接器。建置 workspace，在旁邊產生 PDF 階段產物，將部署 metadata 寫入 deploy.json，並交接給轉接器。總是需要 --confirm — 沒有無聲的部署。"
  >
    <PropsTable
      title="旗標 (Flags)"
      rows={[
        {
          name: "--confirm",
          type: "flag",
          description:
            "實際部署時的必要參數。跳過互動式提示；CI 應該只有在經過另一個關卡 (例如 PR 批准) 後才設定此參數。",
        },
        { name: "--dry-run", type: "flag", description: "只執行飛行前檢查；印出指令序列 (建置 → PDF → 轉接器)；不進行發佈。" },
      ]}
    />

    ### 範例：本機進行演練 (Dry run)

```bash
npm run openpress:deploy:dry-run
# → 回報轉接器、目標，以及將會改變什麼
```

    ### 範例：實際部署 (CI)

```bash
npm run openpress:deploy -- --confirm
# → 1. 建置 (build)
# → 2. 將 PDF 放入部署階段目錄
# → 3. 寫入 deploy.json
# → 4. 轉接器進行發佈
```

    <p>
      作用中的轉接器是由 <code>package.json "openpress.deploy.adapter"</code> 選定的。每個轉接器都有其專屬的必要設定 — 請參閱 <a href="/docs/concepts/workspace-config#operational-packagejson-openpress">Workspace config</a> 取得完整的 Schema。
    </p>
  </ApiEntry>

  <h2>轉接器 (Adapters)</h2>

  <ApiEntry
    name='"cloudflare-pages"'
    kind="config"
    importFrom={`// package.json
"openpress": {
  "deploy": { "adapter": "cloudflare-pages", "projectName": "...", "source": ".deploy" }
}`}
    summary="調用 npx wrangler pages deploy。必要：projectName。選擇性：commitDirty。Wrangler 必須在部署機器上通過驗證。"
  />

  <p>
    其他主機可以直接消耗產生出來的建置輸出。OpenPress 讓部署轉接器保持明確；如果尚未實作特定主機的轉接器，agents 應該回報這個邊界，而不是自己發明一個隱藏的發佈路徑。
  </p>
