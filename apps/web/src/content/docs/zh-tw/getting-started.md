---
title: "開始使用"
eyebrow: "Start here"
description: "從簡報、原始碼資料夾或創意 skill 開始。讓您的 agent 建立 OpenPress Workspace，或是直接執行 CLI。"
---
<div class="callout">
    <strong>先決條件。</strong> Node.js 20+ 以及 <code>npm</code> 和 <code>npx</code>。
    Chromium 和 <code>wrangler</code> 只有在匯出 PDF/圖片或部署到 Cloudflare 時才需要。
  </div>

  <h2>1. 選擇您的開始路徑</h2>

  <h3>路徑 A · AI 優先：安裝 skills，然後要求 agent</h3>

  <p>
    最適合 AI 優先的使用者、非技術使用者，以及具備特定觀點的格式。先安裝 OpenPress
    skill 套件包，然後加入任何了解該出版風格的創意或領域 skill。
  </p>

  ### 範例：安裝 skills

```bash
npx -y skills@latest add \
  quan0715/open-press

# 選擇性的創意/領域 skill
npx -y skills@latest add \
  quan0715/openpress-social-card-skill
```

  <p>
    安裝後請重新啟動 agent 階段 (session)，以便讓新的 skills 生效。接著要求 agent
    建立 workspace。OpenPress skills 會引導它執行 create 套件、安裝
    packages、複製或改編 skill 擁有的 starter 檔案，並驗證結果。
  </p>

  ### 範例：提示 agent

```text
我想做一份固定版面文件。請使用 OpenPress skills：
1. 確認 Node / npm / npx 可用
2. 用 npm create @open-press 建立 workspace
3. 安裝需要的 @open-press packages
4. 套用合適的 skill starter 或範例
5. 跑 npm run build 驗證
```

  <h3>路徑 B · CLI 優先：自行執行指令</h3>

  <p>
    最適合已經了解目標資料夾、標題和工作流程的開發人員。
    <code>npm create</code> 指令會下載 create 套件；它會建立 workspace 並預設執行
    <code>npm install</code>。
  </p>

  ### 範例：建立 workspace

```bash
npm create @open-press@latest my-paper -- \
  --type slides \
  --title "Transport models in dense networks"

cd my-paper
```

  ### 範例：如果略過了安裝 packages

```bash
npm install

# 如果 skill 同步失敗
npm run openpress:skills
```

  <p>
    Starter 內容來自於 skills，而非內建的套件包。OpenPress 會初始化文件
    workspace；skills 則負責接收需求、提供範例、起始檔案與品味。請參閱
    <a href="/docs/skills">Skills</a> 以了解所有權的劃分。
  </p>

  <h2>2. 編輯內容</h2>

  <p>
    您所撰寫的所有內容都存在 <code>press/</code> 底下。執行期的內部程式碼在安裝後位於
    <code>node_modules/@open-press/</code>；請將這些 packages 視為唯讀。
  </p>

  <h3>Slides workspace</h3>

  <p>
    簡報 (slides) Press 使用 <strong>每個資料夾對應一張投影片 (folder-per-slide)</strong> 的版面配置。每張投影片都位於
    <code>slides/</code> 底下的獨立目錄中；<code>press.tsx</code> 是有順序的索引，將
    投影片列為 JSX 子元素。請參閱 <a href="/docs/concepts/slides">Slides 架構</a> 了解完整的
    契約。
  </p>

  ### 範例：Slides 檔案樹

```text
press/<slug>/
  press.tsx          # 有順序的索引 — 依照 JSX 順序列出投影片
  slides/
    intro/
      slide.tsx      # 單張投影片：meta + 預設匯出的元件
    pricing/
      slide.tsx
  themes/
    default.css
```

  ### 範例：slides/intro/slide.tsx

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

  ### 範例：press/<slug>/press.tsx (有順序的索引)

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

  <h3>所有 press 類型的共通點</h3>

  <ul>
    <li><code>press/&lt;slug&gt;/themes/</code> — 作用於此 press 的 CSS tokens 和佈景主題覆寫。</li>
    <li><code>press/&lt;slug&gt;/components/</code> — Press 專屬的 React 元件。</li>
    <li><code>press/&lt;slug&gt;/media/</code> 和 <code>press/shared/media/</code> — 圖片、向量資產。在匯出時會同步到 public 套件包中。</li>
    <li><code>package.json</code> — <code>"openpress.deploy"</code> 欄位是存放建置時部署轉接器設定的地方。請參閱 <a href="/docs/concepts/workspace-config">Workspace config</a>。</li>
  </ul>

  <h2>3. 即時預覽</h2>

### 範例：啟動 workbench

```bash
npm run dev
# → http://127.0.0.1:5173/workspace
```

  <p>
    workbench 會在存檔時重新載入 CSS、tokens 和 React 介面。MDX 內容的更新會透過
    引擎的原始碼監聽器傳遞。<code>/workspace</code> 路由會開啟專案畫廊，而
    每份文件會在 <code>/&lt;press-slug&gt;/preview</code> 開啟 workbench 外殼
    （包含 inspector、原始碼編輯端點、註解標記）。
  </p>

  <h2>4. 建置 + 驗證</h2>

  ### 範例：正式環境建置

```bash
npm run build         # 驗證 + 渲染 dist-react/
npm run preview       # 將 dist-react/ 作為靜態網站提供服務
npm run openpress:pdf # 選擇性：在本機產生 PDF
```

  <p>
    <code>build</code> 串聯了結構驗證、MDX → React 匯出，以及 Vite 正式環境建置。
    如果驗證失敗，建置會在 Vite 執行前中止，因此綠色建置表示文件
    形狀是一致的。請參閱 <a href="/docs/concepts/cli-lifecycle">CLI · 生命週期</a> 了解每個步驟
    的作用。
  </p>

  <h2>5. 部署</h2>

  <p>
    OpenPress 要求任何部署都必須明確確認 — 沒有無聲的發佈。在 workspace 的
    <code>package.json</code> 中的 <code>"openpress.deploy"</code> 欄位下設定轉接器，然後執行：
  </p>

  ### 範例：部署到 Cloudflare Pages

```bash
npm run openpress:deploy:dry-run        # 預覽步驟
npm run openpress:deploy -- --confirm   # 發佈
```

  <p>
    deploy 指令會進行建置、產生 PDF 階段產物、寫入 <code>deploy.json</code>
    metadata，並交接給設定好的轉接器。如果尚未實作特定主機的轉接器，請直接使用產生出來的建置輸出結果，並在
    OpenPress 之外進行發佈步驟。
  </p>

  <h2>下一步閱讀</h2>

  <ul>
    <li><a href="/docs/concepts/slides">Slides 架構</a> — 每個資料夾對應一張投影片的版面配置、<code>SlideMeta</code>、投影片排序，以及 <code>objectId</code> 注入。</li>
    <li><a href="/docs/concepts/working-with-agents">與 Agent 合作</a> — agents 應如何初始化、編輯、驗證並在邊界處停止。</li>
    <li><a href="/docs/concepts/themes">佈景主題</a> — <code>press/&lt;slug&gt;/themes/</code> 契約。</li>
    <li><a href="/docs/reference/components-press">元件 → Press</a> — Press Tree 基礎元件。</li>
    <li><a href="/docs/guides/comment-markers">註解標記</a> — 行內審閱工作流程。</li>
    <li><a href="/docs/cli">CLI</a> — 完整的指令參考（三個層級）。</li>
  </ul>
