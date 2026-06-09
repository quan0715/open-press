---
title: "MdxArea"
eyebrow: "@open-press/core"
description: "Frame 內部一個可測量的內容插槽。引擎會將分配好的區塊填入 MdxArea 實例中，這些區塊來自來源鏈結 (source chain) — 您的工作是宣告 MDX 內容應該放在哪裡；引擎則會處理測量、分頁以及溢出 (overflow)。"
---
<ApiEntry
    name="<MdxArea>"
    kind="component"
    importFrom={'import { MdxArea } from "@open-press/core";'}
    signature={`<MdxArea chainId="story" overflow?="extend" className?="my-area" />`}
    summary="在作用中的 Frame 內渲染一個帶有 <div data-openpress-mdx-area> 的插槽。引擎會在匯出時測量這個插槽，從指定的鏈結分配區塊，並使用解析後的內容重新渲染。"
  >
    <PropsTable
      title="Props"
      rows={[
        {
          name: "chainId",
          type: "string",
          required: true,
          description:
            "這個插槽所依據的來源鏈結。使用 <code>mdxSource()</code> 定義的來源會產生以來源鍵值 (例如 <code>story</code>) 命名的鏈結；像是 <code>Sections</code> 這類文稿輔助工具則會傳遞由章節衍生出的鏈結 id (<code>chapter:intro</code>)。",
        },
        {
          name: "overflow",
          type: '"extend" | "truncate"',
          default: '"extend"',
          description:
            "<strong>extend</strong> — 當分配的區塊裝不下時，引擎會產生更多的 frames (適用於長篇分頁)。<strong>truncate</strong> — 盡可能塞入內容，並捨棄其餘部分 (適用於固定格式的簡報 / 社交卡片)。",
        },
        {
          name: "className",
          type: "string",
          description: "附加到渲染出來的 <code>&lt;div&gt;</code> 標籤。Themes 使用它來為特定的插槽設定排版或是佈局的範疇 (scope)。",
        },
        {
          name: "...rest",
          type: "HTMLAttributes",
          description: "傳遞給下層 <code>&lt;div&gt;</code> 標籤的其他屬性。",
        },
      ]}
    />

    ### 範例：長篇內容插槽 (自動分頁)

```tsx
<Frame frameKey="ch-1" role="document.content">
  <div className="page-frame">
    <main className="page-body">
      <MdxArea chainId="story" />
    </main>
  </div>
</Frame>
```

    ### 範例：固定的簡報插槽 (溢出時截斷)

```tsx
<Frame frameKey="slide-1" role="canvas.slide" chrome={false}>
  <div className="page-frame">
    <main className="page-body">
      <MdxArea chainId="slides" overflow="truncate" />
    </main>
  </div>
</Frame>
```
  </ApiEntry>

  <h2>渲染器寫入的 Data 屬性</h2>

  <PropsTable
    rows={[
      {
        name: "data-openpress-mdx-area",
        type: '"true"',
        description: "標記屬性，必定存在。選擇器可以鎖定 <code>[data-openpress-mdx-area]</code>。",
      },
      {
        name: "data-openpress-mdx-area-chain",
        type: "string",
        description: "反映 <code>chainId</code> 的值。",
      },
      {
        name: "data-openpress-mdx-area-index",
        type: "number",
        description:
          "在父 Frame 內的插槽索引，依據原始碼順序。如果在同一個 Frame 內有多個使用相同鏈結的 MdxArea，它們會得到 0, 1, 2, … 等索引。",
      },
      {
        name: "data-openpress-object-id",
        type: "string",
        description: "MdxArea 層級的物件 id (<code>mdx-area:&lt;frameKey&gt;:&lt;chainId&gt;:&lt;index&gt;</code>) — 供檢查器與註解標記系統使用。",
      },
      {
        name: "data-openpress-mdx-area-overflow",
        type: '"extend" | "truncate"',
        description: "反映 <code>overflow</code> prop 的值。",
      },
      {
        name: "data-openpress-mdx-area-empty",
        type: '"true" | "false"',
        description: "當還沒有任何區塊被分配到這個插槽時為 <code>true</code> — 對於顯示 placeholder (佔位符) 很有用。",
      },
    ]}
  />

  <h2>注意事項 (Notes)</h2>

  <ul>
    <li>
      位於 <code>&lt;Frame&gt;</code> 外部的 <code>&lt;MdxArea&gt;</code> 會渲染為空白 — 需要 <code>FrameContext</code> 才能得知它的插槽索引。
    </li>
    <li>
      <code>overflow="truncate"</code> 會捨棄裝不下的內容而不會發出警告。部署前請務必確認簡報與社交卡片的輸出結果。
    </li>
    <li>
      引擎透過 <code>toc:</code> 這個 id 前綴來識別 TOC 鏈結；<code>TocArea</code> (在 <code>@open-press/core/manuscript</code> 內) 只是一個為該前綴預先設定好，並包裝在 <code>&lt;ol class="toc-list"&gt;</code> 中的 MdxArea。
    </li>
  </ul>
