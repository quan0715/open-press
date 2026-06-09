---
title: "Workspace"
eyebrow: "@open-press/core"
description: "OpenPressが検出されたPressフォルダーを1つのWorkspaceマニフェストにグループ化するために使用する内部コンポーネント。"
---
<div class="callout">
    <strong>1.0 contract.</strong> ユーザープロジェクトは、各<code>press/&lt;slug&gt;/press.tsx</code>から1つの<code>&lt;Press&gt;</code>をエクスポートします。エンジンはこれらのエントリを検出し、内部でWorkspaceを構築します。
    <br />
    <strong>Live preview:</strong> <a href="/preview/workspace/">Workspaceギャラリーの表示を確認する</a>（3つのPressの静的モック）。
  </div>

  <ApiEntry
    name="<Workspace>"
    kind="component"
    importFrom={'import { Workspace } from "@open-press/core";'}
    signature={`<Workspace name? children />`}
    summary="検出エントリによって使用されるエンジン所有のグループ化コンポーネント。Workspaceルートを手書きする代わりに、Pressフォルダーを作成してください。"
  >
    <PropsTable
      title="Props"
      rows={[
        { name: "name", type: "string", description: "オプションのWorkspaceラベル。プロジェクト名としてギャラリーとPDFメタデータに表示されます。" },
        { name: "children", type: "Press[]", required: true, description: "1つ以上の<code>&lt;Press&gt;</code>の子要素。それぞれが固有の<code>slug</code>プロップを持っている必要があります。" },
      ]}
    />
  </ApiEntry>

  <h2>プロジェクトのレイアウト</h2>

  ### Example: Single-doc project

```text
my-paper/
├── package.json                ← deploy adapter goes here (optional)
└── press/
    ├── shared/theme/           ← shared baseline theme
    └── report/
        ├── press.tsx           ← default-exports <Press slug="report" ...>
        ├── chapters/           ← MDX content
        ├── theme/              ← report-specific rules
        ├── components/         ← report-local React components
        └── media/              ← report images, vectors
```

  ### Example: Multi-doc project

```text
my-launch/
├── package.json                ← deploy adapter goes here
└── press/
    ├── shared/                 ← optional shared facts, theme, media
    ├── proposal/
    │   ├── press.tsx           ← default-exports <Press slug="proposal" ...>
    │   ├── chapters/           ← MDX
    │   └── theme/              ← optional per-doc override
    ├── pitch-deck/
    │   ├── press.tsx           ← default-exports <Press slug="pitch-deck" ...>
    │   └── layouts/
    └── social/
        ├── press.tsx           ← default-exports <Press slug="social" ...>
        └── components/
```

  ### Example: Per-doc — press/proposal/press.tsx

