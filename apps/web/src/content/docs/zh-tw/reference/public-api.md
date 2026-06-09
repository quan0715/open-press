---
title: "公開 API (Public API)"
eyebrow: "契約 (Contract)"
description: "包含對於 1.0 版穩定的模組匯出、設定結構、CSS 變數契約、註解標記格式以及開發端點。在此清單之外的所有東西都屬於內部實作。"
---
<h2>穩定性承諾 (Stability promise)</h2>

  <p>
    一旦 OpenPress 1.0 發佈，本頁面上的介面都將受到 semver 語意化版本控制的保護：對任何列出的匯出 (export)、設定欄位、CSS 變數、標記格式或是開發端點進行破壞性變更 (breaking change)，都需要進行主要版本的更新 (major version bump)。在此清單之外的內部標籤與模組 (任何只能透過深層匯入觸及的東西)，都可能在任何次要版本更新中發生變更，而且不會在 CHANGELOG 內註明這可能會破壞您下游的程式碼。
  </p>

  <p>
    如果您所依賴的東西沒有出現在這份文件中，而您希望它被納入，請開啟一個 issue。大多數要將功能提升為公開 API 都是很簡單的 — 我們主要只是希望它們能被正式命名。
  </p>

  <h2><code>@open-press/core</code></h2>

  <p>包含了 React 執行期 (runtime) 以及 Press Tree 基礎元件的頂層統一匯入點 (barrel)。</p>

  <table>
    <thead>
      <tr><th>匯出 (Export)</th><th>種類 (Kind)</th><th>用途 (Purpose)</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>Press</code></td>
        <td>元件</td>
        <td>文件組成的邊界。每個 <code>press/&lt;slug&gt;/press.tsx</code> 必須恰好匯出一個；將所有的 page frame 與文件輔助工具放在它的底下。</td>
      </tr>
      <tr>
        <td><code>PressContext</code></td>
        <td>React context</td>
        <td>供客製化輔助元件使用的低階 context。一般 workspace 與 agents 應該改用 <code>Press</code>、<code>Frame</code>、<code>MdxArea</code> 以及文稿輔助工具。</td>
      </tr>
      <tr>
        <td><code>PRESS_MARKER</code></td>
        <td>symbol</td>
        <td>供包裝工具使用的低階識別碼。撰寫文件時不需要用到。</td>
      </tr>
      <tr>
        <td><code>Frame</code></td>
        <td>元件</td>
        <td>固定的頁面表面或嵌套區域邊界。必要 props：<code>frameKey</code>。選擇性：<code>role</code>、<code>chrome</code>、<code>className</code>。所有其他 props 都會傳遞給下層的 <code>&lt;section&gt;</code>。頁面大小透過文件層級的 <code>&lt;Press page&gt;</code> 進行設定。</td>
      </tr>
      <tr>
        <td><code>FRAME_MARKER</code></td>
        <td>symbol</td>
        <td>渲染器用來偵測 <code>Frame</code> 實例的識別碼。穩定的。</td>
      </tr>
      <tr>
        <td><code>FrameContext</code></td>
        <td>React context</td>
        <td>暴露了作用中 frame 的 <code>frameKey</code> 以及 <code>MdxArea</code> 所呼叫的 <code>consumeArea(chainId)</code> hook。為公開 API，因此客製化的 frame 輔助工具可以建立在它之上。</td>
      </tr>
      <tr>
        <td><code>MdxArea</code></td>
        <td>元件</td>
        <td>在 frame 內可被測量的內容插槽。必要 props：<code>chainId</code>。選擇性：<code>overflow</code> (<code>"extend"</code> | <code>"truncate"</code>)、<code>className</code>。</td>
      </tr>
      <tr>
        <td><code>Text</code></td>
        <td>元件</td>
        <td>無樣式的可編輯文字物件。必要 props：<code>objectId</code>、<code>label</code>。字面上的子元素會在 React SSR 匯出時被自動映射到 TSX 原始碼範圍；如果背後是表達式 (expression) 的子元素需要能被行內編輯，則需要給予明確的 <code>source</code>。</td>
      </tr>
      <tr>
        <td><code>ObjectEntity</code></td>
        <td>元件</td>
        <td>為了提供給註解 / 編輯 / 檢查器之 metadata，其所渲染物件的低階邊界。多數作者應使用 <code>Text</code>、<code>Frame</code>、<code>MdxArea</code>、媒體輔助工具，或是那些刻意將它包裝起來的客製化元件。</td>
      </tr>
      <tr>
        <td><code>useSource</code></td>
        <td>hook</td>
        <td>為給定的 <code>sourceId</code> 回傳已解析的來源註冊資訊。由文稿輔助工具與客製化的 frame 元件使用。</td>
      </tr>
      <tr>
        <td><code>BaseFigure</code>, <code>BaseCallout</code></td>
        <td>元件</td>
        <td>最基礎的圖片 / 提示框元件。Workspace 的 themes 與 starter skills 會在此基礎上建立帶有品牌風格的變體元件。</td>
      </tr>
      <tr>
        <td><code>MediaFigure</code>, <code>ImageFigure</code></td>
        <td>元件</td>
        <td>接受 <code>src</code> / <code>alt</code> / <code>caption</code> 的圖片元件。會自動將 <code>media/...</code> 形式的相對路徑解析為 <code>/openpress/media/...</code>。<code>ImageFigure</code> 是 <code>MediaFigure</code> 的別名。</td>
      </tr>
    </tbody>
  </table>

  <h3>型別 (Types)</h3>

  <p>
    同樣從統一匯入點中重新匯出。型別是公開契約的一部分 — 如果欄位名稱發生變更，即為一項破壞性變更。
  </p>

  <ul>
    <li><code>FrameProps</code>, <code>MdxAreaProps</code>, <code>MdxAreaOverflow</code></li>
    <li><code>PressProps</code>, <code>WorkspaceProps</code>, <code>PageGeometry</code>, <code>PressSource</code></li>
    <li><code>ObjectEntityProps</code>, <code>ObjectEntityElement</code>, <code>TextProps</code></li>
    <li><code>BaseFigureProps</code>, <code>BaseCalloutProps</code>, <code>BaseCalloutKind</code></li>
    <li><code>MediaFigureProps</code></li>
  </ul>

  <h2><code>@open-press/core/mdx</code></h2>

  <table>
    <thead>
      <tr><th>匯出 (Export)</th><th>種類 (Kind)</th><th>用途 (Purpose)</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>mdxSource(options)</code></td>
        <td>函數</td>
        <td>註冊 MDX 來源樹狀結構。<code>options.preset</code> 選擇一種探索的預設模式 (標準的章節佈局使用 <code>"section-folders"</code>)。<code>options.root</code> 是相對於 <code>press/</code> 的資料夾。</td>
      </tr>
    </tbody>
  </table>

  <h2><code>@open-press/core/manuscript</code></h2>

  <p>用於長篇、依循章節流動的文件的輔助工具。非必要 — 簡報 / 社交媒體 starters 跳過這個模組是完全可以的。</p>

  <table>
    <thead>
      <tr><th>匯出 (Export)</th><th>種類 (Kind)</th><th>用途 (Purpose)</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>Sections</code></td>
        <td>元件</td>
        <td>遍歷已註冊的來源，為每個章節發出一個或多個 frames。必要：<code>source</code>。選擇性：<code>page</code> (客製化的單頁元件) — 預設為 <code>DefaultSectionPage</code>。選擇性：<code>opener</code>。</td>
      </tr>
      <tr>
        <td><code>Chapters</code></td>
        <td>別名</td>
        <td>與 <code>Sections</code> 相同。提供給來源詞彙使用 "chapter" 時，能增加閱讀清晰度的別名。</td>
      </tr>
      <tr>
        <td><code>DefaultSectionPage</code></td>
        <td>元件</td>
        <td>當沒有提供 <code>page</code> prop 時，<code>Sections</code> 所使用的預設頁面元件。</td>
      </tr>
      <tr>
        <td><code>Toc</code>, <code>TocArea</code></td>
        <td>元件</td>
        <td>TOC (目錄) frame + TOC 內容插槽。<code>TocArea</code> 會對生成的 <code>toc:&lt;sourceId&gt;</code> 鏈結進行測量與分頁。</td>
      </tr>
    </tbody>
  </table>

  <h3>型別 (Types)</h3>

  <ul>
    <li><code>SectionsProps</code>, <code>SectionsPageProps</code>, <code>SectionsOpenerProps</code></li>
    <li><code>ChaptersProps</code></li>
    <li><code>TocProps</code>, <code>TocAreaProps</code>, <code>TocPageProps</code></li>
  </ul>

  <h2><code>@open-press/core/numbering</code></h2>

  <p>圖片 / 表格 / 說明文字編號的格式化工具。由渲染器在建置時期使用的輔助工具；公開釋出是為了讓客製化 theme 時能以一致的格式呈現標籤。</p>

  <ul>
    <li><code>formatCaptionLabel(kind, index, options?)</code> — 產生在地化 (localized) 的標籤字串 (例如 <code>Figure 1</code> / <code>圖 1</code> / 等等)。</li>
    <li><code>defaultCaptionLocale</code> — 預設的地區設定檔；作為 <code>&lt;Press captionNumbering&gt;</code> 參考值。</li>
  </ul>

  <h2><code>@open-press/create</code> 與 <code>@open-press/cli</code></h2>

  <p>
    <code>@open-press/create</code> 用來建立 (bootstrap) 一個全新且遵循資料夾慣例的 workspace。在這個第一版的 create 介面中，支援 <code>--type slides</code>，而基於單頁建立框架的功能則會延後實作。
    <code>@open-press/cli</code> 提供了 <code>open-press create</code>，用來在現有的 workspace 內部新增一個簡報 Press。
  </p>

  <pre><code>npm create @open-press &lt;target&gt; -- --type slides --title "…"
