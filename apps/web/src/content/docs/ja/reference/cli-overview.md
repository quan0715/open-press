---
title: "CLI 概要"
eyebrow: "@open-press/cli"
description: "CLIは3つのティアで構成されています — ライフサイクル（日常のビルドループ）、出力ターゲット（PDF / 画像 / デプロイ）、およびツール（エージェントとワークベンチ用のユーティリティ）です。"
---
<p>
    OpenPressはWorkspaceのブートストラップとローカルの拡張を分割しています：<code>npm create @open-press</code>でWorkspaceを作成し、<code>open-press create</code>で別のPressを追加し、<code>open-press &lt;command&gt;</code>（および一致する<code>npm run</code>スクリプト）でWorkspace内から日々のワークフローを実行します。
  </p>

  <div class="callout">
    <strong>サーフェスの安定性。</strong> ティア1 + ティア2コマンドは1.0コントラクトの一部です。
    ティア3ツールはエージェントとワークベンチ用に実装されています。文書化されたコマンド名とnpmスクリプトを通じてそれらを使用してください。
  </div>

  <div class="cli-grid">
    <a class="cli-card" href="/docs/concepts/cli-lifecycle">
      <p class="cli-card__eyebrow">ティア1</p>
      <h3>ライフサイクル</h3>
      <p>日常のループ。<code>create</code>、<code>dev</code>、<code>build</code>、<code>preview</code>、<code>typecheck</code> — ViteやAstroと同じ形です。</p>
    </a>

    <a class="cli-card" href="/docs/reference/cli-outputs">
      <p class="cli-card__eyebrow">ティア2</p>
      <h3>出力ターゲット</h3>
      <p>標準のHTMLバンドル以外のアーティファクトの生成。<code>openpress:pdf</code>、<code>openpress:image</code>、および<code>openpress:deploy</code>。</p>
    </a>

    <a class="cli-card" href="/docs/reference/cli-tools">
      <p class="cli-card__eyebrow">ティア3</p>
      <h3>ツール</h3>
      <p>AIエージェントとワークベンチのためのユーティリティ — <code>search</code>、<code>replace</code>、<code>inspect</code>、<code>doctor</code>、<code>upgrade</code>、および<code>skills:sync</code>。</p>
    </a>
  </div>

  <h2>各ページの読み方</h2>

  <ul>
    <li>
      すべてのコマンドは、バッジのkind、呼び出し形式、1行の要約、フラグ用のpropsテーブル、および例を含む<strong>APIエントリ</strong>としてレンダリングされます。
    </li>
    <li>
      コマンドの呼び出しが<code>open-press</code>とバンドルされた<code>npm run</code>エイリアス間で異なる場合、<em>インポート行</em>はそのコマンドにとってより自然な形式を使用します。
    </li>
    <li>
      コマンドまたはアダプターがここにリストされていない場合、エージェントは隠されたCLIサーフェスを発明するのではなく、境界を報告する必要があります。
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
