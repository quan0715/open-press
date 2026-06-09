---
title: "與 Agent 合作"
eyebrow: "Agent 工作流程"
description: "如何要求 AI agent 正確地使用 OpenPress：從 skills 或原始素材開始、建立可編輯的 workspace、驗證輸出，並在跨越產品邊界前停止。"
---
<h2>工作契約</h2>

  <p>
    OpenPress 是一個全新開源且以 agent 為優先的文件套件。它為 agents 提供了
    MDX 文件、頁面與投影片元件、原始碼管理、預覽、驗證、
    渲染及匯出指令的共用基礎契約。Skills 則可以專注於接收需求、品味、故事企劃、視覺配方，
    以及起始範例。
  </p>

  <p>
    實務上：要求 agent 處理 <code>press/</code> 中的檔案、執行 OpenPress 指令，
    並在 framework 沒有提供所需基礎元件時回報缺口。請勿要求 agent
    修改產生出來的輸出結果，或是發明一套平行的 HTML 轉 doc、doc 轉 PPT 或螢幕截圖管線。
  </p>

  <h2>開始專案</h2>

  <p>
    對於非技術或 AI 優先的使用者，請先安裝 skills，並讓 agent 根據 skill 
    的指示初始化 workspace。
  </p>

  ### 範例：先安裝 skills

```bash
npx -y skills@latest add quan0715/open-press
npx -y skills@latest add quan0715/openpress-social-card-skill
```

  <p>
    在重新啟動 agent 階段後，要求您想要的輸出。一個好的請求應具備
    格式、受眾、語言，以及任何原始素材。
  </p>

  ### 範例：提示 agent

```text
Use OpenPress skills to create an editorial social-card set.
Ask intake questions, initialize the workspace, apply the skill starter,
then run npm run build and export images.
```

  <p>
    若是 CLI 優先的用法，請直接執行 create。create 套件會 bootstrap workspace 並安裝 OpenPress
    套件；skills 則依然擁有具觀點的起始內容。
  </p>

  ### 範例：CLI 優先啟動

```bash
npm create @open-press@latest my-paper -- --type slides --title "Transport models"
cd my-paper
npm run dev
```

  <h2>Agent 應該編輯什麼</h2>

  <table>
    <thead>
      <tr>
        <th>層級 (Layer)</th>
        <th>路徑 (Paths)</th>
        <th>規則 (Rule)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Workspace 原始碼</td>
        <td>
          <code>press/*/press.tsx</code>, <code>press/**/chapters/</code>,
          <code>press/**/theme/</code>, <code>press/**/components/</code>,
          <code>press/**/media/</code>, <code>press/shared/</code>, <code>package.json</code>
        </td>
        <td>在這裡編輯。這是唯一的事實來源。</td>
      </tr>
      <tr>
        <td>Skill 素材</td>
        <td><code>.agents/skills/</code>, <code>.claude/skills/</code>, 安裝的外部 skill 資料夾</td>
        <td>閱讀指示並將起始範例複製或改編到 <code>press/</code> 中。</td>
      </tr>
      <tr>
        <td>Framework 套件</td>
        <td><code>node_modules/@open-press/core/</code>, <code>node_modules/@open-press/cli/</code></td>
        <td>在文件製作期間為唯讀。在上游修復後，進行升級。</td>
      </tr>
      <tr>
        <td>產生出來的輸出</td>
        <td><code>public/openpress/</code>, <code>dist-react/</code>, <code>.deploy/</code>, <code>.openpress/</code></td>
        <td>絕不手動編輯。修改原始碼然後重新渲染。</td>
      </tr>
    </tbody>
  </table>

  <h2>任務路由</h2>

  <table>
    <thead>
      <tr>
        <th>您要求...</th>
        <th>Agent 應該使用...</th>
        <th>預期行為</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>新的 OpenPress workspace</td>
        <td><code>openpress-create-pages</code> 或 <code>openpress-create-slide</code></td>
        <td>檢查 Node，必要時執行 create，建立第一個該產物專屬的 <code>&lt;Press&gt;</code>，驗證 build。</td>
      </tr>
      <tr>
        <td>特定的創意格式</td>
        <td>一個外部創意 skill</td>
        <td>使用該 skill 進行需求接收、版面配置選擇、起始範例與品味決策。</td>
      </tr>
      <tr>
        <td>佈景主題或品牌變更</td>
        <td>該產物類型的活動創作 skill</td>
        <td>編輯資料夾局部的佈景主題檔案、共用的佈景主題檔案與局部元件，然後預覽並建置。</td>
      </tr>
      <tr>
        <td>審閱註解</td>
        <td><code>/apply-comments</code></td>
        <td>閱讀 <code>@openpress-comment</code> 標記，套用最小的原始碼編輯，移除已解決的標記。</td>
      </tr>
      <tr>
        <td>PDF、圖片或部署輸出</td>
        <td>OpenPress npm scripts 以及 <code>openpress-deploy</code></td>
        <td>執行文件記載的指令；只有在明確確認目標名稱後才部署。</td>
      </tr>
      <tr>
        <td>缺乏 framework 行為</td>
        <td>Framework issue 或上游程式碼變更</td>
        <td>回報基礎缺口。請勿透過修改產生的 HTML 或螢幕截圖來偽造它。</td>
      </tr>
    </tbody>
  </table>

  <h2>驗證迴圈</h2>

  <p>
    一個有用的 agent 不會在編輯檔案後就停下來。它應該執行符合該任務的最小驗證，
    並回報通過了什麼。
  </p>

  <ul>
    <li><code>npm run dev</code> — 用於視覺反覆運算的本機 workbench。</li>
    <li><code>npm run build</code> — 驗證並渲染正式環境套件包。</li>
    <li><code>npm run typecheck</code> — 捕捉 workspace 程式碼中的 TypeScript 錯誤。</li>
    <li><code>npm run openpress:image</code> — 當交付物是視覺圖像時，匯出頁面圖片。</li>
    <li><code>npm run openpress:pdf</code> — 當交付物類似印刷品時，產生 PDF。</li>
    <li><code>npm run openpress:deploy:dry-run</code> — 發佈前檢查部署步驟。</li>
  </ul>

  <h2>硬性停止 (Hard stops)</h2>

  <ul>
    <li>不要手動編輯產生出來的輸出。</li>
    <li>不要修改使用者 workspace 內的 <code>node_modules/@open-press/</code>。</li>
    <li>不要捏造事實、引文、數字或公開承諾。</li>
    <li>不要在沒有明確說出目標專案名稱並獲得確認的情況下進行部署。</li>
    <li>不要要求 OpenPress CLI 去抓取樣板或套件包；starter 歸屬於 skills。</li>
  </ul>

  <div class="callout">
    <strong>下一步：</strong>閱讀 <a href="/docs/skills">Skills</a> 以了解 skill 所有權地圖，或是
    <a href="/docs/getting-started">快速開始</a> 以取得確切的安裝指令。
  </div>
