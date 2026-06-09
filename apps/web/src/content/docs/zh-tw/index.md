---
title: "文件"
eyebrow: "Docs"
description: "OpenPress 是一個以 agent 為優先的文件套件：提供 skills、原始碼、頁面元件、MDX 文件、預覽、驗證與匯出的共用基礎契約。"
---
<div class="doc-grid">
<a class="doc-card" href="/docs/getting-started">
<p class="doc-card__eyebrow">開始 (Start)</p>
<h3>快速開始</h3>
<p>兩個進入點：安裝 skills 並要求 agent，或是直接執行 CLI。</p>
</a>

<a class="doc-card" href="/docs/concepts/working-with-agents">
<p class="doc-card__eyebrow">開始 (Start)</p>
<h3>與 Agent 合作</h3>
<p>agents 應如何初始化、編輯原始碼、使用 skills、驗證輸出並在邊界處停止。</p>
</a>

<a class="doc-card" href="/docs/skills">
<p class="doc-card__eyebrow">Skills</p>
<h3>AI agent 整合</h3>
<p>內建的營運 skills、撰寫 skills、包含 starter 的 skills，以及外部創意 skills。</p>
</a>

<a class="doc-card" href="/docs/concepts/themes">
<p class="doc-card__eyebrow">執行期 (Runtime)</p>
<h3>佈景主題 (Themes)</h3>
<p><code>press/&lt;slug&gt;/theme/</code> 與 <code>press/shared/theme/</code> 契約。</p>
</a>

<a class="doc-card" href="/docs/reference/data-mdx-sources">
<p class="doc-card__eyebrow">執行期 (Runtime)</p>
<h3>MDX 來源</h3>
<p><code>mdxSource()</code> 與 <code>sources</code> 匯出如何將內容連線到引擎中。</p>
</a>

<a class="doc-card" href="/docs/guides/comment-markers">
<p class="doc-card__eyebrow">執行期 (Runtime)</p>
<h3>註解標記</h3>
<p>行內 <code>@openpress-comment</code> 標記 — 無需外部資料庫的審閱流程。</p>
</a>

<a class="doc-card" href="/docs/concepts/workspace-config">
<p class="doc-card__eyebrow">執行期 (Runtime)</p>
<h3>Workspace 設定</h3>
<p>設定存放的地方 — <code>&lt;Press&gt;</code> props、<code>package.json "openpress"</code>，以及路徑慣例。</p>
</a>

<a class="doc-card" href="/docs/cli">
<p class="doc-card__eyebrow">CLI</p>
<h3>指令</h3>
<p>三個層級 — 生命週期 (<code>create</code>/<code>dev</code>/<code>build</code>)、輸出 (<code>pdf</code>/<code>image</code>/<code>deploy</code>)、工具 (<code>search</code>/<code>inspect</code>/<code>doctor</code>)。</p>
</a>

<a class="doc-card" href="/docs/reference/public-api">
<p class="doc-card__eyebrow">API 參考</p>
<h3>公開 API</h3>
<p>受 semver 保障的匯出、設定欄位、CSS 變數、標記格式與開發端點。</p>
</a>

<a class="doc-card" href="/docs/reference/components-press">
<p class="doc-card__eyebrow">API 參考</p>
<h3>Press</h3>
<p>文件進入點 — 透過 props 提供 metadata，透過 children 提供頁面樹。每份文件一個。</p>
</a>

<a class="doc-card" href="/docs/reference/components-workspace">
<p class="doc-card__eyebrow">API 參考</p>
<h3>Workspace</h3>
<p>多文件專案 — 提案 + 簡報 + 社交卡片共用品牌與資料。</p>
</a>

<a class="doc-card" href="/docs/reference/components-frame">
<p class="doc-card__eyebrow">API 參考</p>
<h3>Frame</h3>
<p>單一固定頁面表面。封面、內容頁面、簡報與社交卡片全都是 Frame。</p>
</a>

<a class="doc-card" href="/docs/reference/components-text">
<p class="doc-card__eyebrow">API 參考</p>
<h3>Text</h3>
<p>無樣式的可編輯文字物件，用於簡報、卡片、封面、圖說與元件文案。</p>
</a>

<a class="doc-card" href="/docs/reference/components-mdx-area">
<p class="doc-card__eyebrow">API 參考</p>
<h3>MdxArea</h3>
<p>Frame 內部可測量的插槽，引擎會將分配好的區塊填入其中。</p>
</a>

<a class="doc-card" href="/docs/reference/data-manuscript">
<p class="doc-card__eyebrow">API 參考</p>
<h3>文稿輔助工具 (Manuscript helpers)</h3>
<p><code>Sections</code> + <code>Toc</code> — 適用於長篇章節流程的選擇性輔助工具。</p>
</a>

<a class="doc-card" href="/docs/reference/data-use-source">
<p class="doc-card__eyebrow">API 參考</p>
<h3>useSource</h3>
<p>從 Press tree 內部讀取已註冊的 MDX 來源。遇到未知的 id 時會拋出錯誤。</p>
</a>
</div>

<h2>慣例</h2>

<ul>
<li>每個 API 條目都有類型徽章、呼叫形式、摘要、props 表格以及範例。</li>
<li>Props 表格：<em>名稱 · 類型 · 預設值 · 描述</em>。</li>
<li>API 頁面之外的任何東西 — 深度匯入、內部輔助工具 — 都 <strong>不受</strong> 1.0 穩定性保障。</li>
</ul>


<style>
  .doc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: var(--op-space-4);
    margin: var(--op-space-6) 0 var(--op-space-8);
  }

  .doc-card {
    display: grid;
    gap: 0.4rem;
    padding: var(--op-space-5);
    border: 1px solid var(--op-hairline);
    background: color-mix(in srgb, var(--op-surface) 84%, var(--op-paper));
    color: var(--op-ink);
    text-decoration: none;
    transition:
      border-color 140ms ease,
      transform 140ms ease,
      box-shadow 140ms ease;
  }
  .doc-card:hover {
    border-color: var(--op-accent);
    transform: translateY(-1px);
    box-shadow: 0 1rem 2rem color-mix(in srgb, var(--op-ink) 7%, transparent);
  }
  .doc-card__eyebrow {
    margin: 0;
    color: var(--op-subdued);
    font-family: var(--op-font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .doc-card h3 {
    margin: 0;
    font-family: var(--op-font-body);
    font-size: var(--op-text-lg);
    font-weight: 600;
    color: var(--op-ink-strong);
  }
  .doc-card p {
    margin: 0;
    color: var(--op-subdued-strong);
    font-size: var(--op-text-sm);
    line-height: 1.5;
  }
  .doc-card p code {
    padding: 0.06em 0.3em;
    border-radius: 3px;
    background: color-mix(in srgb, var(--op-ink) 7%, transparent);
    font-family: var(--op-font-mono);
    font-size: 0.85em;
  }
</style>
