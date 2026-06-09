---
title: "テーマ (Themes)"
eyebrow: "press/<slug>/theme/"
description: "OpenPress は、フォルダローカルのテーマディレクトリおよびオプションの press/shared/theme (tokens.css、fonts.css、base/、page-surfaces/、shell/、およびオプションの patterns/) から CSS を読み込みます。各フォルダには単一の役割があり、それ以外のものは読み込まれません。"
---
/theme/"
  description="OpenPress は、フォルダローカルのテーマディレクトリおよびオプションの press/shared/theme (tokens.css、fonts.css、base/、page-surfaces/、shell/、およびオプションの patterns/) から CSS を読み込みます。各フォルダには単一の役割があり、それ以外のものは読み込まれません。"
>
  <p>
    テーマは、決まったレイアウトで配置された単なる CSS ファイルです。エンジンはビルド時にこれらを解決し、ページジオメトリの変数を注入して、すべてをフラットな <code>theme.css</code> のバンドル出力として出力します。
    テーマのランタイムや JS フックはありません。新しいテーマを追加するということは、文書化されたトークンを使用する CSS を記述することを意味します。
  </p>

  <h2>ディレクトリの規約</h2>

  <PropsTable
    title="エンジンがテーマフォルダから読み込むもの"
    rows={[
      { name: "tokens.css", type: "required", description: "CSS 変数 — 色、フォント、余白、およびページジオメトリのデフォルト値。他の CSS が依存する最初のファイルです。" },
      { name: "fonts.css", type: "required", description: "バンドルされた Web フォント用の <code>@font-face</code> ルール。システムフォントのみを使用する場合は空でもかまいません。" },
      { name: "base/page-contract.css", type: "required", description: "<code>@page</code> ルール + ジオメトリトークンを使用する page-surface CSS。印刷可能領域を定義します。" },
      { name: "base/typography.css", type: "required", description: "<code>MdxArea</code> 内の <code>h1</code> … <code>p</code> のデフォルトのタイプスケール。" },
      { name: "base/print.css", type: "required", description: "PDF エクスポート用の <code>@media print</code> ルール。最小限で構いませんが、ファイルは存在する必要があります。" },
      { name: "page-surfaces/{cover,toc,back-cover}.css", type: "optional", description: "Frame の役割ごとのスタイリング。ベースレイアウトに触れることなく、後でカバーを追加できるように、空のスタブとして保持されます。" },
      { name: "shell/reader-controls.css", type: "optional", description: "Workbench / リーダーの chrome のオーバーライド。フレームワークがデフォルトのコントロールを提供するため、ほとんどのスターターでは空のままです。" },
      { name: "patterns/*.css", type: "optional", description: "コンテンツごとのオプトインユーティリティクラス — フィギュアグリッド、チャートフレーム、テーブルセルのヘルパー。A4 長文のスターターには小さなセットが含まれますが、スライド / ソーシャルのスターターはこのフォルダをスキップします。" },
    ]}
  />

  <div class="callout">
    <strong>エンジンはページジオメトリを CSS 変数として注入します。</strong> テーマ内で
    <code>210mm</code> や <code>1080px</code> をハードコードしないでください。
    <code>--openpress-page-width</code>、<code>--openpress-page-height</code>、
    <code>--openpress-page-aspect-ratio</code> から読み取ってください。ジオメトリは
    <code>&lt;Press page&gt;</code> prop から提供されます (<a href="/docs/reference/components-press">Press</a>)。
  </div>

  <h2>tokens.css</h2>

  <ApiEntry
    name="tokens.css"
    kind="css-var"
    summary="ビジュアルスタイルの唯一の信頼できる情報源です。他のすべてのテーマファイルはこれらのトークンから読み取ります — 他の場所で色 / フォント / 余白の値をハードコードしないでください。"
  >
    ### 例: 最小限の tokens.css

```css
:root {
  /* Color */
  --op-ink: #1a1a1a;
  --op-ink-strong: #000;
  --op-paper: #fff;
  --op-paper-soft: #fafafa;
  --op-accent: #2563eb;
  --op-hairline: #e5e5e5;

  /* Type */
  --op-font-body: "Inter", system-ui, sans-serif;
  --op-font-display: "Inter Display", "Inter", sans-serif;
  --op-font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Type scale */
  --op-text-xs: 0.72rem;
  --op-text-sm: 0.85rem;
  --op-text-base: 1rem;
  --op-text-lg: 1.15rem;
  --op-text-2xl: 1.6rem;

  /* Spacing */
  --op-space-1: 4px;
  --op-space-2: 8px;
  --op-space-3: 12px;
  --op-space-4: 16px;

  /* Page geometry — the engine injects configured values at export time. */
  --openpress-page-width: 210mm;
  --openpress-page-height: 297mm;
}
```

    <p>
      トークン名は慣例として <code>--op-</code> プレフィックスを使用します。ページジオメトリの3つは、エンジンによって注入されるため <code>--openpress-page-*</code> を使用します。カスタムテーマでは独自の変数を追加できます — <code>--openpress-</code> で始まらないものはすべてあなたのテーマに属します。
    </p>
  </ApiEntry>

  <h2>base/ — レイアウトの基盤</h2>

  <ApiEntry
    name="base/page-contract.css"
    kind="css-var"
    summary="固定レイアウトの基盤です。@page ルール、page-surfaces、およびコンテンツが印刷可能領域のどこに配置されるかを定義します。エンジンが注入した変数からジオメトリを読み取ります。"
  >
    ### 例: 一般的なページコントラクト

