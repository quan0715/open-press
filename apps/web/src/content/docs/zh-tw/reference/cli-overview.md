---
title: "CLI 總覽"
eyebrow: "@open-press/cli"
description: "CLI 被組織成三個層級 — 生命週期 (日常的建置循環)、輸出目標 (PDF / 圖片 / 部署)，以及工具 (給 agents 和 workbench 使用的實用程式)。"
---
<p>
    OpenPress 將 workspace 的啟動 (bootstrap) 與本機擴充區分開來：<code>npm create @open-press</code>
    建立一個 workspace，<code>open-press create</code> 新增另一個 Press，而
    <code>open-press &lt;command&gt;</code> (加上對應的 <code>npm run</code> 腳本) 則負責從 workspace 內部執行日常的工作流程。
  </p>

  <div class="callout">
    <strong>介面穩定性。</strong> 第一層 + 第二層指令是 1.0 契約的一部分。
    第三層工具是為 agents 與 workbench 實作的；請透過文件記載的指令名稱與 npm 腳本來使用它們。
  </div>

  <div class="cli-grid">
    <a class="cli-card" href="/docs/concepts/cli-lifecycle">
      <p class="cli-card__eyebrow">第一層</p>
      <h3>生命週期 (Lifecycle)</h3>
      <p>日常的循環。<code>create</code>、<code>dev</code>、<code>build</code>、<code>preview</code>、<code>typecheck</code> — 與 Vite 或 Astro 具有相同的形式。</p>
    </a>

    <a class="cli-card" href="/docs/reference/cli-outputs">
      <p class="cli-card__eyebrow">第二層</p>
      <h3>輸出目標 (Output targets)</h3>
      <p>產生標準 HTML 套件包以外的產物。<code>openpress:pdf</code>、<code>openpress:image</code> 與 <code>openpress:deploy</code>。</p>
    </a>

    <a class="cli-card" href="/docs/reference/cli-tools">
      <p class="cli-card__eyebrow">第三層</p>
      <h3>工具 (Tools)</h3>
      <p>給 AI agents 與 workbench 使用的實用程式 — <code>search</code>、<code>replace</code>、<code>inspect</code>、<code>doctor</code>、<code>upgrade</code> 與 <code>skills:sync</code>。</p>
    </a>
  </div>

  <h2>如何閱讀每個頁面</h2>

  <ul>
    <li>
      每個指令都渲染為一個 <strong>API 條目</strong>，包含種類徽章、調用形式、單行摘要、用於旗標的 props 表格，以及一個範例。
    </li>
    <li>
      當指令的調用在 <code>open-press</code> 與打包的 <code>npm run</code> 別名之間有所不同時，<em>匯入行</em> 會使用對該指令而言較自然的任何一種形式。
    </li>
    <li>
      如果一個指令或轉接器沒有列在這裡，agents 應該回報這個邊界，而不是發明一個隱藏的 CLI 介面。
    </li>
  </ul>

<style>
  .cli-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: var(--op-space-4);
    margin: var(--op-space-6) 0 var(--op-space-8);
  }
  .cli-card {
    display: grid;
    gap: 0.4rem;
    padding: var(--op-space-5);
    border: 1px solid var(--op-hairline);
    border-radius: 6px;
    background: var(--op-surface);
    color: var(--op-ink);
    text-decoration: none;
    transition:
      border-color 140ms ease,
      transform 140ms ease,
      box-shadow 140ms ease;
  }
  .cli-card:hover {
    border-color: var(--op-accent);
    transform: translateY(-1px);
    box-shadow: 0 2px 12px color-mix(in srgb, var(--op-ink) 6%, transparent);
  }
  .cli-card__eyebrow {
    margin: 0;
    color: var(--op-subdued);
    font-family: var(--op-font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .cli-card h3 {
    margin: 0;
    font-family: var(--op-font-body);
    font-size: var(--op-text-lg);
    font-weight: 600;
    color: var(--op-ink-strong);
  }
  .cli-card p {
    margin: 0;
    color: var(--op-subdued-strong);
    font-size: var(--op-text-sm);
    line-height: 1.5;
  }
  .cli-card p code {
    padding: 0.06em 0.3em;
    border-radius: 3px;
    background: color-mix(in srgb, var(--op-ink) 7%, transparent);
    font-family: var(--op-font-mono);
    font-size: 0.85em;
  }
</style>
