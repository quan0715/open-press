---
title: "openpress-create-slide"
eyebrow: "Skill"
description: "スライド Press ツリーの生成、DeckSlide、スライドレイアウト、再利用可能なUIプリミティブ、デッキ構造、および初期テーマを備えた OpenPress スライドデッキを作成します。"
---
<ApiEntry
    name="openpress-create-slide"
    kind="skill"
    importFrom="skills/openpress-create-slide/SKILL.md"
    summary="スライドアーティファクトの作成を担当します。必要に応じて新規の Workspace のブートストラップ、スライド Press の追加、DeckSlide/レイアウト/UIのソース構造、テーマの取り込み、デッキの役割、アセット、モーションの規律、および検証を処理します。"
  >
    <p>
      アーティファクトがプレゼンテーションまたはスライドデッキである場合に使用します。 <code>openpress</code> スキルは引き続き、CLI のライフサイクル、検証、レンダリング、PDF/画像のエクスポート、アップグレード、および移行を担当します。
    </p>
  </ApiEntry>

  <h2>ワークフロー</h2>

  <ol>
    <li>Node、npm、および npx を確認します。OpenPress は Node.js 20 以降を必要とします。</li>
    <li>新規の Workspace か既存の <code>&lt;Workspace&gt;</code> かを検出します。</li>
    <li>トピック、対象者、タイトル、スライド数、密度、モーション、視覚的な方向性、アセット、およびスラグを収集します。</li>
    <li>デフォルトで <code>type="slides"</code> および <code>page="slide-16-9"</code> のスライド Press を作成します。</li>
    <li><code>DeckSlide</code>、<code>layouts/</code>、および <code>ui/</code> を生成します。</li>
    <li>デッキのエントリからデッキごとの CSS をインポートし、<code>npm run build</code> を実行します。</li>
  </ol>

  <h2>デフォルトの形状</h2>

  ### Example: Slide Press

```tsx
<Press slug="slide" title="Deck Title" type="slides" page="slide-16-9">
  <TitleSlide id="cover" title="Deck Title">
    <TitleSlide.Title objectId="title">Deck Title</TitleSlide.Title>
    <TitleSlide.Description objectId="description">
      One-line audience promise.
    </TitleSlide.Description>
  </TitleSlide>

  <TitledContentSlide id="problem-context" title="Problem Context">
    <TitledContentSlide.Eyebrow objectId="eyebrow">Context</TitledContentSlide.Eyebrow>
    <TitledContentSlide.Title objectId="title">Problem Context</TitledContentSlide.Title>
    <TitledContentSlide.Content>
      <Text as="p" objectId="summary">Write visible slide content directly in JSX.</Text>
    </TitledContentSlide.Content>
  </TitledContentSlide>
</Press>
```

  ### Example: DeckSlide

```tsx
export function DeckSlide({ id, variant, title, children }) {
  return (
    <Slide
      id={id}
      title={title}
      className={`op-slide op-slide--${variant}`}
    >
      <div className="op-slide__surface">
        <main className="op-slide__content">{children}</main>
        <footer className="op-slide__footer">
          <PageFolio variant="slash" currentFormat="2-digit" totalFormat="2-digit" />
        </footer>
      </div>
    </Slide>
  );
}
```

  <h2>レイアウトと UI の境界</h2>

  <ul>
    <li><code>components/</code> には <code>DeckSlide</code> のようなデッキレベルのラッパーが含まれます。</li>
    <li><code>layouts/</code> には <code>TitledContentSlide</code> や <code>ChapterOpenerSlide</code> などのフルスライドのレイアウトが含まれます。</li>
    <li><code>ui/</code> には <code>Timeline</code>、<code>KpiCard</code>、<code>ImageFrame</code> などの再利用可能なコンテンツプリミティブが含まれます。</li>
    <li>テキストベースの複合スロットは、<code>TextProps</code> を <code>Text</code> に渡し、インライン編集のソースマッピングのために可視の文字テキストに <code>objectId</code> を使用する必要があります。</li>
    <li>デフォルトの出力では、すべてのスライドを使い捨てのコンポーネントの背後に隠すのではなく、レイアウトスロット内に表示されるコンテンツをインラインで構成する必要があります。</li>
  </ul>

  <h2>ページ番号 (Page folio)</h2>

  <p>
    スライドレイアウトでは、ハードコードされたページ番号ではなく <code>PageFolio</code> を使用する必要があります。
    エクスポートパイプラインが最終的なフレーム順序を解決するため、同じコンポーネントがリーダー、PDF、および画像エクスポートで機能します。
  </p>

  ### Example: Folio formats

```tsx
<PageFolio currentFormat="2-digit" />
// 01

<PageFolio variant="slash" currentFormat="2-digit" totalFormat="2-digit" />
// 04 / 35

<PageFolio variant="prefix" prefix="p " />
// p 4
```

  <h2>境界</h2>

  <ul>
    <li>レポート、書籍、提案書、その他のページベースのアーティファクトは作成しません。 <code>openpress-create-pages</code> を使用してください。</li>
    <li>create を通じてアップグレードや移行を実行しません。 <code>openpress</code> を使用してください。</li>
    <li>デプロイは行いません。明示的なユーザー確認の後、 <code>openpress-deploy</code> を使用してください。</li>
  </ul>

  <h2>ソース</h2>

  <ul>
    <li><a href="https://github.com/quan0715/open-press/blob/main/skills/openpress-create-slide/SKILL.md" rel="noopener"><code>skills/openpress-create-slide/SKILL.md</code></a></li>
  </ul>
