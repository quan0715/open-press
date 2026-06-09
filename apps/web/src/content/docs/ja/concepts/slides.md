---
title: "Slidesアーキテクチャ"
eyebrow: "Runtime"
description: "slides Press がどのように構成されているか — スライドごとのフォルダ、順序付きインデックスファイル、SlideMeta、およびビルド時の objectId のインジェクション。"
---
<p>
    slides Press は、<strong>スライドごとに 1 つのフォルダ</strong> (folder-per-slide) というレイアウトを使用します。各スライドは
    <code>slides/</code> 下の自己完結したディレクトリです。エンジンはこのディレクトリをスキャンしてスライドを発見します。
    <code>press.tsx</code> は、プレゼンテーションの順序を制御する順序付きインデックスとして機能します。
  </p>

  <h2>ディレクトリ構造</h2>

  ### Example: press/<slug>/ tree

```text
press/<slug>/
  press.tsx              # 順序付きインデックス — 手動またはエージェントによって編集
  slides/
    <id>/
      slide.tsx          # 1 つのスライド: SlideMeta + デフォルトコンポーネント
  themes/
    default.css          # Press にスコープされた CSS
```

  <p>
    スライドの識別子 (<code>&lt;id&gt;</code>) は小文字のスラッグです： <code>intro</code>、
    <code>pricing-table</code>、<code>q-and-a</code>。これらは <code>press.tsx</code> の
    <code>&lt;Slide&gt;</code> 要素にある <code>id</code> プロパティに直接マッピングされます。
  </p>

  <h2>slide.tsx のコントラクト</h2>

  <p>
    すべての <code>slide.tsx</code> は 2 つのものをエクスポートします： <code>meta</code> 定数とデフォルトの
    React コンポーネントです。どちらも必須です。
  </p>

  ### Example: slides/<id>/slide.tsx

```tsx
import type { SlideMeta } from "@open-press/core";

export const meta = {
  layout: "default",
  description: "One-sentence summary of this slide's content.",
  keypoints: ["Point A", "Point B"],
} satisfies SlideMeta;

export default function Slide() {
  return (
    <section>
      <h2>Slide heading</h2>
      <p>Body content in JSX.</p>
    </section>
  );
}
```

  <h3>SlideMeta フィールド</h3>

  <table>
    <thead>
      <tr><th>フィールド</th><th>型</th><th>説明</th></tr>
    </thead>
    <tbody>
      <tr><td><code>layout</code></td><td><code>string</code></td><td>レイアウト名。Press に登録されているレイアウトコンポーネントと一致します。デフォルトは <code>"default"</code> です。</td></tr>
      <tr><td><code>description</code></td><td><code>string</code></td><td>1文のプレーンテキストによる概要。エージェントがコンテキストを把握するため、およびワークベンチのインスペクターで使用されます。</td></tr>
      <tr><td><code>keypoints</code></td><td><code>string[]</code></td><td>このスライドのトークポイントを箇条書きにしたもの。オプション。</td></tr>
      <tr><td><code>visuals</code></td><td><code>string[]</code></td><td>意図した視覚要素のプレーンテキストによる説明。エージェントへのガイダンスとして使用されます。</td></tr>
    </tbody>
  </table>

  <div class="callout">
    <strong>不明なフィールドは不可。</strong> <code>meta</code> は <code>satisfies SlideMeta</code>
    を使用します — 余分なフィールドは TypeScript のエラーになります。<code>meta</code> にカスタムプロパティを追加しないでください。
    スライド固有のデータは JSX 内に直接記述してください。
  </div>

  <h2>press.tsx — 順序付きインデックス</h2>

  <p>
    <code>press.tsx</code> は、Press 内でスライドの順序を制御する唯一のファイルです。ここで自己完結型の
    <code>&lt;Slide id /&gt;</code> マーカーを宣言します。対応するスライドコンテンツは
    <code>slides/&lt;id&gt;/slide.tsx</code> に配置されます。
  </p>

  ### Example: press/<slug>/press.tsx