```css
@page {
  size: var(--openpress-page-width) var(--openpress-page-height);
  margin: 0;
}

.openpress-page {
  width: var(--openpress-page-width);
  height: var(--openpress-page-height);
  background: var(--op-paper);
  color: var(--op-ink);
  /* 内側のパディングはここに配置されます — ページは @page の端に揃えられ、
     コンテンツはこのパディングによってインセットされます。 */
  padding: 22mm 18mm;
}
```
  </ApiEntry>

  <ApiEntry
    name="base/typography.css"
    kind="css-var"
    summary="MdxArea 内のデフォルトのタイプスケールです。見出し、段落、リスト、引用など、MDX ファイルがレンダリングする可能性のあるものをここでスタイル付けします。"
  />

  <ApiEntry
    name="base/print.css"
    kind="css-var"
    summary="@media print ルール。改ページ、カラープロファイル、フォントヒンティングなど、画面と PDF で異なるものを定義します。最小限で構いませんが、ファイルは存在する必要があります。"
  />

  <h2>page-surfaces/ — 役割ごとのスタイリング</h2>

  <p>
    各ファイルは <code>Frame role="…"</code> 名前空間に対応しています。名前はファイルに直接マッピングされます。<code>role="document.cover"</code> を持つ Frame は <code>cover.css</code> を読み込み、
    <code>role="document.toc"</code> は <code>toc.css</code> を読み込みます。ファイルはオプションですが、スタータースキルでは空のスタブを提供することが多いため、後でカバーを追加する際にベースファイルのレイアウトに触れる必要はありません。
  </p>

  ### 例: カバースルフェース

```css
/* page-surfaces/cover.css */
.openpress-page[data-role="document.cover"] {
  display: grid;
  place-content: end start;
  padding: 28mm 22mm;
  background: linear-gradient(180deg, var(--op-paper) 0%, var(--op-paper-soft) 100%);
}
.openpress-page[data-role="document.cover"] h1 {
  font-family: var(--op-font-display);
  font-size: 64pt;
  line-height: 1.05;
}
```

  <h2>patterns/ — オプトインのユーティリティクラス</h2>

  <p>
    コンテンツの類型（タイポロジー）に依存して存在する唯一のフォルダです。A4 長文のスターターには小さなユーティリティライブラリ（フィギュアグリッド、チャートフレームのラッパー、テーブルセルのヘルパー）が含まれますが、スライドやソーシャルのスターターは1ページに1つのメインブロックをレンダリングするため、このフォルダは完全にスキップされます。
  </p>

  <PropsTable
    title="一般的なパターンファイル (エディトリアル・モノグラフ / 学術論文)"
    rows={[
      { name: "figure-grid.css", type: "utility", description: "複数列の図のレイアウト (<code>.figure-grid</code>、<code>.figure-grid--2</code> など)。" },
      { name: "_chart-frame.css", type: "utility", description: "<code>&lt;ChartFigure&gt;</code> の外側ラッパー — キャプションの配置、脚注のルール。" },
      { name: "table-utilities.css", type: "utility", description: "セルヘルパー — <code>.cell-numeric</code>、<code>.cell-strong</code>、交互の行のフック。" },
    ]}
  />

  <div class="callout">
    <strong>パターンの追加はコンテンツ主導です。</strong> "誰かが必要とするかもしれない" と前もってユーティリティクラスを記述しないでください。MDX が実際にそれらを必要とするまで待ち、その後ファイルを追加して <code>patterns/README.md</code> に文書化してください。バンドルされているスタータースキルはそのようにしているので、その習慣に従ってください。
  </div>

  <h2>shell/ — リーダー chrome のオーバーライド</h2>

  <p>
    <code>shell/reader-controls.css</code> は、フレームワークのデフォルトの Workbench の chrome（ツールバーボタン、ページズームコントロール、パネルの境界線）をオーバーライドします。ほとんどのテーマでは、デフォルトでうまく機能するため、ここは空のままにします。ブランドが異なるコントロールを必要とする場合にのみオーバーライドしてください。
  </p>

  <h2>新しいテーマの作成</h2>

  <ol>
    <li>出力に最も近いスターターから始めます（長文 → エディトリアル・モノグラフ、ソーシャルカード → 外部のクリエイティブスキル）。</li>
    <li><code>tokens.css</code> のトークン（色、フォント、タイプスケール）を置き換えます。視覚的なアイデンティティの変更のほとんどはここだけで行われます。</li>
    <li>ページジオメトリがプリセットと異なる場合は、<code>press/&lt;slug&gt;/press.tsx</code> の <code>&lt;Press page&gt;</code> JSX prop を設定します — CSS 内でジオメトリをハードコードしないでください。</li>
    <li>必要に応じて、タイプスケールとリズムのために <code>base/typography.css</code> を調整します。</li>
    <li>特定の Frame の役割がカスタムレイアウトを必要とする場合にのみ、<code>page-surfaces/*.css</code> に触れます。</li>
    <li>MDX が実際にユーティリティクラスを使用する場合にのみ <code>patterns/*.css</code> のエントリを追加します。それより前には追加しないでください。</li>
    <li><code>npm run build</code> の前に Workbench (<code>npm run dev</code>) で検証します。</li>
  </ol>
