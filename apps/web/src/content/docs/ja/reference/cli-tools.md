---
title: "ツール"
eyebrow: "CLI · ティア3"
description: "AIエージェント、ワークベンチ、およびデバッグのためのユーティリティ — search、replace、inspect、doctor、upgrade、skills:sync。これらは実装されたコマンドですが、日常のビルドループの一部ではありません。"
---
<p>
    ティア3は、ビルドライフサイクルを超えてエージェントがWorkspaceを<em>操作する</em>ために必要なものをカバーしています — コンテンツの検索、一括編集の適用、レンダリング後のジオメトリの読み取り、アップストリームに対するWorkspaceの鮮度の確認などです。このページのすべてのエントリは今日<code>open-press</code>に存在するため、<strong>Impl</strong>とマークされています。
  </p>

  <h2>ソース — 検索と置換</h2>

  <ApiEntry
    name="search"
    kind="command"
    importFrom="open-press search . <query> [--json]"
    summary="登録されたMDXソース全体でフルテキスト検索を行います。各ヒットについて、ファイル、行、列、および一致したプレビューを返します。エージェントが編集前にコンテンツを特定するために使用します — ワークベンチの検索UIもこれを呼び出します。"
  >
    <PropsTable
      title="フラグ"
      rows={[
        { name: "<query>", type: "string", required: true, description: "プレーンテキストまたは正規表現パターン。" },
        { name: "--json", type: "flag", description: "フォーマットされた出力の代わりに機械可読なJSONを出力します。" },
        { name: "--scope", type: "string", default: '"content"', description: "<code>content</code> = MDXの本文のみ。<code>all</code> = フロントマターとメタデータフィールドを含みます。" },
        { name: "--case-sensitive", type: "flag", description: "大文字と小文字を文字通りに一致させます（デフォルトは大文字と小文字を区別しません）。" },
      ]}
    />

    ### 例: すべての図のキャプションを見つける

```bash
open-press search . "Figure" --json | jq '.matches[] | {file: .path, line, preview}'
```
  </ApiEntry>

  <ApiEntry
    name="replace"
    kind="command"
    importFrom="open-press replace . <from> <to> [--apply]"
    summary="MDXソース全体で検索と置換を行います。デフォルトではプレビューのみを行います。書き込むには--applyを渡します。エージェントは、ソースの差分を再実装せずに一括編集を行うためにこれを使用します。"
  >
    <PropsTable
      title="フラグ"
      rows={[
        { name: "<from>", type: "string", required: true, description: "ソース文字列または正規表現。" },
        { name: "<to>", type: "string", required: true, description: "置換テキスト。" },
        { name: "--apply", type: "flag", description: "変更を書き込みます。このフラグがない場合、コマンドはプレビューのみを行い、何度でも安全に実行できます。" },
        { name: "--scope", type: "string", default: '"content"', description: "searchと同じセマンティクスです。" },
        { name: "--include-code", type: "flag", description: "フェンスで囲まれたコードブロック内も置換します（スニペットを保護するため、デフォルトではスキップされます）。" },
        { name: "--case-sensitive", type: "flag", description: "大文字と小文字を文字通りに一致させます。" },
        { name: "--json", type: "flag", description: "JSONレポートを出力します — エージェントの消費に必要です。" },
      ]}
    />

    ### 例: プレビューして適用する

