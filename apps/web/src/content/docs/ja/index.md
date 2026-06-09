---
title: "ドキュメント"
eyebrow: "Docs"
description: "OpenPress は、エージェントファーストなドキュメントパッケージです。skill、ソース、ページコンポーネント、MDX ドキュメント、プレビュー、検証、およびエクスポートのための共有基本コントラクトです。"
---
<div class="doc-grid">
<a class="doc-card" href="/docs/getting-started">
<p class="doc-card__eyebrow">Start</p>
<h3>クイックスタート</h3>
<p>2つのエントリーポイント：skillをインストールしてエージェントに依頼するか、CLIを直接実行します。</p>
</a>

<a class="doc-card" href="/docs/concepts/working-with-agents">
<p class="doc-card__eyebrow">Start</p>
<h3>Work with Agent</h3>
<p>エージェントがどのように初期化し、ソースを編集し、skill を使用し、出力を検証し、境界で停止すべきかについて。</p>
</a>

<a class="doc-card" href="/docs/skills">
<p class="doc-card__eyebrow">Skills</p>
<h3>AI エージェントインテグレーション</h3>
<p>組み込みの運用 skill、作成 skill、starter を提供する skill、および外部のクリエイティブ skill。</p>
</a>

<a class="doc-card" href="/docs/concepts/themes">
<p class="doc-card__eyebrow">Runtime</p>
<h3>Themes</h3>
<p><code>press/&lt;slug&gt;/theme/</code> と <code>press/shared/theme/</code> のコントラクト。</p>
</a>

<a class="doc-card" href="/docs/reference/data-mdx-sources">
<p class="doc-card__eyebrow">Runtime</p>
<h3>MDX sources</h3>
<p><code>mdxSource()</code> と <code>sources</code> エクスポートが、コンテンツをどのようにエンジンに接続するか。</p>
</a>

<a class="doc-card" href="/docs/guides/comment-markers">
<p class="doc-card__eyebrow">Runtime</p>
<h3>Comment markers</h3>
<p>インラインの <code>@openpress-comment</code> マーカー — 外部データベースなしのレビューフロー。</p>
</a>

<a class="doc-card" href="/docs/concepts/workspace-config">
<p class="doc-card__eyebrow">Runtime</p>
<h3>Workspace config</h3>
<p>設定が配置される場所 — <code>&lt;Press&gt;</code> プロパティ、<code>package.json "openpress"</code>、およびパスの規約。</p>
</a>

<a class="doc-card" href="/docs/cli">
<p class="doc-card__eyebrow">CLI</p>
<h3>コマンド</h3>
<p>3つの層 — ライフサイクル (<code>create</code>/<code>dev</code>/<code>build</code>)、出力 (<code>pdf</code>/<code>image</code>/<code>deploy</code>)、ツール (<code>search</code>/<code>inspect</code>/<code>doctor</code>)。</p>
</a>

<a class="doc-card" href="/docs/reference/public-api">
<p class="doc-card__eyebrow">API reference</p>
<h3>Public API</h3>
<p>semver でカバーされるエクスポート、設定フィールド、CSS 変数、マーカーフォーマット、および開発エンドポイント。</p>
</a>

<a class="doc-card" href="/docs/reference/components-press">
<p class="doc-card__eyebrow">API reference</p>
<h3>Press</h3>
<p>ドキュメントのエントリー — プロパティを介したメタデータ、子要素を介したページツリー。ドキュメントごとに1つ。</p>
</a>

<a class="doc-card" href="/docs/reference/components-workspace">
<p class="doc-card__eyebrow">API reference</p>
<h3>Workspace</h3>
<p>マルチドキュメントプロジェクト — ブランドとデータを共有する提案書 + ピッチデック + ソーシャルカード。</p>
</a>

<a class="doc-card" href="/docs/reference/components-frame">
<p class="doc-card__eyebrow">API reference</p>
<h3>Frame</h3>
<p>1つの固定ページサーフェス。カバー、コンテンツページ、スライド、およびソーシャルカードはすべて Frame です。</p>
</a>

<a class="doc-card" href="/docs/reference/components-text">
<p class="doc-card__eyebrow">API reference</p>
<h3>Text</h3>
<p>スライド、カード、カバー、キャプション、およびコンポーネントコピー用の、スタイルを持たない編集可能なテキストオブジェクト。</p>
</a>

<a class="doc-card" href="/docs/reference/components-mdx-area">
<p class="doc-card__eyebrow">API reference</p>
<h3>MdxArea</h3>
<p>エンジンが割り当てられたブロックで満たす、Frame 内の測定可能なスロット。</p>
</a>

<a class="doc-card" href="/docs/reference/data-manuscript">
<p class="doc-card__eyebrow">API reference</p>
<h3>Manuscript helpers</h3>
<p><code>Sections</code> + <code>Toc</code> — 長文のセクションフローのためのオプションのヘルパー。</p>
</a>

<a class="doc-card" href="/docs/reference/data-use-source">
<p class="doc-card__eyebrow">API reference</p>
<h3>useSource</h3>
<p>Press ツリー内から、登録された MDX ソースを読み取ります。不明な id の場合はエラーを投げます。</p>
</a>
</div>

<h2>規約</h2>

<ul>
<li>各 API エントリーには、Kind バッジ、呼び出し形式、概要、プロパティテーブル、および例が含まれます。</li>
<li>プロパティテーブル: <em>名前 · 型 · デフォルト · 説明</em>。</li>
<li>API ページ外のすべてのもの — 深いインポート、内部ヘルパー — は 1.0 の安定性では<strong>カバーされません</strong>。</li>
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
