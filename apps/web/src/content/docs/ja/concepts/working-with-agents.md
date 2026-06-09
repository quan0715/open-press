---
title: "Agent との連携"
eyebrow: "Agent ワークフロー"
description: "AI Agent に OpenPress を正しく使用させる方法: スキルまたはソース素材から開始し、編集可能な Workspace を作成し、出力を検証し、製品の境界を越える前に停止します。"
---
<h2>作業契約</h2>

  <p>
    OpenPress は、新しくオープンソース化された Agent ファーストのドキュメントパッケージです。これは Agent に対して、MDX ドキュメント、ページおよびスライドコンポーネント、ソース管理、プレビュー、検証、レンダリング、エクスポートコマンドのための共有の基本契約を提供します。スキルは、インテイク（取り込み）、テイスト（スタイル）、ストーリープラン、ビジュアルレシピ、スターターの例に焦点を当てることができます。
  </p>

  <p>
    実際には、Agent に <code>press/</code> 内のファイルを処理させ、OpenPress コマンドを実行し、フレームワークが必要なプリミティブを提供していない場合はギャップを報告するように依頼します。Agent に生成された出力へのパッチ適用や、並行する HTML-to-doc、doc-to-PPT、スクリーンショットのパイプラインの発明を依頼しないでください。
  </p>

  <h2>プロジェクトの開始</h2>

  <p>
    非技術的または AI ファーストの使用の場合は、まずスキルをインストールし、Agent にスキルの指示から Workspace を初期化させます。
  </p>

  ### 例: まずスキルをインストールする

```bash
npx -y skills@latest add quan0715/open-press
npx -y skills@latest add quan0715/openpress-social-card-skill
```

  <p>
    Agent セッションを再起動した後、必要な出力を依頼します。良いリクエストでは、フォーマット、対象読者、言語、およびソース素材を指定します。
  </p>

  ### 例: Agent へのプロンプト

```text
OpenPress スキルを使用して、エディトリアルなソーシャルカードセットを作成してください。
インテイクの質問をし、Workspace を初期化し、スキルスターターを適用して、
その後 npm run build を実行し、画像をエクスポートしてください。
```

  <p>
    CLI ファーストの使用の場合は、create を直接実行します。create パッケージは Workspace をブートストラップし、OpenPress パッケージをインストールします。スキルは依然として、オピニオン付きのスターターコンテンツを所有しています。
  </p>

  ### 例: CLI ファーストの開始

```bash
npm create @open-press@latest my-paper -- --type slides --title "Transport models"
cd my-paper
npm run dev
```

  <h2>Agent が編集すべきもの</h2>

  <table>
    <thead>
      <tr>
        <th>レイヤー</th>
        <th>パス</th>
        <th>ルール</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Workspace ソース</td>
        <td>
          <code>press/*/press.tsx</code>, <code>press/**/chapters/</code>,
          <code>press/**/theme/</code>, <code>press/**/components/</code>,
          <code>press/**/media/</code>, <code>press/shared/</code>, <code>package.json</code>
        </td>
        <td>ここを編集します。これが信頼できる情報源（source of truth）です。</td>
      </tr>
      <tr>
        <td>スキル素材</td>
        <td><code>.agents/skills/</code>, <code>.claude/skills/</code>, インストールされた外部スキルフォルダ</td>
        <td>指示を読み、スターターの例を <code>press/</code> にコピーまたは適用します。</td>
      </tr>
      <tr>
        <td>フレームワークパッケージ</td>
        <td><code>node_modules/@open-press/core/</code>, <code>node_modules/@open-press/cli/</code></td>
        <td>ドキュメント作業中は読み取り専用です。アップストリームで修正し、その後アップグレードします。</td>
      </tr>
      <tr>
        <td>生成された出力</td>
        <td><code>public/openpress/</code>, <code>dist-react/</code>, <code>.deploy/</code>, <code>.openpress/</code></td>
        <td>手動で編集しないでください。ソースを変更して再レンダリングします。</td>
      </tr>
    </tbody>
  </table>

  <h2>タスクのルーティング</h2>

  <table>
    <thead>
      <tr>
        <th>依頼内容...</th>
        <th>Agent が使用すべきもの...</th>
        <th>期待される動作</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>新しい OpenPress Workspace</td>
        <td><code>openpress-create-pages</code> または <code>openpress-create-slide</code></td>
        <td>Node を確認し、必要に応じて create を実行し、最初のアーティファクト固有の <code>&lt;Press&gt;</code> を作成し、ビルドを検証します。</td>
      </tr>
      <tr>
        <td>特定のクリエイティブフォーマット</td>
        <td>外部のクリエイティブスキル</td>
        <td>インテイク、レイアウトの選択、スターターの例、テイストの判断にそのスキルを使用します。</td>
      </tr>
      <tr>
        <td>テーマやブランドの変更</td>
        <td>そのアーティファクトタイプ用のアクティブな作成スキル</td>
        <td>フォルダローカルのテーマファイル、共有テーマファイル、ローカルコンポーネントを編集し、プレビューしてビルドします。</td>
      </tr>
      <tr>
        <td>レビューコメント</td>
        <td><code>/apply-comments</code></td>
        <td><code>@openpress-comment</code> マーカーを読み取り、最小限のソース編集を適用し、解決されたマーカーを削除します。</td>
      </tr>
      <tr>
        <td>PDF、画像、またはデプロイ出力</td>
        <td>OpenPress npm スクリプトと <code>openpress-deploy</code></td>
        <td>ドキュメント化されたコマンドを実行します。ターゲットを指定した明示的な確認の後にのみデプロイします。</td>
      </tr>
      <tr>
        <td>不足しているフレームワークの動作</td>
        <td>フレームワークの issue またはアップストリームのコード変更</td>
        <td>基盤のギャップを報告します。生成された HTML やスクリーンショットにパッチを当ててごまかさないでください。</td>
      </tr>
    </tbody>
  </table>

  <h2>検証ループ</h2>

  <p>
    役立つ Agent は、ファイルを編集した後に停止しません。タスクに一致する最小限の検証を実行し、何がパスしたかを報告する必要があります。
  </p>

  <ul>
    <li><code>npm run dev</code> — 視覚的なイテレーションのためのローカル Workspace。</li>
    <li><code>npm run build</code> — 本番バンドルを検証してレンダリングします。</li>
    <li><code>npm run typecheck</code> — Workspace コード内の TypeScript のミスを捕捉します。</li>
    <li><code>npm run openpress:image</code> — 成果物が視覚的なものである場合、ページ画像をエクスポートします。</li>
    <li><code>npm run openpress:pdf</code> — 成果物が印刷物のようなものである場合、PDF を生成します。</li>
    <li><code>npm run openpress:deploy:dry-run</code> — 公開前にデプロイ手順を確認します。</li>
  </ul>

  <h2>ハードストップ（厳守事項）</h2>

  <ul>
    <li>生成された出力を手動で編集しないこと。</li>
    <li>ユーザー Workspace 内の <code>node_modules/@open-press/</code> を変更しないこと。</li>
    <li>事実、引用、数値、または公約を捏造しないこと。</li>
    <li>ターゲットプロジェクトを指定した明示的な確認なしにデプロイしないこと。</li>
    <li>OpenPress CLI にテンプレートやパックの取得を依頼しないこと。スターターはスキルに属します。</li>
  </ul>

  <div class="callout">
    <strong>次へ:</strong> スキルの所有権マップについては <a href="/docs/skills">スキル</a> を、正確なインストールコマンドについては <a href="/docs/getting-started">クイックスタート</a> をお読みください。
  </div>
