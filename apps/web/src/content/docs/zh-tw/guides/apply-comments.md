---
title: "/apply-comments"
eyebrow: "Skill"
description: "解決待處理的 @openpress-comment 標記。針對每個標記：閱讀周圍的文字，決定如何編輯，套用它，刪除標記。回報哪些已被處理以及哪些需要人類協助。"
---
<ApiEntry
    name="/apply-comments"
    kind="command"
    importFrom="/apply-comments"
    summary="註解處理工作流程。只有當請求的編輯已在原始碼中完成且標記已被移除時，註解才算解決。語意不明的標記會保留原位 — 絕不會被默默清除。"
  >
    <p>
      位於 <code>skills/openpress-apply-comments/</code>。標記的格式與撰寫端記錄於 <a href="/docs/guides/comment-markers">註解標記</a>。
    </p>
  </ApiEntry>

  <h2>工作流程</h2>

  <ol>
    <li>
      <strong>發現 (Discover)</strong> — 列出待處理的標記：
      ### 範例：尋找每一個標記

```bash
rg "@openpress-comment" press -n
```
      如果需要解碼後的筆記，請呼叫 framework 輔助函式：
      ### 範例：解碼後的 JSON 輸出

```bash
node --input-type=module -e \
  'import { listCommentMarkers } from "./packages/core/engine/react/comment-marker.mjs"; \
   console.log(JSON.stringify(await listCommentMarkers({ root: process.cwd() }), null, 2));'
```
    </li>
    <li>
      <strong>範圍 (Scope)</strong> — 如果使用者指定了一個標記（透過 id），則只解決該標記。如果使用者說「套用註解」而沒有提供 id，則依照原始碼順序處理待處理的標記。每次處理一個標記 — 絕不將不相關的重寫批次處理於同一次解決中。
    </li>
    <li>
      <strong>檢查 (Inspect)</strong> — 閱讀包含該標記的原始碼檔案。在編輯前閱讀周圍的行數。利用標記的提示加上渲染的物件 metadata，但要與原始碼進行比對驗證。
    </li>
    <li>
      <strong>套用 (Apply)</strong> — 進行能滿足該註解的最小原始碼變更。保留原有的局部樣式、元件 API 與 MDX 結構。如果請求語意不明確，請要求釐清並將標記保留在原位。
    </li>
    <li>
      <strong>移除標記</strong> — 只有在原始碼編輯到位後才進行。不要僅僅因為讀過了就清除標記。
    </li>
    <li>
      <strong>驗證 (Verify)</strong> —
      ### 範例：驗證

```bash
npm run build              # 驗證 + 渲染
```
    </li>
    <li>
      <strong>回報 (Report)</strong> — 已解決的 ids、變更的檔案、因為語意不明確而保留的標記，以及驗證狀態。
    </li>
  </ol>

  <h2>邊界 (Boundary)</h2>

  <ul>
    <li>編輯原始碼，而不是產生的輸出。絕不觸碰 <code>public/openpress/</code>、<code>dist-react/</code>、<code>.deploy/</code> 或 <code>.openpress/</code>。</li>
    <li>預設的編輯目標是包含該標記的原始碼檔案。</li>
    <li>將高度依賴領域知識的工作路由到其擁有的 skill：
      <ul>
        <li><code>openpress-create-pages</code> 負責頁面內文、階層、標題、聲明、語氣以及頁面元件。</li>
        <li><code>openpress-create-slide</code> 負責簡報敘事、投影片密度、主題、投影片版面配置，以及可重複使用的 UI 元素。</li>
        <li><code>openpress-diagram-drawing</code> 負責圖表語意。</li>
      </ul>
    </li>
    <li>在解決一個標記時不重寫不相關的區塊。</li>
    <li>不默默在沒有套用請求編輯的情況下清除標記。</li>
  </ul>

  <h2>常見錯誤</h2>

  <ul>
    <li>移除標記卻沒有套用其編輯。</li>
    <li>當標記僅要求小幅度變更時重寫大範圍的區塊。</li>
    <li>聲稱瀏覽器會反映變更卻沒有驗證 build。</li>
  </ul>

  <h2>原始碼</h2>

  <ul>
    <li><a href="https://github.com/quan0715/open-press/blob/main/skills/openpress-apply-comments/SKILL.md" rel="noopener"><code>skills/openpress-apply-comments/SKILL.md</code></a></li>
  </ul>
