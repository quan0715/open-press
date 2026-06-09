---
title: "パブリック API"
eyebrow: "Contract"
description: "1.0 向けに安定している、正確なモジュールエクスポート、設定スキーマ、CSS 変数コントラクト、コメントマーカーフォーマット、および開発エンドポイント。このリスト以外のものはすべて内部用です。"
---
<h2>安定性の約束</h2>

  <p>
    OpenPress 1.0 がリリースされると、このページにある機能は semver によってカバーされます。つまり、リストされているエクスポート、設定フィールド、CSS 変数、マーカーフォーマット、または開発エンドポイントに対する破壊的変更は、メジャーバージョンの更新が必要になります。このリストに含まれない内部シンボルやモジュール（深いインポートによってのみ到達可能なもの）は、下流のコードが壊れるという CHANGELOG の注記なしに、任意のマイナーリリースで変更される可能性があります。
  </p>

  <p>
    依存しているものがこのドキュメントになく、追加してほしい場合は、Issue を作成してください。パブリック API への昇格のほとんどは簡単です — 主に名前を付けたいだけです。
  </p>

  <h2><code>@open-press/core</code></h2>

  <p>React ランタイムと Press ツリープリミティブのトップレベルのバレル（barrel）。</p>

  <table>
    <thead>
      <tr><th>エクスポート</th><th>種類</th><th>目的</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>Press</code></td>
        <td>component</td>
        <td>ドキュメント合成の境界。各 <code>press/&lt;slug&gt;/press.tsx</code> から正確に1つエクスポートします。すべてのページフレームとドキュメントヘルパーをその下に配置します。</td>
      </tr>
      <tr>
        <td><code>PressContext</code></td>
        <td>React context</td>
        <td>カスタムヘルパーコンポーネント用の低レベルのコンテキスト。通常の Workspace やエージェントは、代わりに <code>Press</code>、<code>Frame</code>、<code>MdxArea</code>、およびマニュスクリプトヘルパーを使用する必要があります。</td>
      </tr>
      <tr>
        <td><code>PRESS_MARKER</code></td>
        <td>symbol</td>
        <td>ラッパーツール用の低レベルの識別子。ドキュメントの作成時には必要ありません。</td>
      </tr>
      <tr>
        <td><code>Frame</code></td>
        <td>component</td>
        <td>固定ページの表面またはネストされた領域の境界。必須の prop: <code>frameKey</code>。オプション: <code>role</code>、<code>chrome</code>、<code>className</code>。その他のすべての prop は基盤となる <code>&lt;section&gt;</code> にパススルーされます。ページサイズは <code>&lt;Press page&gt;</code> でドキュメントレベルで設定されます。</td>
      </tr>
      <tr>
        <td><code>FRAME_MARKER</code></td>
        <td>symbol</td>
        <td>レンダラーが <code>Frame</code> インスタンスを検出するために使用する識別子。安定しています。</td>
      </tr>
      <tr>
        <td><code>FrameContext</code></td>
        <td>React context</td>
        <td>アクティブなフレームの <code>frameKey</code> と、<code>MdxArea</code> が呼び出す <code>consumeArea(chainId)</code> フックを公開します。カスタムフレームヘルパーがこれを基にして構築できるように公開されています。</td>
      </tr>
      <tr>
        <td><code>MdxArea</code></td>
        <td>component</td>
        <td>フレーム内の測定可能なコンテンツスロット。必須の prop: <code>chainId</code>。オプション: <code>overflow</code> (<code>"extend"</code> | <code>"truncate"</code>)、<code>className</code>。</td>
      </tr>
      <tr>
        <td><code>Text</code></td>
        <td>component</td>
        <td>スタイルを持たない編集可能なテキストオブジェクト。必須の prop: <code>objectId</code>、<code>label</code>。リテラルの子は React SSR エクスポート中に TSX のソース範囲に自動マップされます。式の子をインライン編集可能にするには、明示的な <code>source</code> が必要です。</td>
      </tr>
      <tr>
        <td><code>ObjectEntity</code></td>
        <td>component</td>
        <td>コメント / 編集 / インスペクターのメタデータ用の低レベルのレンダリング済みオブジェクト境界。ほとんどの作成者は、<code>Text</code>、<code>Frame</code>、<code>MdxArea</code>、メディアヘルパー、またはこれを意図的にラップするカスタムコンポーネントを使用する必要があります。</td>
      </tr>
      <tr>
        <td><code>useSource</code></td>
        <td>hook</td>
        <td>指定された <code>sourceId</code> の解決済みソース登録を返します。マニュスクリプトヘルパーとカスタムフレームコンポーネントによって使用されます。</td>
      </tr>
      <tr>
        <td><code>BaseFigure</code>, <code>BaseCallout</code></td>
        <td>component</td>
        <td>最小限の図 / コールアウトのプリミティブ。Workspace のテーマとスターターのスキルは、これらに基づいてブランド化されたバリアントを構築します。</td>
      </tr>
      <tr>
        <td><code>MediaFigure</code>, <code>ImageFigure</code></td>
        <td>component</td>
        <td><code>src</code> / <code>alt</code> / <code>caption</code> を受け入れる図。<code>media/...</code> の相対パスを <code>/openpress/media/...</code> に自動的に解決します。<code>ImageFigure</code> は <code>MediaFigure</code> のエイリアスです。</td>
      </tr>
    </tbody>
  </table>

  <h3>型 (Types)</h3>

  <p>
    同じバレルから再エクスポートされます。型はパブリックコントラクトの一部です — フィールド名が変更された場合、それは破壊的変更となります。
  </p>

  <ul>
    <li><code>FrameProps</code>, <code>MdxAreaProps</code>, <code>MdxAreaOverflow</code></li>
    <li><code>PressProps</code>, <code>WorkspaceProps</code>, <code>PageGeometry</code>, <code>PressSource</code></li>
    <li><code>ObjectEntityProps</code>, <code>ObjectEntityElement</code>, <code>TextProps</code></li>
    <li><code>BaseFigureProps</code>, <code>BaseCalloutProps</code>, <code>BaseCalloutKind</code></li>
    <li><code>MediaFigureProps</code></li>
  </ul>

  <h2><code>@open-press/core/mdx</code></h2>

  <table>
    <thead>
      <tr><th>エクスポート</th><th>種類</th><th>目的</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>mdxSource(options)</code></td>
        <td>function</td>
        <td>MDX ソースツリーを登録します。<code>options.preset</code> は検出プリセット（標準的なチャプターレイアウトの場合は <code>"section-folders"</code>）を選択します。<code>options.root</code> は <code>press/</code> からの相対フォルダーです。</td>
      </tr>
    </tbody>
  </table>

  <h2><code>@open-press/core/manuscript</code></h2>

  <p>長編のセクションフローのドキュメント用ヘルパー。オプションです — スライド / ソーシャルのスターターの場合はこのモジュールをスキップして問題ありません。</p>

  <table>
    <thead>
      <tr><th>エクスポート</th><th>種類</th><th>目的</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>Sections</code></td>
        <td>component</td>
        <td>登録されたソースを反復処理し、セクションごとに1つまたは複数のフレームをエミットします。必須: <code>source</code>。オプション: <code>page</code>（カスタムのページごとのコンポーネント） — デフォルトは <code>DefaultSectionPage</code>。オプション: <code>opener</code>。</td>
      </tr>
      <tr>
        <td><code>Chapters</code></td>
        <td>alias</td>
        <td><code>Sections</code> と同一。ソースの語彙で「chapter」を使用する場合の可読性のために提供されます。</td>
      </tr>
      <tr>
        <td><code>DefaultSectionPage</code></td>
        <td>component</td>
        <td><code>page</code> prop が提供されていない場合に <code>Sections</code> が使用するデフォルトのページコンポーネント。</td>
      </tr>
      <tr>
        <td><code>Toc</code>, <code>TocArea</code></td>
        <td>component</td>
        <td>TOC フレーム + TOC コンテンツスロット。<code>TocArea</code> は、生成された <code>toc:&lt;sourceId&gt;</code> チェーンを測定してページネーションします。</td>
      </tr>
    </tbody>
  </table>

  <h3>型 (Types)</h3>

  <ul>
    <li><code>SectionsProps</code>, <code>SectionsPageProps</code>, <code>SectionsOpenerProps</code></li>
    <li><code>ChaptersProps</code></li>
    <li><code>TocProps</code>, <code>TocAreaProps</code>, <code>TocPageProps</code></li>
  </ul>

  <h2><code>@open-press/core/numbering</code></h2>

  <p>キャプション / 図 / 表の番号付けフォーマッター。レンダラーによって使用されるビルド時のヘルパー。カスタムテーマでラベルを安定してフォーマットできるように公開されています。</p>

  <ul>
    <li><code>formatCaptionLabel(kind, index, options?)</code> — ローカライズされたラベル文字列（<code>Figure 1</code> / <code>図 1</code> など）を生成します。</li>
    <li><code>defaultCaptionLocale</code> — デフォルトのロケール設定。<code>&lt;Press captionNumbering&gt;</code> の参照値。</li>
  </ul>

  <h2><code>@open-press/create</code> と <code>@open-press/cli</code></h2>

  <p>
    <code>@open-press/create</code> は、新しいフォルダー規則の Workspace をブートストラップします。この v1 の create サーフェスでは、<code>--type slides</code> がサポートされており、ページベースのスキャフォールディングは延期されます。
    <code>@open-press/cli</code> は、既存の Workspace 内に別のスライド Press を追加するための <code>open-press create</code> を提供します。
  </p>

  <pre><code>npm create @open-press &lt;target&gt; -- --type slides --title "…"
