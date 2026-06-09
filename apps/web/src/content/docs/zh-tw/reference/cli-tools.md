---
title: "工具"
eyebrow: "CLI · 第三層"
description: "提供給 AI agents、workbench 以及除錯使用的實用程式 — search, replace, inspect, doctor, upgrade, skills:sync。這些是已實作的指令，但它們不屬於日常建置循環的一部分。"
---
<p>
    第三層涵蓋了 agents 在建置生命週期之外，為了操作 workspace 所需的功能 — 包含定位內容、進行批次修改、讀取渲染後的幾何資訊，以及檢查 workspace 相較於上游版本的最新狀態。本頁上的每一個條目都被標記為 <strong>實作 (Impl)</strong>，因為它們目前已存在於 <code>open-press</code> 中。
  </p>

  <h2>原始碼 — 搜尋與替換</h2>

  <ApiEntry
    name="search"
    kind="command"
    importFrom="open-press search . <query> [--json]"
    summary="在已註冊的 MDX 來源中進行全文搜尋。回傳每個命中結果的檔案、行數、欄位以及相符的預覽。給 agents 在編輯前用來定位內容 — workbench 的尋找介面也是呼叫這個指令。"
  >
    <PropsTable
      title="旗標 (Flags)"
      rows={[
        { name: "<query>", type: "string", required: true, description: "純文字或正規表示式 (regex) 模式。" },
        { name: "--json", type: "flag", description: "輸出機器可讀的 JSON 而非格式化的文字輸出。" },
        { name: "--scope", type: "string", default: '"content"', description: "<code>content</code> = 僅搜尋 MDX 內文；<code>all</code> = 包含 frontmatter 與 metadata 欄位。" },
        { name: "--case-sensitive", type: "flag", description: "精確匹配大小寫 (預設為不區分大小寫)。" },
      ]}
    />

    ### 範例：尋找所有的圖片說明 (figure caption)

```bash
open-press search . "Figure" --json | jq '.matches[] | {file: .path, line, preview}'
```
  </ApiEntry>

  <ApiEntry
    name="replace"
    kind="command"
    importFrom="open-press replace . <from> <to> [--apply]"
    summary="跨 MDX 來源進行搜尋與替換。預設只提供預覽 — 加上 --apply 來實際寫入。Agents 用它來進行批次修改而無須重新實作原始碼 diff 功能。"
  >
    <PropsTable
      title="旗標 (Flags)"
      rows={[
        { name: "<from>", type: "string", required: true, description: "原始字串或正規表示式 (regex)。" },
        { name: "<to>", type: "string", required: true, description: "替換的文字。" },
        { name: "--apply", type: "flag", description: "寫入變更。如果沒有這個旗標，指令只會進行預覽 — 可安全地重複執行。" },
        { name: "--scope", type: "string", default: '"content"', description: "與 search 具有相同的語意。" },
        { name: "--include-code", type: "flag", description: "也替換程式碼區塊 (fenced code blocks) 內的文字 (預設會跳過以保護程式碼片段)。" },
        { name: "--case-sensitive", type: "flag", description: "精確匹配大小寫。" },
        { name: "--json", type: "flag", description: "輸出 JSON 報告 — agent 使用時的必要參數。" },
      ]}
    />

    ### 範例：先預覽，然後套用