```bash
open-press replace . "old phrase" "new phrase"
# 差分レポートを確認する

open-press replace . "old phrase" "new phrase" --apply
# 変更を書き込む
```
  </ApiEntry>

  <h2>レンダリング — ビルド後の状態のインスペクト</h2>

  <ApiEntry
    name="inspect"
    kind="command"
    importFrom="open-press inspect . [--json]"
    summary="レンダリング後のイントロスペクション。Workspaceをビルドし、静的サーバーに対してヘッドレスChromeを起動し、ブロックのジオメトリ / コメントマーカー / 目次チェーンの出力を報告します。ワークベンチインスペクタや、ページが実際にどのようにページ付けされたかのグラウンドトゥルースなレイアウトデータを必要とするエージェントによって使用されます。"
  >
    <PropsTable
      title="フラグ"
      rows={[
        { name: "--json", type: "flag", description: "JSONレポートを出力します。エージェントの消費に必要です。" },
        { name: "--no-build", type: "flag", description: "再レンダリングせずに既存の<code>dist-react/</code>ビルドを再利用します。" },
        { name: "--host", type: "string", default: '"127.0.0.1"', description: "ヘッドレスChromeセッション用の静的サーバーのホスト。" },
        { name: "--port", type: "string", default: '"5186"', description: "静的サーバーのポート。" },
        { name: "--dry-run", type: "flag", description: "実行せずに基盤となるコマンドチェーン（レンダリング → 静的サーバー → Chrome）を出力します。" },
      ]}
    />

    <p>
      <strong>inspect と validate の比較。</strong> <code>validate</code>はソースレベル（設定 / ソース参照 / リンクの整合性）です。<code>inspect</code>はレンダリング後（ページネーション後の実際のブロック位置）です。どちらも正当です。高速なプリフライトには<code>validate</code>を使用し、エージェントがページが実際にどのようにページネーションされたかを知る必要がある場合は<code>inspect</code>を使用します。
    </p>
  </ApiEntry>

  <h2>環境 — Workspaceの鮮度</h2>

  <ApiEntry
    name="doctor"
    kind="command"
    importFrom="open-press doctor ."
    summary="Workspaceの鮮度チェック。インストールされている@open-press/coreバージョンを読み取り、npmから最新を取得し、.agents/skills/の下にインストールされているエージェントスキルをリストし、docs/migrations/に保留中の移行ノートを報告します。.openpress/cache/doctor.jsonに24時間キャッシュされます。"
  >
    <PropsTable
      title="フラグ"
      rows={[
        { name: "--json", type: "flag", description: "JSONレポートを出力します — エージェント / CIの消費に必要です。" },
        { name: "--no-cache", type: "flag", description: "24時間のキャッシュをバイパスし、npmから再取得します。" },
      ]}
    />

    <p>
      <strong>終了コードは常に0です</strong> — doctorは情報提供であり、ゲートではありません。CIスクリプトとエージェントは、JSON出力の<code>report.stale</code>または<code>report.coreUpdateAvailable</code>を調べて、ブロックするかどうかを決定する必要があります。
    </p>

    ### 例: 人間向けの出力サンプル

```text
○ open-press doctor

framework
  ⚠ @open-press/core: 0.7.1 installed → 0.8.0 available

skills
  ✓ 3 skills installed
    source: quan0715/open-press
    refresh: npx skills upgrade

migrations
  ⚠ 1 migration note(s) since your version:
    - docs/migrations/0.8.0.md

next
  npx open-press upgrade        # apply all updates (agent-driven)
  npx open-press doctor --json  # machine-readable output
```
  </ApiEntry>

  <ApiEntry
    name="upgrade"
    kind="command"
    importFrom="open-press upgrade ."
    summary="Workspaceを現在のフレームワークバージョンに移行します。パッケージの依存関係を更新し、スキルをリフレッシュし、docs/migrations/で参照されるバージョン固有の移行スクリプトを適用します。エイリアス: migrate。"
  >
    <p>
      <code>doctor</code>と組み合わせます。doctorは<em>何</em>を更新する必要があるかを特定し、upgradeは実際に変更を書き込みます。常に最初に<code>git status</code>を実行してください — upgradeはパッケージのバージョン、インストールされたスキル、移行対象のWorkspaceファイルを変更します。
    </p>
  </ApiEntry>

  <ApiEntry
    name="skills:sync"
    kind="command"
    importFrom="open-press skills:sync ."
    summary=".agents/skills/（および.claude/、.cursor/、.codex/などの下のプラットフォームごとのミラー）を、Workspaceにインストールされたスキルパックから同期します。skills-lock.json内のすべてを最新の公開バージョンにリフレッシュします。"
  >
    <PropsTable
      title="フラグ"
      rows={[
        {
          name: "--source",
          type: "string",
          description: "オプション。既存のインストールの上に追加のパックを追加します。フォーマット: <code>owner/repo</code>または<code>github:owner/repo</code>。",
        },
        { name: "--dry-run", type: "flag", description: "実行せずに基盤となる<code>npx skills</code>コマンドを出力します。" },
      ]}
    />

    <p>
      <code>skills-lock.json</code>が欠落している場合（例: <code>skills:sync</code>が存在する前にWorkspaceがスキャフォールドされた場合）、このコマンドはOpenPressフレームワークスキルバンドル（<code>quan0715/open-press</code>）の初回インストールを実行します。
    </p>
  </ApiEntry>
