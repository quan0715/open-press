---
title: "Press"
eyebrow: "@open-press/core"
description: "單一份文件。<Press> 宣告其標題、頁面幾何、來源、來源根目錄，以及底下的 Frames + 輔助工具之 React 樹狀結構。遵循資料夾慣例的專案會從 press/<slug>/press.tsx 中匯出單一個 Press。"
---
  <div class="callout">
    <strong>1.0 契約。</strong> 遵循資料夾慣例的專案使用 <code>press/*/press.tsx</code>。
    引擎會發現這些 Press 進入點並在內部建構出 Workspace。
    每個被發現的資料夾都必須預設匯出唯一一個 <code>&lt;Press&gt;</code>，且其 <code>slug</code> 必須與資料夾名稱相符。
  </div>

  <ApiEntry
    name="<Press>"
    kind="component"
    importFrom={'import { Press } from "@open-press/core";'}
    signature={`<Press
  title="..."
  page="a4" | "social-square" | "slide-16-9" | PageGeometry
  sources={[ mdxSource({ id, preset, root }) ]}
  slug            // 必要；通常與資料夾名稱相符
  theme?          // 額外的佈景主題根目錄
  componentsDir?  // string | string[], 預設包含 "./components" 以及共用的根目錄
  mediaDir?       // string | string[], 預設包含 "./media" 以及共用的根目錄
>
  {/* Frames + 文稿輔助工具 */}
</Press>`}
    summary="單一份文件。透過 props 宣告標題 / 頁面幾何 / 來源，並透過 children 宣告頁面樹狀結構。在遵循資料夾慣例的專案中，它是 press/<slug>/press.tsx 的預設匯出。除了標題之外的顯示文案 (副標題、組織、作者等) 應寫在您自己的 Cover JSX 內 — Press 本身除了標題外，不負責處理任何需要渲染的文字。"
  >
    <PropsTable
      title="文件 metadata"
      rows={[
        { name: "title", type: "string", required: true, description: "文件標題。用於 PDF metadata、HTML <code>&lt;title&gt;</code>、OG 標籤，以及 workbench / 頁籤列的標籤。這是 Press 攜帶的 <strong>唯一一個</strong> 需要渲染的文字 — 副標題 / 作者 / 等等皆屬於您的 Cover JSX。" },
      ]}
    />

    <PropsTable
      title="頁面幾何 (Page geometry)"
      rows={[
        {
          name: "page",
          type: '"a4" | "social-square" | "slide-16-9" | PageGeometry',
          description: "整份文件的頁面尺寸。接受預設名稱或是客製化的幾何物件 (<code>{ id, label, width, height }</code>)。引擎會將其注入為 <code>--openpress-page-*</code> CSS 變數。一個 <code>&lt;Press&gt;</code> 擁有一種幾何形狀；混合尺寸的專案會使用多個 <code>&lt;Press&gt;</code> 節點。",
        },
      ]}
    />

    <PropsTable
      title="內容來源 (Content sources)"
      rows={[
        {
          name: "sources",
          type: "SourceRegistration[]",
          description: '已註冊來源的陣列。每個項目都是呼叫 <code>@open-press/core/mdx</code> 內的 <code>mdxSource({ id, preset, root })</code> 後的回傳值。<code>id</code> 就是 <code>&lt;MdxArea chainId&gt;</code>、<code>&lt;Sections source&gt;</code>、<code>&lt;Toc source&gt;</code> 所參照的目標。',
        },
      ]}
    />

    <PropsTable
      title="路由與路徑 (Routing & paths)"
      rows={[
        { name: "slug", type: "string", required: true, description: "URL 片段以及文件專屬的產物目錄 (<code>public/openpress/&lt;slug&gt;/document.json</code>，閱讀器路由 <code>/&lt;slug&gt;</code>)。通常與資料夾名稱相符。" },
        { name: "theme", type: "string", description: '額外佈景主題目錄的路徑。資料夾局部的 <code>theme/</code> 與 <code>press/shared/theme</code> 則會依照慣例載入。' },
        { name: "componentsDir", type: "string | string[]", description: '額外的 React 元件根目錄。預設包含資料夾局部的 <code>./components</code> 與 <code>press/shared/components</code>。' },
        { name: "mediaDir", type: "string | string[]", description: '額外的媒體 (media) 根目錄。預設包含資料夾局部的 <code>./media</code> 與 <code>press/shared/media</code>。' },
      ]}
    />

    <PropsTable
      title="樹狀結構 (Tree)"
      rows={[
        {
          name: "children",
          type: "ReactNode",
          required: true,
          description: "您的文件主體 — 通常是 <code>&lt;Frame&gt;</code> 實例及/或文稿輔助工具，例如 <code>&lt;Sections&gt;</code>、<code>&lt;Toc&gt;</code>。",
        },
      ]}
    />

    ### 範例：單文件專案

```tsx
// press/report/press.tsx
import { Press, Frame, mdxSource } from "@open-press/core";
import { Sections, Toc } from "@open-press/core/manuscript";

