---
title: "Workspace"
eyebrow: "@open-press/core"
description: "OpenPress 用來將發現的 Press 資料夾分組到單一 workspace 資訊清單的內部元件。"
---
<div class="callout">
    <strong>1.0 契約。</strong> 使用者專案從每個 <code>press/<slug>/press.tsx</code> 中匯出單一個 <code>&lt;Press&gt;</code>。引擎會發現這些進入點並在內部建構出 Workspace。
    <br />
    <strong>即時預覽：</strong> <a href="/preview/workspace/">看看 Workspace 畫廊長什麼樣子</a> (包含三個 Press 的靜態模擬)。
  </div>

  <ApiEntry
    name="<Workspace>"
    kind="component"
    importFrom={'import { Workspace } from "@open-press/core";'}
    signature={`<Workspace name? children />`}
    summary="引擎擁有的分組元件，供產生出來的發現進入點使用。作者只需編寫 Press 資料夾，而不需要手動撰寫 Workspace 根節點。"
  >
    <PropsTable
      title="Props"
      rows={[
        { name: "name", type: "string", description: "選擇性的 workspace 標籤。在畫廊與 PDF metadata 中呈現為專案名稱。" },
        { name: "children", type: "Press[]", required: true, description: "一個或多個 <code>&lt;Press&gt;</code> 子元素。每個都必須擁有獨一無二的 <code>slug</code> prop。" },
      ]}
    />
  </ApiEntry>

  <h2>專案佈局 (Project layout)</h2>

  ### 範例：單一文件的專案

```text
my-paper/
├── package.json                ← 部署轉接器放在這裡 (選擇性)
└── press/
    ├── shared/theme/           ← 共用的基礎佈景主題
    └── report/
        ├── press.tsx           ← 預設匯出 <Press slug="report" ...>
        ├── chapters/           ← MDX 內容
        ├── theme/              ← 報告專屬的規則
        ├── components/         ← 報告局部的 React 元件
        └── media/              ← 報告的圖片、向量圖形
```

  ### 範例：多文件的專案

```text
my-launch/
├── package.json                ← 部署轉接器放在這裡
└── press/
    ├── shared/                 ← 選擇性的共用資料、佈景主題、媒體
    ├── proposal/
    │   ├── press.tsx           ← 預設匯出 <Press slug="proposal" ...>
    │   ├── chapters/           ← MDX
    │   └── theme/              ← 選擇性的個別文件覆寫
    ├── pitch-deck/
    │   ├── press.tsx           ← 預設匯出 <Press slug="pitch-deck" ...>
    │   └── layouts/
    └── social/
        ├── press.tsx           ← 預設匯出 <Press slug="social" ...>
        └── components/
```

  ### 範例：個別文件 — press/proposal/press.tsx