open-press create appendix --type slides</code></pre>

  <p>
    充滿主觀設計風格 (opinionated) 的 starters 存在於 skills 中。使用
    <code>npx skills add &lt;owner/repo&gt;</code> 安裝一個 skill，接著讓 agent 讀取這個 skill 並將它的 starter/example 檔案複製或改編進 <code>press/</code> 中。
  </p>

  <p>
    一旦進入建立好的 workspace 內，引擎執行檔會透過 npm 腳本
    (<code>dev</code> / <code>build</code> / <code>preview</code> / <code>typecheck</code>) 或是帶有
    <code>openpress:</code> 前綴的目標 (<code>pdf</code>、<code>image</code>、<code>deploy</code>) 來接管。參見
    <a href="/docs/cli">CLI 總覽</a>。
  </p>

  <h2>Workspace 設定檔 (<code>package.json "openpress"</code>)</h2>

  <p>
    操作設定會存放在 workspace 中 <code>package.json</code> 裡的 <code>"openpress"</code> 欄位底下 — 這是引擎在進行任何 React 渲染之前，唯一會進行同步讀取的地方。其他的所有東西 (標題 / 頁面幾何 / 來源 / 佈景主題) 則是存放在 <code>press/*/press.tsx</code> 的 <code>&lt;Press&gt;</code> props 裡面。完整的 Schema 可參閱
    <a href="/docs/concepts/workspace-config">Workspace 設定</a>。
  </p>

  <pre><code>{`{
  "openpress": {
    "pdf":    { "filename": "..." },
    "deploy": { "adapter": "cloudflare-pages", "projectName": "...", "source": ".deploy" }
  }
}`}</code></pre>

  <h2>Press Tree 進入點 (<code>press/*/press.tsx</code>)</h2>

  <p>
    預設匯出一個回傳單一 <code>&lt;Press&gt;</code> 的 function component。引擎會發現所有的資料夾進入點，並在內部建構出 Workspace。在匯出時，它會從 JSX 樹的 <code>&lt;Press&gt;</code> props 讀取 metadata
    (包含 title, page, sources, slug, captionNumbering, theme, componentsDir, mediaDir)。這裡沒有具名匯出 (named exports) — 這個進入點就是 JSX 本身，如此而已。完整的 Schema 可參閱 <a href="/docs/reference/components-press">Press</a>。
  </p>

  <h2>CSS 變數</h2>

  <p>
    Workspace 的 themes 與 starter skills 可以讀取並覆寫這些變數。變更名稱將是一項破壞性變更。
  </p>

  <table>
    <thead>
      <tr><th>變數 (Variable)</th><th>來源 (Source)</th><th>備註 (Notes)</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>--openpress-page-width</code> / <code>--openpress-page-height</code></td>
        <td>引擎 (從 <code>&lt;Press page&gt;</code> 取得)</td>
        <td>CSS 長度。頁面幾何形狀會被推送到測量系統及執行期中。</td>
      </tr>
      <tr>
        <td><code>--openpress-page-aspect-ratio</code> / <code>--openpress-page-height-ratio</code></td>
        <td>引擎</td>
        <td>用於流暢縮放 (縮放控制，適應頁面模式) 衍生出來的比例。</td>
      </tr>
      <tr>
        <td><code>--openpress-page-viewport-scale</code></td>
        <td>執行期 (workbench)</td>
        <td>當前頁面縮放的倍數。由頁面縮放控制項設定。</td>
      </tr>
      <tr>
        <td><code>--openpress-page-padding-top</code> / <code>-x</code> / <code>-bottom</code></td>
        <td>Workspace 佈景主題 <code>tokens.css</code></td>
        <td>Workspace 層級的頁面留白。由 <code>theme/base/page-contract.css</code> 使用。</td>
      </tr>
      <tr>
        <td><code>--openpress-page-body-gap</code></td>
        <td>Workspace 佈景主題 <code>tokens.css</code></td>
        <td><code>MdxArea</code> 內區塊之間的垂直間距。</td>
      </tr>
    </tbody>
  </table>

  <p>
    一個 workspace 佈景主題或 starter skill 可能會在它自己的 <code>tokens.css</code> 中定義額外的顏色 / 排版 tokens。這些名稱是局部的慣例，而不是 framework 的契約 — framework 只在意上面列出的頁面幾何 / 頁面留白 / 頁面區塊間距等名稱。
  </p>

  <h2>註解標記 (<code>@openpress-comment</code>)</h2>

  <p>
    檢查器會將行內註解寫入來源 MDX/TSX 檔案中，作為一個穩定且可解析的標記。格式為：
  </p>

  <pre><code>&#123;/* @openpress-comment id=&lt;短id&gt; ts=&lt;iso時間戳記&gt; hint=&lt;url編碼字串&gt; note=&lt;url編碼字串&gt; */&#125;</code></pre>

  <p>欄位語義：</p>

  <ul>
    <li><code>id</code> — 供交叉引用的短十六進位 id。必要。</li>
    <li><code>ts</code> — 插入標記時的 ISO 8601 時間戳記。必要。</li>
    <li><code>hint</code> — URL 編碼的檢查器 metadata (放置位置，目標物件 id)。選擇性。</li>
    <li><code>note</code> — URL 編碼的註解文字。必要。</li>
  </ul>

  <p>
    可透過 <code>rg "@openpress-comment" press -n</code> 進行探索。
    <code>openpress-apply-comments</code> skill 是套用 / 清除 / 驗證流程的權威管理者。
  </p>

  <h2>開發端點 (Dev endpoints)</h2>

  <p>
    僅在開發模式下可用 (<code>npm run dev</code>)。連接到由 package 擁有的 Vite middleware。
    路徑前綴：<code>/__openpress</code>。
  </p>

  <table>
    <thead>
      <tr><th>路徑 (Path)</th><th>方法 (Method)</th><th>用途 (Purpose)</th></tr>
    </thead>
    <tbody>
      <tr><td><code>/openpress/workspace.json</code></td><td>GET</td><td>Workspace 資訊清單，列出所有被發現的 Press。</td></tr>
      <tr><td><code>/openpress/&lt;slug&gt;/document.json</code></td><td>GET</td><td>一個 Press 的完整渲染文件 — 在元件掛載以及進行行內編輯後，由 <code>OpenPressApp</code> 獲取。</td></tr>
      <tr><td><code>/__openpress/status</code></td><td>GET</td><td>部署狀態的快照。</td></tr>
      <tr><td><code>/__openpress/comment</code></td><td>POST / GET / PATCH / DELETE</td><td>提交、列出、更新或是清除註解標記。供檢查器使用。</td></tr>
      <tr><td><code>/__openpress/search</code></td><td>GET</td><td>在已註冊的 MDX 來源中進行全文搜尋。</td></tr>
      <tr><td><code>/__openpress/source-edit</code></td><td>GET / POST</td><td>讀取未處理的原始碼字串或是套用一個行內的原始碼編輯 (文字區塊、表格儲存格、說明文字)。</td></tr>
      <tr><td><code>/__openpress/project-asset</code></td><td>POST</td><td>專案預覽相關動作。</td></tr>
      <tr><td><code>/__openpress/deploy</code></td><td>POST</td><td>執行已設定的部署轉接器。需要確認。</td></tr>
      <tr><td><code>/__openpress/local-pdf-export</code></td><td>POST</td><td>產生一份本機的 PDF 檔案。</td></tr>
      <tr><td><code>/__openpress/local-pdf-file</code></td><td>GET</td><td>提供最新的本機 PDF 檔案服務。</td></tr>
    </tbody>
  </table>

  <h2>內部實作 — 請勿依賴 (Internal — do not depend on)</h2>

  <p>以下的東西雖然可觸及，但被明確標示對於 1.0 版而言是 <strong>不</strong> 穩定的：</p>

  <ul>
    <li>
      位於 <code>@open-press/core/openpress/*</code> 下的深層匯入，或是任何未列在 package 的 <code>exports</code> 對應表中的路徑。請使用統一匯入點 (<code>/app</code>, <code>/document-model</code>, <code>/reader</code>, <code>/shared</code>, <code>/workbench</code>) 或是頂層的進入點。
    </li>
    <li>
      <code>engine/react/pagination.mjs</code> 匯出了圍繞區域分配器 (region allocator) 的分頁輔助工具。該區域分配器 (<code>allocateBlocksToRegions</code>, <code>pagesFromRegions</code>) 才是長期的 API。
    </li>
    <li>
      <code>document-model/objectEntityModel</code> — id 編碼方式 (<code>mdx-block:...</code>, <code>mdx-area:...</code>, <code>page:...</code>) 在 HTML 中是可觀察的，但針對表格儲存格 (cell) / 嵌套實體 (nested entities) 的確切格式可能還會被修改。
    </li>
    <li>
      Workbench 的內部實作 (<code>HtmlWorkbench</code> 內部 hooks, <code>InlineInspectorLayer</code> props, 側邊面板註冊表的資料結構)。shell 透過組合這些東西來運作，但它們並不打算供外部使用。
    </li>
    <li>
      引擎 CLI 內部實作 — 請使用 <code>npm run openpress:*</code> 腳本，而不是直接觸及 <code>engine/commands/*</code> 內部。
    </li>
  </ul>

  <div class="callout">
    <strong>將內部功能提升為公開 API。</strong> 如果您的開發依賴於某個內部 symbol 並且希望它受到 semver 的保護，這條路徑是很短的：開啟一個附帶使用情境的 issue，我們會對該介面進行審核，並在下一次發佈時讓它登上這個頁面。
  </div>