```bash
open-press replace . "舊片語" "新片語"
# 檢查 diff 報告

open-press replace . "舊片語" "新片語" --apply
# 寫入變更
```
  </ApiEntry>

  <h2>渲染 — 檢查建置後的狀態</h2>

  <ApiEntry
    name="inspect"
    kind="command"
    importFrom="open-press inspect . [--json]"
    summary="建置後的內省 (introspection)。建置 workspace，啟動無頭版 (headless) Chrome 連接靜態伺服器，並回報區塊幾何、註解標記以及 TOC 鏈結輸出。給 workbench 檢查器以及需要真實排版資料的 agents 使用。"
  >
    <PropsTable
      title="旗標 (Flags)"
      rows={[
        { name: "--json", type: "flag", description: "輸出 JSON 報告。Agent 使用時的必要參數。" },
        { name: "--no-build", type: "flag", description: "重複使用現有的 <code>dist-react/</code> 建置結果而不重新渲染。" },
        { name: "--host", type: "string", default: '"127.0.0.1"', description: "用於無頭版 Chrome 連線的靜態伺服器主機。" },
        { name: "--port", type: "string", default: '"5186"', description: "靜態伺服器連接埠。" },
        { name: "--dry-run", type: "flag", description: "印出底層的指令鏈結 (render → static-server → Chrome) 而不實際執行。" },
      ]}
    />

    <p>
      <strong>inspect vs validate。</strong> <code>validate</code> 是基於原始碼層級的 (檢查設定 / 來源參照 / 連結完整性)；<code>inspect</code> 則是渲染後的檢查 (分頁後實際的區塊位置)。兩者都有其作用 — 將 <code>validate</code> 用於快速的飛行前檢查 (preflight)，當 agent 需要知道頁面實際的分頁結果時再使用 <code>inspect</code>。
    </p>
  </ApiEntry>

  <h2>環境 — workspace 最新狀態</h2>

  <ApiEntry
    name="doctor"
    kind="command"
    importFrom="open-press doctor ."
    summary="檢查 workspace 最新狀態。讀取已安裝的 @open-press/core 版本，從 npm 抓取最新版本，列出安裝在 .agents/skills/ 下的 agent skills，並回報 docs/migrations/ 內是否有待處理的遷移說明。快取在 .openpress/cache/doctor.json 並維持 24 小時。"
  >
    <PropsTable
      title="旗標 (Flags)"
      rows={[
        { name: "--json", type: "flag", description: "輸出 JSON 報告 — agent / CI 使用時的必要參數。" },
        { name: "--no-cache", type: "flag", description: "繞過 24 小時的快取並從 npm 重新抓取資料。" },
      ]}
    />

    <p>
      <strong>離開代碼 (Exit code) 永遠是 0</strong> — doctor 是資訊性的，而不是一個阻擋閘門。CI 腳本和 agents 應該檢查 JSON 輸出中的 <code>report.stale</code> 或 <code>report.coreUpdateAvailable</code> 來決定是否要阻擋。
    </p>

    ### 範例：人類可讀的輸出範例

```text
○ open-press doctor

framework
  ⚠ @open-press/core: 已安裝 0.7.1 → 可用版本 0.8.0

skills
  ✓ 已安裝 3 個 skills
    來源: quan0715/open-press
    更新: npx skills upgrade

migrations
  ⚠ 在您目前的版本之後有 1 個遷移說明:
    - docs/migrations/0.8.0.md

下一步 (next)
  npx open-press upgrade        # 套用所有更新 (由 agent 執行)
  npx open-press doctor --json  # 機器可讀輸出
```
  </ApiEntry>

  <ApiEntry
    name="upgrade"
    kind="command"
    importFrom="open-press upgrade ."
    summary="將 workspace 遷移到當前的 framework 版本。更新 package 相依套件、更新 skills，並套用 docs/migrations/ 中記載的特定版本遷移腳本。別名 (Alias)：migrate。"
  >
    <p>
      請搭配 <code>doctor</code> 使用：doctor 能辨識 <em>什麼</em> 需要被更新；upgrade 則實際寫入變更。在執行前請務必先跑 <code>git status</code> — upgrade 會修改 package 版本、安裝的 skills，以及那些作為遷移目標的 workspace 檔案。
    </p>
  </ApiEntry>

  <ApiEntry
    name="skills:sync"
    kind="command"
    importFrom="open-press skills:sync ."
    summary="根據 workspace 中安裝的 skill 套件包，同步 .agents/skills/ (以及像是 .claude/, .cursor/, .codex/ 等各平台的鏡像目錄)。會將 skills-lock.json 中的所有內容更新至它們最新發佈的版本。"
  >
    <PropsTable
      title="旗標 (Flags)"
      rows={[
        {
          name: "--source",
          type: "string",
          description: "選擇性參數。在現有安裝的基礎上，額外新增一個套件包。格式：<code>owner/repo</code> 或是 <code>github:owner/repo</code>。",
        },
        { name: "--dry-run", type: "flag", description: "印出底層的 <code>npx skills</code> 指令而不執行。" },
      ]}
    />

    <p>
      如果缺少 <code>skills-lock.json</code> (例如，workspace 是在 <code>skills:sync</code> 出現之前建立的)，這個指令會針對 OpenPress framework 的 skill 套件包 (<code>quan0715/open-press</code>) 執行初次安裝。
    </p>
  </ApiEntry>