```tsx
import { Press, Frame, mdxSource } from "@open-press/core";
import { Sections, Toc } from "@open-press/core/manuscript";

export default function ProposalPress() {
  return (
    <Press
      slug="proposal"
      title="Series A 提案書"
      page="a4"
      componentsDir="./components"
      mediaDir="./media"
      sources={[
        mdxSource({ id: "story", preset: "section-folders", root: "proposal/chapters" }),
      ]}
    >
      <Frame frameKey="cover" role="document.cover"><Cover /></Frame>
      <Toc source="story" />
      <Sections source="story" />
    </Press>
  );
}
```

  <h2>Workspaceモードで可能になること</h2>

  <PropsTable
    title="リーダー / ビルド"
    rows={[
      { name: "ドキュメントごとのルート", type: "behavior", description: "リーダーのURLはslugごとに1つのパスを持ちます — <code>/proposal</code>、<code>/pitch-deck</code>、<code>/social</code>。ルート<code>/</code>には、各ドキュメントのカードを含むWorkspaceインデックスが表示されます。" },
      { name: "タブバー", type: "behavior", description: "ワークベンチにはドキュメント全体にタブバーが表示されます（左側にWorkspace名、右側にドキュメントタブ）。" },
      { name: "共有テーマトークン", type: "behavior", description: "ドキュメントが独自の<code>theme</code>プロップを設定しない限り、Workspaceレベルの<code>theme/tokens.css</code>がすべてのドキュメントに適用されます。" },
      { name: "ドキュメントごとのビルドアーティファクト", type: "behavior", description: "ドキュメントごとに<code>public/openpress/&lt;slug&gt;/document.json</code>が生成され、さらにトップレベルの<code>public/openpress/workspace.json</code>マニフェストが生成されます。" },
    ]}
  />

  <PropsTable
    title="CLIの動作の変更"
    rows={[
      { name: "npm run build", type: "behavior", description: "Workspace内のすべてのドキュメントをビルドします。いずれかのドキュメントに構造上の問題がある場合、検証によりビルド全体が中止されます。" },
      { name: "npm run openpress:pdf", type: "behavior", description: "ドキュメントごとに1つのPDFを<code>dist-react/&lt;slug&gt;.pdf</code>に生成します。1つのPDFをビルドするには、<code>--doc=&lt;slug&gt;</code>を渡します。" },
      { name: "npm run openpress:deploy", type: "behavior", description: "Workspace全体を1つのサイトとしてデプロイします。デプロイアダプターは、複数ドキュメントのルートがそのままの状態で<code>dist-react/</code>を受け取ります。" },
      { name: "Tier 3ツール（検索、置換、検査）", type: "behavior", description: "すべてにおいて、1つのドキュメントにスコープを絞るために<code>--doc=&lt;slug&gt;</code>を受け入れます。デフォルトはWorkspace全体です。" },
    ]}
  />

  <h2>1つのWorkspaceに統合すべきではない場合</h2>

  <p>
    <code>&lt;Workspace&gt;</code>自体は常に存在します — 問題は、複数のドキュメントを1つのWorkspaceにまとめるか、別々のWorkspace（別々の<code>package.json</code>プロジェクト）を使用するかです。次の場合には分けておきます。
  </p>

  <ul>
    <li>
      <strong>別々のブランドまたは無関係なコンテンツ</strong> — 同じgitリポジトリに存在すること以外に共通点のない2つのドキュメント。モノレポ内で別々のWorkspaceを与えます。
    </li>
    <li>
      <strong>同じコンテンツのバージョン管理されたドキュメント</strong> — 1つのWorkspaceの複数のPressの子要素ではなく、gitのブランチ/タグを使用します。Workspaceは一貫したプロダクトであり、アーカイブではありません。
    </li>
    <li>
      <strong>異なるデプロイターゲット</strong> — 2つのドキュメントが異なるデプロイアダプターや異なるCloudflareプロジェクトに向けられる場合、それらは別々のWorkspaceを必要とします（デプロイ設定はWorkspaceレベルです）。
    </li>
  </ul>

  <h2>ドキュメント間でのデータの共有</h2>

  <p>
    Workspaceは特別なデータAPIを導入しません。推奨されるパターンは単純なESモジュールインポートです — <code>press/shared/data.ts</code>が事実/数値/日付をエクスポートし、各<code>press/&lt;slug&gt;/press.tsx</code>が必要なものをインポートします。数値を一度更新すると、それをインポートするすべてのドキュメントに伝播します。
  </p>

  ### Example: Shared data via import

```ts
// press/shared/data.ts
export const RAISE = {
  amount: "$8M",
  round: "Series A",
  closeDate: "2026-09-30",
};

// press/proposal/chapters/01-overview.mdx
import { RAISE } from "../../../data";

We are raising {RAISE.amount} in our {RAISE.round}, closing {RAISE.closeDate}.

// press/pitch-deck/slides/03-ask.mdx
import { RAISE } from "../../../data";

Ask: {RAISE.amount} ({RAISE.round}).
```

  <h2>関連情報</h2>

  <ul>
    <li><a href="/docs/reference/components-press">Press</a> — 各子ドキュメント。</li>
    <li><a href="/docs/concepts/workspace-config">Workspace config</a> — <code>package.json</code>の操作設定。</li>
    <li><a href="/docs/concepts/themes">Themes</a> — Workspaceレベルとドキュメントごとのテーマディレクトリの違い。</li>
  </ul>