export default function ReportPress() {
  return (
    <Press
      slug="report"
      title="Transport models in dense networks"
      page="a4"
      componentsDir="./components"
      mediaDir="./media"
      sources={[
        mdxSource({ id: "story", preset: "section-folders", root: "report/chapters" }),
      ]}
    >
      <Frame frameKey="cover" role="document.cover">
        <Cover />          {/* 副標題 / 組織 / 作者都寫在這裡 */}
      </Frame>
      <Toc source="story" maxLevel={2} />
      <Sections source="story" />
      <Frame frameKey="back-cover" role="document.back-cover">
        <BackCover />
      </Frame>
    </Press>
  );
}
```

    ### 範例：多幾何形狀的專案 — 每種頁面尺寸一個 Press 資料夾

```tsx
// press/report/press.tsx
<Press slug="report" title="Launch report" page="a4" sources={[...]}>
  {/* A4 封面 + A4 內文 */}
</Press>

// press/opener/press.tsx
<Press slug="opener" title="Launch opener" page="slide-16-9" sources={[...]}>
  {/* 單張 16:9 hero 簡報 */}
</Press>
```
  </ApiEntry>

  <h2>執行期契約 (Runtime contract)</h2>

  <p>
    您不需要將分頁狀態傳遞到 <code>&lt;Press&gt;</code> 內。在匯出期間，OpenPress 會多次渲染這棵樹：首先是發現 frames 與內容插槽，接著是在知道各來源區塊所屬位置後再次渲染。那個執行期的狀態是由渲染器內部管理的。
  </p>

  <PropsTable
    title="Press 的保證"
    rows={[
      {
        name: "樹狀邊界 (Tree boundary)",
        type: "契約",
        description:
          "所有應該成為文件一部分的內容，都必須在單一 <code>&lt;Press&gt;</code> 根節點下進行渲染。",
      },
      {
        name: "metadata 的單一事實來源",
        type: "契約",
        description:
          "標題 (Title) / 頁面 (page) / 來源 (sources) 存放在 <code>&lt;Press&gt;</code> props 中 — 在 1.0 版契約中不存在平行的設定檔。",
      },
      {
        name: "頁面順序 (Page order)",
        type: "契約",
        description:
          "頂層的 frames 與輔助工具會依據文件內的順序渲染。置於 <code>&lt;Sections&gt;</code> 之前的封面會在生成出來的內容頁面之前出現。",
      },
      {
        name: "由渲染器擁有分頁 (Renderer-owned pagination)",
        type: "契約",
        description:
          "OpenPress 可能會重複渲染該樹以計算頁數並安排內容位置。作者應以宣告式 (declarative) 的方式描述頁面，並避免在渲染時產生副作用 (side effects)。",
      },
    ]}
  />

  <h2>作者規則 (Authoring rules)</h2>

  <ul>
    <li>每個專案的根節點都是 <code>&lt;Workspace&gt;</code>。<code>&lt;Press&gt;</code> 永遠都是它的子節點 — 絕不能做為頂層元件。</li>
    <li>一個 Workspace 可以包含 1 到 N 個 Press 子節點。單份文件的專案只有一個；多文件的專案 (企劃書 + 簡報 + 社交媒體卡片) 則有多個。</li>
    <li>Metadata 存放在 <code>&lt;Press&gt;</code> props 中 — 1.0 契約內沒有平行的設定檔。</li>
    <li>除標題以外的顯示文字 (副標題、組織、作者署名、版本字串) 應放入您自己的 Cover JSX 中，而不是放進 Press props 內。</li>
    <li>封面及封底只是普通的 <code>&lt;Frame&gt;</code> 元件，放置在內容輔助工具的前/後 — 沒有特別的 API。</li>
    <li>在渲染時，不要抓取檔案、修改全域變數，或是依賴隨機值。渲染器可能會執行樹狀結構多次。</li>
  </ul>

  <h2>相關內容 (Related)</h2>

  <ul>
    <li><a href="/docs/reference/components-workspace">Workspace</a> — 多文件的專案。</li>
    <li><a href="/docs/reference/data-mdx-sources">MDX 來源 (MDX sources)</a> — <code>mdxSource()</code> 會回傳的內容。</li>
    <li><a href="/docs/reference/components-frame">Frame</a> — Press 樹內的頁面表面。</li>
    <li><a href="/docs/concepts/workspace-config">Workspace 設定 (Workspace config)</a> — package.json 的 "openpress" 欄位 (操作設定) + Press props (文件設定)。</li>
  </ul>
