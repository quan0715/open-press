---
title: "はじめに"
eyebrow: "ここからスタート"
description: "ブリーフ、ソースフォルダ、またはクリエイティブ skill から始めましょう。エージェントに OpenPress Workspace を作成させるか、CLI を直接実行します。"
---
<div class="callout">
    <strong>前提条件：</strong> <code>npm</code> と <code>npx</code> が含まれた Node.js 20+。
    Chromium と <code>wrangler</code> は、PDF/画像の書き出し、または Cloudflare へのデプロイ時にのみ必要です。
  </div>

  <h2>1. スタート方法を選択する</h2>

  <h3>Path A · AI ファースト: skill をインストールし、エージェントに依頼する</h3>

  <p>
    AI ファーストなユーザー、非技術的なユーザー、およびこだわりのあるフォーマットに最適です。最初に OpenPress
    の skill バンドルをインストールし、公開スタイルを理解しているクリエイティブまたはドメイン skill を追加します。
  </p>

  ### Example: Install skills

```bash
npx -y skills@latest add \
  quan0715/open-press

# 任意のクリエイティブ / ドメイン skill
npx -y skills@latest add \
  quan0715/openpress-social-card-skill
```

  <p>
    インストール後、新しい skill が認識されるように、エージェントセッションを再起動してください。その後、エージェントに
    Workspace の作成を依頼します。OpenPress skill は、create パッケージの実行、パッケージのインストール、skill が所有する
    starter ファイルのコピーまたは適応、そして結果の検証をガイドするはずです。
  </p>

  ### Example: Prompt the agent

```text
我想做一份固定版面文件。請使用 OpenPress skills：
1. 確認 Node / npm / npx 可用
2. 用 npm create @open-press 建立 workspace
3. 安裝需要的 @open-press packages
4. 套用合適的 skill starter 或範例
5. 跑 npm run build 驗證
```

  <h3>Path B · CLI ファースト: コマンドを自分で実行する</h3>

  <p>
    ターゲットフォルダ、タイトル、そしてワークフローをすでに把握している開発者に最適です。
    <code>npm create</code> コマンドは create パッケージをダウンロードし、Workspace を作成して
    デフォルトで <code>npm install</code> を実行します。
  </p>

  ### Example: Create workspace

```bash
npm create @open-press@latest my-paper -- \
  --type slides \
  --title "Transport models in dense networks"

cd my-paper
```

  ### Example: If package install was skipped

```bash
npm install

# skill の同期に失敗した場合
npm run openpress:skills
```

  <p>
    starter コンテンツは、バンドルされたパッケージからではなく、skill から提供されます。OpenPress はドキュメント
    Workspace を初期化し、skill は intake、examples、starter ファイル、そして taste を管理します。
    所有権の分割については、<a href="/docs/skills">Skills</a> を参照してください。
  </p>

  <h2>2. コンテンツを編集する</h2>

  <p>
    あなたが記述するすべては <code>press/</code> の下に配置されます。ランタイムの内部動作は、インストール後
    <code>node_modules/@open-press/</code> に配置されます。これらのパッケージは読み取り専用として扱ってください。
  </p>

  <h3>Slides Workspace</h3>

  <p>
    slides Press は、<strong>スライドごとに 1 つのフォルダ</strong> (folder-per-slide) というレイアウトを使用します。各スライドは <code>slides/</code> 下の独自のディレクトリに配置されます。<code>press.tsx</code> は、スライドを JSX の子要素としてリストアップする順序付きインデックスです。
    完全なコントラクトについては <a href="/docs/concepts/slides">Slides architecture</a> を参照してください。
  </p>

  ### Example: Slides file tree

```text
press/<slug>/
  press.tsx          # 順序付きインデックス — スライドを JSX の順序でリストアップ
  slides/
    intro/
      slide.tsx      # 1 つのスライド: メタデータ + デフォルトエクスポートコンポーネント
    pricing/
      slide.tsx
  themes/
    default.css
```

  ### Example: slides/intro/slide.tsx

```tsx
import type { SlideMeta } from "@open-press/core";

export const meta = {
  layout: "default",
  description: "Opening slide",
} satisfies SlideMeta;

export default function Slide() {
  return <div>Write slide content in JSX.</div>;
}
```

  ### Example: press/<slug>/press.tsx (ordered index)