```tsx
import { Press, Slide } from "@open-press/core";

export default function DeckPress() {
  return (
    <Press slug="deck" title="My deck" type="slides" page="slide-16-9">
      <Slide id="intro" />
      <Slide id="pricing" />
      <Slide id="q-and-a" />
    </Press>
  );
}
```

  <p>
    エージェントは <code>press.tsx</code> を書き換えることでスライドを並べ替えます — インポート行と
    対応する <code>&lt;Slide&gt;</code> 子要素を一緒に移動させます。エンジンは、<code>press.tsx</code> 内の
    すべての <code>id</code> が <code>slides/</code> 下のディレクトリと一致することを検証します。
  </p>

  <h2>スキップされたスライド</h2>

  <p>
    スライドは、削除することなく、レンダリングされるデックから除外することができます。<code>press.tsx</code> の
    <code>&lt;Slide&gt;</code> 要素に <code>skip</code> プロパティを追加します：
  </p>

  ### Example: Skipping a slide

```tsx
<Slide id="draft" skip><Slide2 /></Slide>
```

  <p>
    エンジンはスキップされたスライドを出力から除外し、それらの CSS やアセットをインポートしません。
    ソースファイルは <code>slides/draft/</code> にそのまま残ります。
  </p>

  <h2>CLI を使用したスライドの追加</h2>

  ### Example: Add a slide

```bash
# slides Workspace 内で
open-press slide add pricing

# レイアウトのヒントとともに
open-press slide add pricing --layout titled-content
```

  <p>
    このコマンドは、スタブの <code>meta</code> とコンポーネントを持つ <code>slides/pricing/slide.tsx</code> を作成し、
    その後対応する <code>&lt;Slide&gt;</code> エントリーを <code>press.tsx</code> に追加します。
  </p>

  <h2>objectId のインジェクション</h2>

  <p>
    エンジンはビルド時に、レンダリングされたスライド要素に <code>data-op-id</code> 属性をインジェクションします。
    これらの識別子は、ワークベンチのインライン編集機能やコメントマーカー機能を強力にサポートします。
  </p>

  <div class="callout">
    <strong><code>objectId</code> や <code>data-op-id</code> を手動で記述しないでください。</strong>
    手作業で作成された値は検証エラーになります。エンジンがインジェクションを管理し、ソースはクリーンな状態に保たれます。
  </div>

  <h2>検証ルール</h2>

  <p>エンジンはビルド時に以下の制約を強制します：</p>

  <ul>
    <li><code>press.tsx</code> 内のすべての <code>id</code> は、一致する <code>slides/&lt;id&gt;/slide.tsx</code> を持たなければなりません。</li>
    <li><code>export const meta</code> はリテラルオブジェクト式でなければなりません — <code>buildMeta()</code> の呼び出し、スプレッド構文、または再エクスポートは不可です。</li>
    <li><code>slides/&lt;id&gt;/slide.tsx</code> には、<code>objectId</code> プロパティや <code>data-op-id</code> 属性を含めてはいけません。</li>
    <li>スライドとレイアウトファイルは、<code>themes/</code> から直接インポートしてはいけません — エンジンのエントリーラッパーのみがテーマの CSS をインポートします。</li>
  </ul>


<style>
  table {
    width: 100%;
    border-collapse: collapse;
    margin: var(--op-space-4) 0 var(--op-space-6);
    font-size: var(--op-text-sm);
  }
  th, td {
    text-align: left;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--op-hairline);
  }
  th {
    font-weight: 600;
    color: var(--op-ink-strong);
    background: color-mix(in srgb, var(--op-ink) 4%, transparent);
  }
  td code {
    padding: 0.06em 0.3em;
    border-radius: 3px;
    background: color-mix(in srgb, var(--op-ink) 7%, transparent);
    font-family: var(--op-font-mono);
    font-size: 0.85em;
  }
</style>