```tsx
import { Press, Frame, mdxSource } from "@open-press/core";
import { Sections, Toc } from "@open-press/core/manuscript";

export default function ProposalPress() {
  return (
    <Press
      slug="proposal"
      title="Series A 提案書"
      page="a4"
      componentsDir="./components"
      mediaDir="./media"
      sources={[
        mdxSource({ id: "story", preset: "section-folders", root: "proposal/chapters" }),
      ]}
    >
      <Frame frameKey="cover" role="document.cover"><Cover /></Frame>
      <Toc source="story" />
      <Sections source="story" />
    </Press>
  );
}
```

  <h2>workspace 模式解鎖了什麼</h2>

  <PropsTable
    title="閱讀器 / 建置 (Reader / build)"
    rows={[
      { name: "各文件的路由", type: "行為", description: "閱讀器的 URL 每個 slug 都有對應的路徑 — <code>/proposal</code>、<code>/pitch-deck</code>、<code>/social</code>。根目錄 <code>/</code> 會顯示一個 workspace 索引，裡面包含每個文件的卡片。" },
      { name: "頁籤列 (Tab bar)", type: "行為", description: "workbench 會顯示一個跨越不同文件的頁籤列 (左側是 workspace 名稱，右側是文件的頁籤)。" },
      { name: "共用的佈景主題 tokens", type: "行為", description: "workspace 層級的 <code>theme/tokens.css</code> 會套用到每份文件，除非該文件自行設定了它的 <code>theme</code> prop。" },
      { name: "各文件的建置產物", type: "行為", description: "每份文件都有 <code>public/openpress/&lt;slug&gt;/document.json</code>，再加上一個頂層的 <code>public/openpress/workspace.json</code> 資訊清單。" },
    ]}
  />

  <PropsTable
    title="CLI 行為的改變"
    rows={[
      { name: "npm run build", type: "行為", description: "建置 workspace 內的每份文件。只要任何一份文件有結構問題，驗證階段就會中止整個建置。" },
      { name: "npm run openpress:pdf", type: "行為", description: "為每份文件產生一份 PDF 到 <code>dist-react/&lt;slug&gt;.pdf</code> 內。傳入 <code>--doc=&lt;slug&gt;</code> 則可建置單一 PDF。" },
      { name: "npm run openpress:deploy", type: "行為", description: "將整個 workspace 作為單一網站部署。部署轉接器會接收完整的 <code>dist-react/</code>，且保留多文件的路由。" },
      { name: "第三層工具 (search, replace, inspect)", type: "行為", description: "全部都接受 <code>--doc=&lt;slug&gt;</code> 來將範疇限制在單一文件；預設則是整個 workspace 的範圍。" },
    ]}
  />

  <h2>何時『不』應該合併到同一個 Workspace 裡</h2>

  <p>
    <code>&lt;Workspace&gt;</code> 本身總是存在的 — 問題在於，您要將多份文件放進同一個 Workspace 中，還是使用各自獨立的 Workspaces (各自獨立的 <code>package.json</code> 專案)。在以下情況，請將它們分開：
  </p>

  <ul>
    <li>
      <strong>不同的品牌或是無關的內容</strong> — 兩份文件除了放在同一個 git 儲存庫外，沒有任何共通點。在 monorepo 裡為它們建立各自獨立的 Workspaces 吧。
    </li>
    <li>
      <strong>同一個內容的不同版本文件</strong> — 請使用 git branches / tags，而不是在一個 Workspace 中放入多個 Press 子節點。Workspace 是一個一致連貫的產品，而不是用來歸檔的地方。
    </li>
    <li>
      <strong>不同的部署目標</strong> — 如果兩份文件要部署到不同的部署轉接器或是不同的 Cloudflare 專案，它們會需要各自獨立的 Workspaces (部署設定是 workspace 層級的)。
    </li>
  </ul>

  <h2>在文件之間共用資料</h2>

  <p>
    Workspace 並沒有引入特別的資料 API。推薦的模式是使用原生的 ES module imports — 一個 <code>press/shared/data.ts</code> 負責匯出事實資料 / 數字 / 日期，而每個 <code>press/&lt;slug&gt;/press.tsx</code> 再匯入它所需要的東西。只需更新一次數字，就會同步更新到所有匯入該資料的文件中。
  </p>

  ### 範例：透過 import 共用資料

```ts
// press/shared/data.ts
export const RAISE = {
  amount: "$8M",
  round: "Series A",
  closeDate: "2026-09-30",
};

// press/proposal/chapters/01-overview.mdx
import { RAISE } from "../../../data";

我們即將在 {RAISE.round} 募資 {RAISE.amount}，並於 {RAISE.closeDate} 結束。

// press/pitch-deck/slides/03-ask.mdx
import { RAISE } from "../../../data";

目標 (Ask)：{RAISE.amount} ({RAISE.round})。
```

  <h2>相關內容 (Related)</h2>

  <ul>
    <li><a href="/docs/reference/components-press">Press</a> — 每個子文件。</li>
    <li><a href="/docs/concepts/workspace-config">Workspace 設定</a> — <code>package.json</code> 中的操作設定。</li>
    <li><a href="/docs/concepts/themes">佈景主題 (Themes)</a> — workspace 層級對比個別文件的 theme 目錄。</li>
  </ul>