open-press create appendix --type slides</code></pre>

  <p>
    独自の見解を持ったスターターはスキルにあります。
    <code>npx skills add &lt;owner/repo&gt;</code> でスキルをインストールし、エージェントにそのスキルを読み取らせて、スターター / サンプルファイルを <code>press/</code> にコピーまたは適合させます。
  </p>

  <p>
    スキャフォールディングされた Workspace 内に入ると、エンジンバイナリが npm スクリプト（<code>dev</code> / <code>build</code> / <code>preview</code> / <code>typecheck</code>）および <code>openpress:</code> プレフィックスのターゲット（<code>pdf</code>, <code>image</code>, <code>deploy</code>）を介して引き継ぎます。
    <a href="/docs/ja/cli">CLI の概要</a> を参照してください。
  </p>

  <h2>Workspace 設定 (<code>package.json "openpress"</code>)</h2>

  <p>
    運用設定は Workspace の <code>package.json</code> の <code>"openpress"</code> フィールドにあります。これは、React のレンダリング前にエンジンが同期して読み取る唯一の場所です。その他のすべて（title / page / sources / theme）は <code>press/*/press.tsx</code> の <code>&lt;Press&gt;</code> prop にあります。完全なスキーマは
    <a href="/docs/ja/concepts/workspace-config">Workspace 設定</a> にあります。
  </p>

  <pre><code>{`{
  "openpress": {
    "pdf":    { "filename": "..." },
    "deploy": { "adapter": "cloudflare-pages", "projectName": "...", "source": ".deploy" }
  }
}`}</code></pre>

  <h2>Press ツリーのエントリ (<code>press/*/press.tsx</code>)</h2>

  <p>
    1つの <code>&lt;Press&gt;</code> を返す関数コンポーネントをデフォルトエクスポートします。エンジンはすべてのフォルダーエントリを検出し、内部の Workspace を構築します。エクスポート時に JSX ツリーの <code>&lt;Press&gt;</code> prop からメタデータ（title, page, sources, slug, captionNumbering, theme, componentsDir, mediaDir）を読み取ります。名前付きエクスポートはありません — エントリは JSX のみです。完全なスキーマは <a href="/docs/ja/reference/components-press">Press</a> にあります。
  </p>

  <h2>CSS 変数</h2>

  <p>
    Workspace のテーマとスターターのスキルは、これらを読み取ってオーバーライドします。名前の変更は破壊的変更となります。
  </p>

  <table>
    <thead>
      <tr><th>変数</th><th>ソース</th><th>メモ</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>--openpress-page-width</code> / <code>--openpress-page-height</code></td>
        <td>エンジン (<code>&lt;Press page&gt;</code> から)</td>
        <td>CSS 長さ（length）。測定とランタイムにプッシュされるページのジオメトリ。</td>
      </tr>
      <tr>
        <td><code>--openpress-page-aspect-ratio</code> / <code>--openpress-page-height-ratio</code></td>
        <td>エンジン</td>
        <td>流動的なスケーリング（ズーム制御、ページに合わせるモード）のための派生比率。</td>
      </tr>
      <tr>
        <td><code>--openpress-page-viewport-scale</code></td>
        <td>ランタイム (ワークベンチ)</td>
        <td>現在のページズームの乗数。ページズームのコントロールによって設定されます。</td>
      </tr>
      <tr>
        <td><code>--openpress-page-padding-top</code> / <code>-x</code> / <code>-bottom</code></td>
        <td>Workspace テーマ <code>tokens.css</code></td>
        <td>Workspace ごとのページのパディング。<code>theme/base/page-contract.css</code> によって消費されます。</td>
      </tr>
      <tr>
        <td><code>--openpress-page-body-gap</code></td>
        <td>Workspace テーマ <code>tokens.css</code></td>
        <td><code>MdxArea</code> 内のブロック間の垂直方向のギャップ。</td>
      </tr>
    </tbody>
  </table>

  <p>
    Workspace のテーマやスターターのスキルは、独自の <code>tokens.css</code> で追加の色 / タイポグラフィトークンを定義する場合があります。これらの名前はローカルの規則であり、フレームワークのコントラクトではありません — フレームワークが関与するのは上記のページジオメトリ / ページパディング / ページボディギャップの名前のみです。
  </p>

  <h2>コメントマーカー (<code>@openpress-comment</code>)</h2>

  <p>
    インスペクターは、安定した解析可能なマーカーとして、インラインコメントをソース MDX/TSX ファイルに書き込みます。フォーマット:
  </p>

  <pre><code>&#123;/* @openpress-comment id=&lt;short-id&gt; ts=&lt;iso-timestamp&gt; hint=&lt;url-encoded&gt; note=&lt;url-encoded&gt; */&#125;</code></pre>

  <p>フィールドのセマンティクス:</p>

  <ul>
    <li><code>id</code> — 相互参照用の短い hex id。必須。</li>
    <li><code>ts</code> — マーカーが挿入された日時の ISO 8601 タイムスタンプ。必須。</li>
    <li><code>hint</code> — URL エンコードされたインスペクターメタデータ（配置、ターゲットオブジェクト id）。オプション。</li>
    <li><code>note</code> — URL エンコードされたノートテキスト。必須。</li>
  </ul>

  <p>
    <code>rg "@openpress-comment" press -n</code> を使用して検出します。
    <code>openpress-apply-comments</code> スキルは、適用 / クリア / 検証フローの正規の所有者です。
  </p>

  <h2>開発エンドポイント</h2>

  <p>
    開発モード（<code>npm run dev</code>）でのみ使用可能です。パッケージが所有する Vite ミドルウェアに接続されています。
    パスのプレフィックス: <code>/__openpress</code>。
  </p>

  <table>
    <thead>
      <tr><th>パス</th><th>メソッド</th><th>目的</th></tr>
    </thead>
    <tbody>
      <tr><td><code>/openpress/workspace.json</code></td><td>GET</td><td>検出されたすべての Press をリストする Workspace のマニフェスト。</td></tr>
      <tr><td><code>/openpress/&lt;slug&gt;/document.json</code></td><td>GET</td><td>Press のレンダリングされた完全なドキュメント — マウント時およびインライン編集後に <code>OpenPressApp</code> によってフェッチされます。</td></tr>
      <tr><td><code>/__openpress/status</code></td><td>GET</td><td>デプロイ状況のスナップショット。</td></tr>
      <tr><td><code>/__openpress/comment</code></td><td>POST / GET / PATCH / DELETE</td><td>コメントマーカーの送信、リスト、更新、またはクリア。インスペクターによって使用されます。</td></tr>
      <tr><td><code>/__openpress/search</code></td><td>GET</td><td>登録された MDX ソース間の全文検索。</td></tr>
      <tr><td><code>/__openpress/source-edit</code></td><td>GET / POST</td><td>生のソーステキストの読み取り、またはインラインのソース編集（テキストブロック、テーブルセル、キャプション）の適用。</td></tr>
      <tr><td><code>/__openpress/project-asset</code></td><td>POST</td><td>プロジェクトのプレビューアクション。</td></tr>
      <tr><td><code>/__openpress/deploy</code></td><td>POST</td><td>設定されたデプロイアダプターを実行します。確認が必要です。</td></tr>
      <tr><td><code>/__openpress/local-pdf-export</code></td><td>POST</td><td>ローカル PDF を生成します。</td></tr>
      <tr><td><code>/__openpress/local-pdf-file</code></td><td>GET</td><td>直近のローカル PDF を提供します。</td></tr>
    </tbody>
  </table>

  <h2>内部用 — 依存しないこと</h2>

  <p>以下のものは到達可能ですが、1.0 向けには明示的に<strong>安定していません</strong>:</p>

  <ul>
    <li>
      <code>@open-press/core/openpress/*</code> の下にある深いインポートや、パッケージの <code>exports</code> マップにリストされていないパス。バレル（<code>/app</code>, <code>/document-model</code>, <code>/reader</code>, <code>/shared</code>, <code>/workbench</code>）またはトップレベルのエントリを使用してください。
    </li>
    <li>
      <code>engine/react/pagination.mjs</code> は、領域アロケーターの周りのページネーションヘルパーをエクスポートします。領域アロケーター（<code>allocateBlocksToRegions</code>, <code>pagesFromRegions</code>）が長期的な API です。
    </li>
    <li>
      <code>document-model/objectEntityModel</code> — id エンコーディング（<code>mdx-block:...</code>, <code>mdx-area:...</code>, <code>page:...</code>）は HTML で観察可能ですが、正確なフォーマットはセル / ネストされたエンティティのために調整される可能性があります。
    </li>
    <li>
      ワークベンチの内部（<code>HtmlWorkbench</code> 内部フック、<code>InlineInspectorLayer</code> の prop、パネルレジストリの形状）。シェルはこれらを構成しますが、外部での使用は意図されていません。
    </li>
    <li>
      エンジン CLI の内部 — <code>engine/commands/*</code> に手を入れるのではなく、<code>npm run openpress:*</code> スクリプトを使用してください。
    </li>
  </ul>

  <div class="callout">
    <strong>内部用からパブリックへの昇格。</strong> 内部シンボルに対してシッピングし、それを semver でカバーしたい場合、道のりは短いです: ユースケースを含む Issue を作成し、私たちがサーフェスを監査すると、次のリリースでこのページに追加されます。
  </div>
