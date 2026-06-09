---
title: "/apply-comments"
eyebrow: "Skill"
description: "保留中の @openpress-comment マーカーを解決します。各マーカーについて、周囲の文章を読み、編集内容を決定して適用し、マーカーを削除します。どれが処理され、どれが人間の介入を必要とするかを報告します。"
---
<ApiEntry
    name="/apply-comments"
    kind="command"
    importFrom="/apply-comments"
    summary="コメント解決ワークフロー。要求された編集がソースに反映され、かつマーカーが削除された場合にのみコメントは解決されます。曖昧なマーカーはそのまま残されます — 暗黙のうちにクリアされることはありません。"
  >
    <p>
      <code>skills/openpress-apply-comments/</code> に存在します。マーカーのフォーマットと作成側については <a href="/docs/guides/comment-markers">コメントマーカー</a> で文書化されています。
    </p>
  </ApiEntry>

  <h2>ワークフロー</h2>

  <ol>
    <li>
      <strong>発見 (Discover)</strong> — 保留中のマーカーをリストアップします:
      ### 例: すべてのマーカーを見つける

```bash
rg "@openpress-comment" press -n
```
      デコードされたメモが必要な場合は、フレームワークヘルパーを呼び出します:
      ### 例: デコードされた JSON 出力

```bash
node --input-type=module -e \
  'import { listCommentMarkers } from "./packages/core/engine/react/comment-marker.mjs"; \
   console.log(JSON.stringify(await listCommentMarkers({ root: process.cwd() }), null, 2));'
```
    </li>
    <li>
      <strong>スコープ (Scope)</strong> — ユーザーが（ID によって）1つのマーカーを指定した場合、それのみを解決します。ユーザーが ID なしで「コメントを適用 (apply comments)」と指示した場合、ソースの順序で保留中のマーカーを処理します。1回のパスにつき1つのマーカー — 無関係な書き換えを1つの解決にまとめることは絶対にしないでください。
    </li>
    <li>
      <strong>検査 (Inspect)</strong> — マーカーを含むソースファイルを読みます。編集する前に周囲の行を読んでください。マーカーのヒント + レンダリングされたオブジェクトのメタデータを使用しますが、ソースと照らし合わせて検証してください。
    </li>
    <li>
      <strong>適用 (Apply)</strong> — コメントを満たす最小限のソース変更を行います。ローカルスタイル、コンポーネント API、および MDX 構造を保持します。リクエストが曖昧な場合は、明確化を求め、マーカーをそのまま残してください。
    </li>
    <li>
      <strong>マーカーの削除</strong> — ソースの編集が行われた後にのみ削除します。単に読んだという理由だけでマーカーをクリアしないでください。
    </li>
    <li>
      <strong>検証 (Verify)</strong> —
      ### 例: 検証

```bash
npm run build              # 検証 + レンダリング
```
    </li>
    <li>
      <strong>報告 (Report)</strong> — 解決された ID、変更されたファイル、曖昧なために残されたマーカー、検証ステータス。
    </li>
  </ol>

  <h2>境界</h2>

  <ul>
    <li>生成された出力ではなく、ソースを編集します。<code>public/openpress/</code>、<code>dist-react/</code>、<code>.deploy/</code>、または <code>.openpress/</code> には絶対に触れません。</li>
    <li>デフォルトの編集ターゲットは、マーカーを含むソースファイルです。</li>
    <li>ドメインに依存する作業は、それを所有するスキルにルーティングします:
      <ul>
        <li>ページの文章、階層、キャプション、主張、トーン、ページコンポーネントについては <code>openpress-create-pages</code>。</li>
        <li>デッキの構成、スライドの密度、テーマ、スライドレイアウト、再利用可能な UI プリミティブについては <code>openpress-create-slide</code>。</li>
        <li>図のセマンティクスについては <code>openpress-diagram-drawing</code>。</li>
      </ul>
    </li>
    <li>1つのマーカーを解決している間に、無関係なセクションを書き換えることはありません。</li>
    <li>要求された編集を適用せずにマーカーを暗黙のうちにクリアすることはありません。</li>
  </ul>

  <h2>よくある間違い</h2>

  <ul>
    <li>編集を適用せずにマーカーを削除すること。</li>
    <li>マーカーが小さな変更しか求めていないのに、広範なセクションを書き換えること。</li>
    <li>ビルドを検証せずに、ブラウザに変更が反映されたと主張すること。</li>
  </ul>

  <h2>ソース</h2>

  <ul>
    <li><a href="https://github.com/quan0715/open-press/blob/main/skills/openpress-apply-comments/SKILL.md" rel="noopener"><code>skills/openpress-apply-comments/SKILL.md</code></a></li>
  </ul>
