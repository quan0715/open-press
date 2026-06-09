---
title: "useSource"
eyebrow: "@open-press/core"
description: "Press ツリーの解決済みソースマップから、登録された MDX ソースを読み取る React フック。同期的で、<Press> 内のどこからでも安全に呼び出すことができます。"
---
  <ApiEntry
    name="useSource(id)"
    kind="hook"
    importFrom={'import { useSource } from "@open-press/core";'}
    signature={`function useSource<T = ResolvedSource>(id: string): T`}
    summary="解決済みのソースを登録されたキーで読み取ります。エンジンはレンダリング前に同期的にソースにデータを入力するため、このフックが null を返すことはありません — id が不明な場合はスローします。"
  >
    <PropsTable
      title="パラメーター"
      rows={[
        {
          name: "id",
          type: "string",
          required: true,
          description: "<code>&lt;Press sources&gt;</code> 配列内の <code>mdxSource()</code> に渡されるソースの <code>id</code>。大文字と小文字は区別されます。完全に一致する必要があります。",
        },
      ]}
    />

    <PropsTable
      title="戻り値"
      rows={[
        {
          name: "ResolvedSource",
          type: "object",
          description: "完全に解決されたソース — ブロック、メタデータ、アンカーマップ、およびブロックごとのソースマッピング。登録を拡張した場合は、<code>useSource&lt;CustomShape&gt;(id)</code> を介して型パラメーター化できます。",
        },
      ]}
    />

    <PropsTable
      title="例外（Throws）"
      rows={[
        {
          name: "Outside <Press>",
          type: "Error",
          description: "<code>&lt;Press&gt;</code> サブツリー内でレンダリングされていないコンポーネントから呼び出された場合。エラーメッセージには、読み取ろうとしたソースが示されます。",
        },
        {
          name: "Unknown source id",
          type: "Error",
          description: "<code>id</code> がどの登録済みソースとも一致しない場合。タイプミスを見つけやすいように、エラーには既知のすべてのソースキーがリストされます。",
        },
      ]}
    />

    ### 例：登録されたソースの読み取り

```tsx
import { useSource } from "@open-press/core";

function CustomTableOfContents() {
  const story = useSource("story");
  return (
    <ul>
      {story.sections.map((s) => (
        <li key={s.id}>{s.title}</li>
      ))}
    </ul>
  );
}
```

    ### 例：型パラメーター化された読み取り

```tsx
import { useSource } from "@open-press/core";
import type { ResolvedSource } from "@open-press/core";

interface StorySource extends ResolvedSource {
  sections: Array<{ id: string; title: string; chapterCount: number }>;
}

function ChapterCounts() {
  const story = useSource<StorySource>("story");
  return story.sections.map((s) => (
    <div key={s.id}>{s.title}: {s.chapterCount} chapters</div>
  ));
}
```
  </ApiEntry>

  <h2>いつ使用するか</h2>

  <ul>
    <li>
      <strong>カスタムフレームヘルパー</strong> — 独自の <code>&lt;Sections&gt;</code> の代替、またはマニュスクリプトヘルパーのラッパーを作成している場合、これがソースを読み取る方法です。
    </li>
    <li>
      <strong>カスタム TOC</strong> — バンドルされている <code>&lt;Toc&gt;</code> が適さず、セクションのタイトルやページ番号をゼロからレンダリングする必要がある場合。
    </li>
    <li>
      <strong>メタデータ駆動のクロム</strong> — 設定からではなくソース登録から作成者 / バージョン / セクション数を読み取る必要があるページヘッダー、フッター、またはカバー。
    </li>
  </ul>

  <h2>いつ使用しないか</h2>

  <ul>
    <li>
      <strong>MDX 散文内</strong> — MDX ブロックはすでにソースコンテキストでレンダリングされています。フックから再読み込みするのではなく、ブロックレベルの prop を使用してください。
    </li>
    <li>
      <strong><code>&lt;Press&gt;</code> の外側</strong> — フックがスローします。ドキュメントツリーの外側でソースデータが必要な場合は、所有している <code>press/&lt;slug&gt;/press.tsx</code> モジュールまたは共有ソースモジュールから読み取ってください。
    </li>
  </ul>

  <h2>関連</h2>

  <ul>
    <li><a href="/docs/ja/reference/data-mdx-sources">MDX ソース</a> — ソースがどのように登録されるか。</li>
    <li><a href="/docs/ja/reference/data-manuscript">マニュスクリプトヘルパー</a> — <code>useSource</code> の組み込みコンシューマー。</li>
    <li><a href="/docs/ja/reference/components-press">Press</a> — <code>useSource</code> が読み取る境界。</li>
  </ul>
