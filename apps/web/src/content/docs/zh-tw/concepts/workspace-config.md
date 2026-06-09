---
title: "Workspace 設定"
eyebrow: "設定檔存放的位置"
description: "文件 metadata 存放在 <Press> props；操作設定存放在 package.json。路徑遵循慣例並帶有合理的預設值。"
---
  <div class="callout">
    <strong>Workspace 契約。</strong> <code>&lt;Press&gt;</code> props 負責管理文件 metadata，
    <code>package.json</code> 負責管理操作設定，而引擎負責管理路徑慣例。
    一個 workspace 是從 <code>press/*/press.tsx</code> 中被發現的。
  </div>

  <h2>三個層級</h2>

  <PropsTable
    rows={[
      {
        name: "文件 metadata",
        type: "<Press> props",
        description: "<code>title</code>, <code>page</code>, <code>sources</code>, <code>theme</code>, <code>componentsDir</code>, <code>mediaDir</code>, <code>slug</code>。除了標題之外的顯示文案 (副標題 / 組織 / 作者) 都存在於您的 Cover JSX 中，而不是 Press props 內。請參閱 <a href=\"/docs/reference/components-press\">&lt;Press&gt;</a>。",
      },
      {
        name: "操作設定",
        type: "package.json \"openpress\"",
        description: "部署轉接器 (Deploy adapter) + 轉接器特定的設定。CLI 在啟動時會同步讀取此資訊而不需要執行 React，所以這是建置時期設定可以存在的唯一位置。",
      },
      {
        name: "路徑",
        type: "慣例 (Convention)",
        description: '寫死的引擎預設值：<code>press/</code>、<code>press/*/press.tsx</code>、資料夾局部的 <code>components/</code>、<code>theme/</code>、<code>media/</code>，以及選擇性的 <code>press/shared/</code>、<code>public/openpress/</code> 與 <code>dist-react/</code>。使用 <code>&lt;Press componentsDir&gt;</code> 與 <code>&lt;Press mediaDir&gt;</code> 新增明確的根目錄。',
      },
    ]}
  />

  <h2>文件 metadata — &lt;Press&gt; props</h2>

  <p>
    參見 <a href="/docs/reference/components-press">&lt;Press&gt; 頁面</a> 獲取完整的 prop 參考。
    一個 <code>press/&lt;slug&gt;/press.tsx</code> 檔案預設匯出一個 <code>&lt;Press&gt;</code>。
  </p>

  <PropsTable
    title="<Press> 擁有權"
    rows={[
      { name: "title", type: "<Press title>", description: "用於閱讀器標籤、瀏覽器標題及匯出 metadata 的必要 metadata。" },
      { name: "slug", type: "<Press slug>", description: "必要的 URL 與產物片段。它必須與包含的資料夾名稱相符。" },
      { name: "page", type: "<Press page>", description: "每個 Press 一個頁面幾何形狀。混合尺寸的專案會使用多個 Press 資料夾。" },
      { name: "sources", type: "<Press sources>", description: "來源註冊的陣列，通常是 <code>mdxSource({ id, preset, root })</code>。" },
      { name: "theme / componentsDir / mediaDir", type: "<Press> 路徑 props", description: "<code>componentsDir</code> 和 <code>mediaDir</code> 可以是字串或字串陣列。預設包含資料夾局部的根目錄與 <code>press/shared/</code>。" },
      { name: "captionNumbering", type: "<Press captionNumbering>", description: "選擇性的圖片/表格編號標籤與分隔符號。" },
    ]}
  />

  <h2>操作設定 — package.json "openpress"</h2>

  <ApiEntry
    name='package.json "openpress"'
    kind="config"
    importFrom={`{
  "name": "my-paper",
  "openpress": {
    "deploy": { "adapter": "...", ... }
  }
}`}
    summary="CLI 在啟動時會同步讀取的操作設定 — 在任何 React 渲染之前。選擇部署轉接器在此處進行，因為 openpress:deploy 在調用轉接器之前必須知道它。大多數使用者只需填寫 deploy 區塊一次。"
  >
    <PropsTable
      title="頂層屬性"
      rows={[
        { name: "deploy", type: "DeployConfig", description: "部署轉接器設定。在執行 <code>openpress:deploy</code> 時為必要；否則為選擇性 (CI / 本機開發時可以沒有它)。" },
      ]}
    />

    <h3>Deploy</h3>

    <p>
      依據轉接器區分的聯合型別 (Adapter-discriminated union)。每個轉接器在下面的共用屬性之上都有其專屬的必要屬性。
    </p>

    <PropsTable
      title="共用屬性"
      rows={[
        { name: "adapter", type: "string", required: true, description: '內建：<code>"cloudflare-pages"</code>。其他主機可以直接消耗產生的建置輸出或是註冊它們自己的轉接器屬性。' },
        { name: "source", type: "string", default: '".deploy"', description: "用於部署產物在轉交給轉接器之前組合的暫存目錄 (相對於 workspace 根目錄)。" },
        { name: "requiresConfirmation", type: "boolean", default: "true", description: "要求在命令列中使用 <code>--confirm</code> 參數。只有當轉接器有自己的確認步驟時才停用。" },
        { name: "commitDirty", type: "boolean", default: "false", description: "允許部署包含未提交的變更。在 CI 中請保持為 false。" },
      ]}
    />

    <h3>cloudflare-pages 轉接器</h3>

    <PropsTable
      rows={[
        { name: "projectName", type: "string", required: true, description: 'Cloudflare Pages 專案名稱。做為 <code>--project-name=</code> 傳遞給 wrangler。' },
      ]}
    />

    ### 範例：Cloudflare Pages — 完整的 package.json

```json
{
  "name": "open-source-economics",
  "version": "0.1.0",
  "scripts": { "build": "open-press build", "dev": "open-press dev" },
  "openpress": {
    "deploy": {
      "adapter": "cloudflare-pages",
      "source": ".deploy",
      "projectName": "open-source-economics",
      "requiresConfirmation": true
    }
  }
}
```
  </ApiEntry>

  <h2>路徑 — 僅為慣例</h2>

  <p>
    引擎寫死了路徑慣例。在 v1.0 中故意沒有提供任何從設定檔覆寫這些路徑的方法 — 這些慣例是產品表面的一部分，而不是可以調整的旋鈕。
  </p>

  <PropsTable
    rows={[
      { name: "內容根目錄 (Content root)", type: "press/", description: "遵循資料夾慣例的專案使用 <code>press/*/press.tsx</code>。" },
      { name: "佈景主題 (Theme)", type: "press/<slug>/theme/", description: '資料夾局部的 theme 規則會自動載入。僅在共用基礎規則時才使用 <code>press/shared/theme/</code>。' },
      { name: "元件 (Components)", type: "press/<slug>/components/", description: '預設值包含資料夾局部及共用的根目錄。使用 <code>&lt;Press componentsDir="..."&gt;</code> 增加更多。' },
      { name: "媒體 (Media)", type: "press/<slug>/media/", description: '預設值包含資料夾局部及共用的根目錄。使用 <code>&lt;Press mediaDir="..."&gt;</code> 增加更多。' },
      { name: "建置輸出 (引擎)", type: "public/openpress/", description: "引擎將 <code>document.json</code> 與同步的素材寫入至此。不可設定。" },
      { name: "建置輸出 (Vite)", type: "dist-react/", description: "正式環境的部署套件包。不可設定。" },
      { name: "部署階段 (Deploy stage)", type: ".deploy/", description: "可透過 <code>package.json openpress.deploy.source</code> 設定；預設為 <code>.deploy/</code>。" },
    ]}
  />