```tsx
import { Press, Slide } from "@open-press/core";

export default function DeckPress() {
  return (
    <Press slug="deck" title="My deck" type="slides" page="slide-16-9">
      <Slide id="intro" />
      <Slide id="pricing" />
    </Press>
  );
}
```

  <h3>すべての Press タイプに共通</h3>

  <ul>
    <li><code>press/&lt;slug&gt;/themes/</code> — この Press にスコープされた CSS トークンとテーマのオーバーライド。</li>
    <li><code>press/&lt;slug&gt;/components/</code> — Press ローカルな React コンポーネント。</li>
    <li><code>press/&lt;slug&gt;/media/</code> と <code>press/shared/media/</code> — 画像やベクターアセット。エクスポート時にパブリックバンドルに同期されます。</li>
    <li><code>package.json</code> — <code>"openpress.deploy"</code> フィールドは、ビルド時のデプロイアダプター設定が配置される場所です。<a href="/docs/concepts/workspace-config">Workspace config</a> を参照してください。</li>
  </ul>

  <h2>3. ライブプレビュー</h2>

### Example: Start the workbench

```bash
npm run dev
# → http://127.0.0.1:5173/workspace
```

  <p>
    ワークベンチは、保存時に CSS、トークン、および React クロムを再読み込みします。MDX コンテンツの更新は、
    エンジンのソースウォッチャーを通じて反映されます。<code>/workspace</code> ルートはプロジェクトギャラリーを開き、
    各ドキュメントは <code>/&lt;press-slug&gt;/preview</code> でワークベンチシェル (インスペクター、ソース編集エンドポイント、コメントマーカー) とともに開かれます。
  </p>

  <h2>4. ビルドと検証</h2>

  ### Example: Production build

```bash
npm run build         # 検証 + dist-react/ のレンダリング
npm run preview       # dist-react/ を静的サイトとして提供
npm run openpress:pdf # 任意: ローカルで PDF を生成
```

  <p>
    <code>build</code> は、構造の検証、MDX → React エクスポート、および Vite プロダクションビルドを連鎖的に実行します。
    検証が失敗した場合、Vite が実行される前にビルドが中断されるため、ビルドが成功したということはドキュメントの形状が整合していることを意味します。各ステップの機能については <a href="/docs/concepts/cli-lifecycle">CLI · Lifecycle</a> を参照してください。
  </p>

  <h2>5. デプロイ</h2>

  <p>
    OpenPress はデプロイに明示的な確認を必要とします — サイレントなパブリッシュはありません。Workspace の
    <code>package.json</code> の <code>"openpress.deploy"</code> フィールドでアダプターを設定し、その後：
  </p>

  ### Example: Deploy to Cloudflare Pages

```bash
npm run openpress:deploy:dry-run        # ステップのプレビュー
npm run openpress:deploy -- --confirm   # パブリッシュ
```

  <p>
    デプロイコマンドはビルドを行い、PDF ステージのアーティファクトを生成し、<code>deploy.json</code> メタデータを書き込み、設定されたアダプターに引き継ぎます。ホスト固有のアダプターが実装されていない場合は、生成されたビルド出力を直接使用し、OpenPress 外でパブリッシュステップを維持してください。
  </p>

  <h2>次に読むべき内容</h2>

  <ul>
    <li><a href="/docs/concepts/slides">Slides architecture</a> — folder-per-slide レイアウト、<code>SlideMeta</code>、スライドの順序付け、および <code>objectId</code> のインジェクションについて。</li>
    <li><a href="/docs/concepts/working-with-agents">Work with Agent</a> — エージェントがどのように初期化し、編集し、検証し、境界で停止すべきかについて。</li>
    <li><a href="/docs/concepts/themes">Themes</a> — <code>press/&lt;slug&gt;/themes/</code> のコントラクト。</li>
    <li><a href="/docs/reference/components-press">Components → Press</a> — Press Tree プリミティブ。</li>
    <li><a href="/docs/guides/comment-markers">Comment markers</a> — インラインレビューのワークフロー。</li>
    <li><a href="/docs/cli">CLI</a> — 完全なコマンドリファレンス (3 つの層)。</li>
  </ul>
