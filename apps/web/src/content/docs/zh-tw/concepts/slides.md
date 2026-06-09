---
title: "Slides 架構"
eyebrow: "執行期 (Runtime)"
description: "簡報 Press 的結構方式 — 每個資料夾對應一張投影片、一個有順序的索引檔案、SlideMeta，以及建置期的 objectId 注入。"
---
<p>
    簡報 (slides) Press 使用 <strong>每個資料夾對應一張投影片 (folder-per-slide)</strong> 的版面配置。每張投影片都是 <code>slides/</code> 底下一個獨立的目錄。引擎會掃描此目錄來發現投影片；<code>press.tsx</code> 則作為控制簡報順序的有順序索引。
  </p>

  <h2>目錄結構</h2>

  ### 範例：press/<slug>/ 樹狀結構

```text
press/<slug>/
  press.tsx              # 有順序的索引 — 由手動或 agent 編輯
  slides/
    <id>/
      slide.tsx          # 單張投影片：SlideMeta + 預設元件
  themes/
    default.css          # press 專屬 CSS
```

  <p>
    投影片識別碼 (<code>&lt;id&gt;</code>) 是小寫的 slugs：<code>intro</code>、
    <code>pricing-table</code>、<code>q-and-a</code>。它們直接對應到
    <code>press.tsx</code> 裡的 <code>&lt;Slide&gt;</code> 元素上的 <code>id</code> prop。
  </p>

  <h2>slide.tsx 契約</h2>

  <p>
    每個 <code>slide.tsx</code> 匯出兩樣東西：一個 <code>meta</code> 常數以及一個預設的
    React 元件。兩者皆為必填。
  </p>

  ### 範例：slides/<id>/slide.tsx

```tsx
import type { SlideMeta } from "@open-press/core";

export const meta = {
  layout: "default",
  description: "One-sentence summary of this slide's content.",
  keypoints: ["Point A", "Point B"],
} satisfies SlideMeta;

export default function Slide() {
  return (
    <section>
      <h2>Slide heading</h2>
      <p>Body content in JSX.</p>
    </section>
  );
}
```

  <h3>SlideMeta 欄位</h3>

  <table>
    <thead>
      <tr><th>欄位</th><th>類型</th><th>描述</th></tr>
    </thead>
    <tbody>
      <tr><td><code>layout</code></td><td><code>string</code></td><td>版面配置名稱。對應到 press 中已註冊的版面配置元件。預設為 <code>"default"</code>。</td></tr>
      <tr><td><code>description</code></td><td><code>string</code></td><td>一句話的純文字摘要。供 agents 作為上下文參考，也顯示在 workbench 的 inspector 中。</td></tr>
      <tr><td><code>keypoints</code></td><td><code>string[]</code></td><td>本張投影片的條列式重點。選填。</td></tr>
      <tr><td><code>visuals</code></td><td><code>string[]</code></td><td>預期視覺元素的純文字描述。作為 agent 指引。</td></tr>
    </tbody>
  </table>

  <div class="callout">
    <strong>不允許未知欄位。</strong> <code>meta</code> 使用了 <code>satisfies SlideMeta</code>
    — 額外的欄位會導致 TypeScript 錯誤。不要在 <code>meta</code> 中加入自訂屬性；
    請將投影片專屬資料直接寫入 JSX 中。
  </div>

  <h2>press.tsx — 有順序的索引</h2>

  <p>
    <code>press.tsx</code> 是 press 內唯一控制投影片順序的檔案。它宣告了
    自我閉合的 <code>&lt;Slide id /&gt;</code> 標記；相符的投影片內容存在於
    <code>slides/&lt;id&gt;/slide.tsx</code>。
  </p>

  ### 範例：press/<slug>/press.tsx

```tsx
import { Press, Slide } from "@open-press/core";

export default function DeckPress() {
  return (
    <Press slug="deck" title="My deck" type="slides" page="slide-16-9">
      <Slide id="intro" />
      <Slide id="pricing" />
      <Slide id="q-and-a" />
    </Press>
  );
}
```

  <p>
    Agents 透過重寫 <code>press.tsx</code> 來重新排列投影片 — 將 import 行與
    對應的 <code>&lt;Slide&gt;</code> 子元素一起移動。引擎會驗證 <code>press.tsx</code> 中的每個
    <code>id</code> 在 <code>slides/</code> 目錄下都有相符的資料夾。
  </p>

  <h2>跳過的投影片</h2>

  <p>
    投影片可以在不被刪除的情況下從渲染的簡報中排除。在 <code>press.tsx</code> 的
    <code>&lt;Slide&gt;</code> 元素上加上 <code>skip</code> prop：
  </p>

  ### 範例：跳過投影片

```tsx
<Slide id="draft" skip><Slide2 /></Slide>
```

  <p>
    引擎會在輸出中省略跳過的投影片，也不會匯入其 CSS 或資產。
    原始碼檔案仍原封不動地保留在 <code>slides/draft/</code> 中。
  </p>

  <h2>透過 CLI 新增投影片</h2>

  ### 範例：新增投影片

```bash
# 在 slides workspace 內部
open-press slide add pricing

# 帶有版面配置提示
open-press slide add pricing --layout titled-content
```

  <p>
    該指令會建立 <code>slides/pricing/slide.tsx</code>，包含一個空殼 <code>meta</code> 與
    元件，然後將對應的 <code>&lt;Slide&gt;</code> 條目附加到 <code>press.tsx</code>。
  </p>

  <h2>objectId 注入</h2>

  <p>
    引擎會在建置期將 <code>data-op-id</code> 屬性注入渲染的投影片元素中。這些識別碼為 workbench 的行內編輯與註解標記功能提供支援。
  </p>

  <div class="callout">
    <strong>請勿手寫 <code>objectId</code> 或 <code>data-op-id</code>。</strong>
    手動撰寫的值會導致驗證錯誤。引擎負責注入作業；您的原始碼必須保持乾淨。
  </div>

  <h2>驗證規則</h2>

  <p>引擎在建置期會強制執行以下約束：</p>

  <ul>
    <li><code>press.tsx</code> 內的每個 <code>id</code> 都必須有相符的 <code>slides/&lt;id&gt;/slide.tsx</code>。</li>
    <li><code>export const meta</code> 必須是一個字面值物件表達式 — 不能呼叫 <code>buildMeta()</code>、不能展開 (spread)、不能重新匯出。</li>
    <li><code>slides/&lt;id&gt;/slide.tsx</code> 不得包含 <code>objectId</code> props 或 <code>data-op-id</code> 屬性。</li>
    <li>投影片與版面配置檔案不得直接從 <code>themes/</code> 匯入 — 只有引擎的進入點包裝器會匯入佈景主題 CSS。</li>
  </ul>


<style>
  table {
    width: 100%;
    border-collapse: collapse;
    margin: var(--op-space-4) 0 var(--op-space-6);
    font-size: var(--op-text-sm);
  }
  th, td {
    text-align: left;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--op-hairline);
  }
  th {
    font-weight: 600;
    color: var(--op-ink-strong);
    background: color-mix(in srgb, var(--op-ink) 4%, transparent);
  }
  td code {
    padding: 0.06em 0.3em;
    border-radius: 3px;
    background: color-mix(in srgb, var(--op-ink) 7%, transparent);
    font-family: var(--op-font-mono);
    font-size: 0.85em;
  }
</style>
