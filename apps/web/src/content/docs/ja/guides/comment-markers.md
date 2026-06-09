---
title: "Comment markers"
eyebrow: "@openpress-comment"
description: "インラインのレビューマーカーはソース内のMDXコメントとして存在します。ワークベンチはそれらを番号付きピンとしてレンダリングし、エージェントは apply-comments ワークフローでそれらを解決します。外部のコメントデータベースは存在しません。"
---
<p>
    OpenPress のコメントは独立したサービスではありません。各コメントはMDXコメントブロックであり、ソースファイルに直接記述されます。ワークベンチはレンダリング時にこれらを読み取り、インタラクティブなピンとして表示します。つまり、コメントはgitのドキュメントとともに移動し、ブランチを越えて存続し、MDXを編集する任意のツール（AIエージェントを含む）で解決できます。
  </p>

  <div class="callout">
    <strong>コメントDBとのトレードオフ。</strong> アカウント、通知、スレッド化された返信はありません。これは意図的な設計です。これらが必要な場合は、デプロイしたリーダーを Hypothes.is などのサービスの背後にホストするか、独自のアノテーションバックエンドを構築してください。OpenPressはインラインマーカーのみを管理します。
  </div>

  <h2>マーカーの形式</h2>

  <ApiEntry
    name="@openpress-comment"
    kind="symbol"
    importFrom={'{/* @openpress-comment id="c-2026-05-28-abc" ts="2026-05-28T12:34:00Z" text="..." */}'}
    summary="最初の属性名が @openpress-comment に一致する標準的なMDXコメントブロックです。エンジンはMDXのコンパイル時にこれを解析し、ワークベンチにピンを出力します。"
  >
    <PropsTable
      title="Attributes"
      rows={[
        { name: "id", type: "string", required: true, description: "安定した識別子。UIからコメントを作成するとワークベンチがこれを生成します。エージェントは編集時に既存のIDを再利用する必要があります。" },
        { name: "ts", type: "ISO 8601", required: true, description: "作成のタイムスタンプ。ワークベンチのツールチップに表示され、保留中コメントパネルの並べ替え順序に使用されます。" },
        { name: "text", type: "encoded string", required: true, description: "コメントの本文。MDXの解析を通過できるようにエンコードされています。改行、引用符、ユニコードはそのまま渡されます。" },
        { name: "author", type: "string", description: "オプション。自由形式のラベル（\"Q\"、\"reviewer\"、\"GPT-5\"など）。" },
      ]}
    />

    ### Example: In MDX prose

```mdx
The model assumes uniform demand across the network — see
chapter 3 for the relaxation under sparse-link conditions.

{/* @openpress-comment id="c-2026-05-28-uniform-demand" ts="2026-05-28T12:34:00Z" text="Is 'uniform' the right word here? Maybe 'isotropic'?" author="reviewer" */}
```

    <p>
      複数のマーカーを同じコンテンツの隣に配置できます。ワークベンチはそれらを同じブロックにグループ化しますが、各コメントがアドレス指定可能なままになるように、個別のピンとしてレンダリングします。ソース内の位置がパネルでの視覚的な順序を決定します。
    </p>
  </ApiEntry>

  <h2>コメントの作成</h2>

  <h3>ワークベンチからの作成（人間）</h3>

  <ol>
    <li><code>npm run dev</code> を実行し、 <code>http://127.0.0.1:5173/workspace</code> を開きます。</li>
    <li>ツールバーからインスペクタを切り替えます。</li>
    <li>ブロック（またはブロック間の挿入バー）をクリック → コメントを追加（Add comment）。</li>
    <li>コメントを入力し、 <code>Cmd/Ctrl + Enter</code> で送信します。</li>
    <li>ワークベンチはマーカーをMDXソースに書き戻し、ファイルを保存します。</li>
  </ol>

  <h3>エージェントからの作成（Claude / Codex / Cursor）</h3>

  <ol>
    <li><code>open-press search . "&lt;query&gt;" --json</code> を使用してソースファイルを検索し、ターゲットのブロックを見つけます。</li>
    <li>ターゲットの文章の直後にマーカー行を挿入します。新しい <code>id</code> （UUID風 — 慣例は <code>c-YYYY-MM-DD-&lt;slug&gt;</code>）と現在のISOタイムスタンプを使用します。</li>
    <li><code>open-press replace . "&lt;old&gt;" "&lt;new&gt;" --apply</code> を使用するか、エディタのMDX編集ツールで直接ファイルを書き込みます。</li>
  </ol>

  <h2>コメントの解決</h2>

  <p>
    コメントはドキュメントのインラインTODOです。ワークフローは<strong>読む → 決定する → ソースを編集する → マーカーを削除する</strong>です。マーカーを削除することは「これは対応済みである」という肯定的なアクションです。変更を適用せず（またはスキップするという決定を記録せず）にマーカーを削除してはいけません。
  </p>

  ### Example: Find all pending markers

```bash
rg "@openpress-comment" press/ -n
```

  <p>
    エージェントにはこれ専用のワークフローがあります — <a href="/docs/reference/cli-tools">CLI Tools</a>ページとバンドルされている <code>openpress-apply-comments</code> スキルを参照してください。スキルの規約は以下の通りです：
  </p>

  <ol>
    <li>すべての保留中のマーカーをリストアップします。</li>
    <li>それぞれについて、周囲の文章を読み、ソースの編集を決定し、適用します。</li>
    <li>編集が完了した後にのみマーカーを削除します。</li>
    <li>何も壊れていないことを確認するために <code>npm run build</code> を実行します。</li>
    <li>どのマーカーが解決されたか、および人間の判断が必要なために残されたマーカーがあればそれを報告します。</li>
  </ol>

  <h2>アンチパターン</h2>

  <ul>
    <li>
      <strong>ドキュメント間でIDを再利用しない。</strong> <code>id</code> はワークベンチのピンのアドレス指定キーです。重複するとナビゲーションが壊れます。章をフォークしてマーカーを保持する必要がある場合は、IDを再生成してください。
    </li>
    <li>
      <strong>アクションなしでマーカーをクリアしない。</strong> マーカーはコミットメントです。変更を適用するか、マーカーをフォローアップのTODOコメントに置き換えて、保留している理由を説明してください。
    </li>
    <li>
      <strong>エンコードされた <code>text</code> を手書きしない。</strong> ワークベンチを使用するか、エージェントに生成させてください。引用符や改行の手動エスケープはエラーになりやすいです。
    </li>
  </ul>
