---
title: "Text"
eyebrow: "@open-press/core"
description: "スタイルを持たない編集可能なテキストオブジェクト。Slide、カード、Cover、キャプション、またはカスタムコンポーネントが、スタイリングAPIを発明することなく安定したコメント/インライン編集のアンカーを必要とする場合に使用します。"
---
<div class="callout">
    <strong>Contract.</strong> <code>&lt;Text&gt;</code>はタイポグラフィ、間隔、色、またはバリアントを所有しません。スタイリングは、<code>className</code>とテーマセレクタを介した通常のCSSのままです。コンポーネントは、インスペクター、コメント、インラインエディターがターゲットにできるレンダリングされたオブジェクトの境界のみを提供します。
  </div>

  <ApiEntry
    name="<Text>"
    kind="component"
    importFrom={'import { Text } from "@open-press/core";'}
    signature={`<Text
  as?="span" | "p" | "h1" | ...
  objectId="title"
  label="Slide title"
  source?={{ path, kind, objectId, source }}
  metadata?={{ ... }}
  className?="..."
>
  Literal editable text
</Text>`}
    summary="リテラルテキストをkind=&quot;text&quot;のObjectEntityでラップします。リテラルの子要素は、React SSRエクスポート中にソース範囲に自動的にマッピングされます。式によって裏付けられたテキストは、編集可能であるべき場合に明示的なソース参照を提供できます。"
  >
    <PropsTable
      title="Props"
      rows={[
        {
          name: "objectId",
          type: "string",
          required: true,
          description:
            "現在のFrameまたは親エンティティにローカルな安定したID。レンダラーはこれを、コメントやインライン編集で使用される最終的な<code>text:...</code>オブジェクトIDにスコープします。",
        },
        {
          name: "label",
          type: "string",
          required: true,
          description:
            "インスペクター/エージェントワークフローに表示される人間が読めるラベル。<code>Slide title</code>、<code>Hero lede</code>、<code>Figure caption</code>などの意図的な名前を使用します。",
        },
        {
          name: "as",
          type: "keyof HTMLElementTagNameMap",
          default: '"span"',
          description:
            "レンダリングされるHTMLタグ。<code>h1</code>、<code>p</code>、<code>strong</code>、<code>figcaption</code>、<code>th</code>、<code>td</code>などのセマンティックタグを使用します。これはセマンティック構造であり、スタイルバリアントではありません。",
        },
        {
          name: "source",
          type: "EditableSourceRef",
          description:
            "オプションの手動ソースマッピング。通常、リテラルの子要素では省略します。Reactエクスポートパイプラインは<code>{ path, kind: &quot;tsx-text&quot;, objectId, source }</code>を自動的に注入します。",
        },
        {
          name: "metadata",
          type: "Record<string, string | number | boolean | null>",
          description:
            "エージェント向けの小さな機械可読ヒント。これは視覚的ではなく構造的に保ちます。例：フォントサイズや色ではなく<code>{ role: &quot;kicker&quot; }</code>。",
        },
        {
          name: "...rest",
          type: "HTMLAttributes<HTMLElement>",
          description:
            "レンダリングされた要素にパススルーされます。テーマのスタイリングには<code>className</code>を使用します。<code>Text</code>ラッパーに視覚的なプロップを追加しないでください。",
        },
      ]}
    />

    ### Example: Slide text with automatic source mapping

```tsx
import { Frame, Text } from "@open-press/core";

export function Slide() {
  return (
    <Frame frameKey="slide-01" role="canvas.slide" chrome={false}>
      <Text as="h1" objectId="title" label="Slide title" className="slide-title">
        Fixed canvas workflow
      </Text>
      <Text as="p" objectId="lede" label="Slide lede" className="slide-lede">
        Build slides as fixed Frames, then let the workbench handle comments and inline edits.
      </Text>
    </Frame>
  );
}
```

    <p>
      エクスポートされたHTMLは、上記の両方のテキストノードに対して自動的に<code>data-openpress-object-source</code>を受け取ります。これにより、ワークベンチは、作成者やエージェントが行番号を手書きすることなく、<code>press/&lt;slug&gt;/press.tsx</code>内の正確なリテラルを編集できます。
    </p>

    ### Example: Expression-backed text needs an explicit source if editable

```tsx
const title = "Generated title";

<Text
  as="h1"
  objectId="title"
  label="Slide title"
  source={{
    path: "press/slide/press.tsx",
    kind: "tsx-text",
    objectId: "title",
    source: { line: 1, column: 16, endLine: 1, endColumn: 31 },
  }}
>
  {title}
</Text>
```
  </ApiEntry>

  <h2>ソースマッピングのルール</h2>

  <ul>
    <li>
      <strong>リテラルの子要素はデフォルトで編集可能です。</strong> <code>&lt;Text&gt;</code>が<code>@open-press/core</code>からインポートされ、その子要素が単一のリテラルテキストノードである場合、OpenPressはReact SSRエクスポート中にソース範囲を導出します。
    </li>
    <li>
      <strong>式の子要素は推測されません。</strong> <code>{`{title}`}</code>、<code>{`{children}`}</code>、配列、およびマップされたコンテンツは、レンダリングされたオブジェクトとしてコメント可能なままですが、<code>source</code>を提供しない限りインライン編集できません。
    </li>
    <li>
      <strong>手動ソースが優先されます。</strong> <code>source</code>プロップが存在する場合、OpenPressはそれを保持し、別のものを注入しません。
    </li>
    <li>
      <strong>OpenPress Textのみが変換されます。</strong> <code>Text</code>という名前のローカルコンポーネントは、<code>Text</code>または<code>@open-press/core</code>からのエイリアスとしてインポートされない限り無視されます。
    </li>
  </ul>

  <h2>いつ使用するか</h2>

  <ul>
    <li>ワークベンチで直接編集できる必要があるSlide、カード、Cover、およびバックカバーのコピー。</li>
    <li>テキストがTSXで作成されている場合の、カスタムコンポーネント内のキャプションまたはコンパクトなラベル。</li>
    <li>MDXが不要で、各ページが固定のReactコンポーネントであるキャンバススタイルのページ。</li>
  </ul>

  <h2>いつ使用しないか</h2>

  <ul>
    <li>すでに<code>&lt;MdxArea&gt;</code>を介してレンダリングされている長文の散文。MDXブロックはすでにソースメタデータを保持しています。</li>
    <li>視覚的なスタイリングの懸念事項。タイポグラフィやレイアウトは、<code>Text</code>のプロップではなく、テーマCSSに記述します。</li>
    <li>ソースを1つの安定した編集可能な範囲として表現できない生成された文字列。</li>
  </ul>

  <h2>関連情報</h2>

  <ul>
    <li><a href="/docs/reference/components-frame">Frame</a> — ページとネストされた領域の境界。</li>
    <li><a href="/docs/reference/components-mdx-area">MdxArea</a> — ソースに裏付けられた長文の散文スロット。</li>
    <li><a href="/docs/reference/public-api">Public API</a> — semverでカバーされたエクスポートと開発エンドポイント。</li>
  </ul>
