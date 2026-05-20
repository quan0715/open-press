# QDoc React Architecture — v1 Design Record

**Status:** Draft v1(brainstorm 紀錄;尚未進入實作)
**Date:** 2026-05-20
**Scope:** 整體架構從「Markdown + custom-element tag + folder-of-mjs component」轉到「MDX + React component tree + BaseX primitive 繼承體系」
**Owner:** quan
**Related:** 之前的 sessions(reader runtime rewrite, design-system flatten, chapter-opener visuals)。本文件記錄未來方向,不取代現有實作。

---

## 1. 為什麼動

四個 driver:

1. **AI 編輯 shell 頁面錯誤率高** — cover / opener / back-cover 是「填空到固定 layout」,markdown 內混 HTML 是錯的抽象,AI 寫的時候會壞 class 結構。
2. **`<qdoc-component name="..." />` 的 props 語法受限** — 複雜資料只能塞字串,JSON escape / 中文 / 巢狀都痛。
3. **想藏 Vite/React/tsconfig 在 `@qdoc/core` 裡**(從 open-slide 學到),user workspace 只剩 `document/` + `package.json`。
4. **想推 per-chapter 資料夾結構**,連帶要重新整理 page kind 跟元件繼承的關係。

---

## 2. 三層架構

```
Layer 1: @qdoc/core(npm dependency,user 不編輯)
─────────────────────────────────────────────
  Engine primitives(BaseX 元件):
    BasePage              ← 紙張尺寸、padding、bleed、頁碼 slot、data-attr
    BaseCoverPage         ← extends BasePage(無 footer / 無頁碼 / fullBleed)
    BaseOpenerPage        ← extends BasePage(無 footer、章節 tone slot)
    BaseTocPage           ← extends BasePage(內容由 exporter 注入)
    BaseReportPage        ← extends BasePage(footer + 頁碼)
    BaseBackCoverPage     ← extends BasePage(無 footer)
    BaseFigure            ← 圖框、caption、break-inside、編號 slot
    BaseCallout           ← block-level 提示(warn / info / success)
    BaseCodeBlock         ← extends pre,行數、語法 hint
  Engine:
    MDX compile,React SSR,pagination,validation,inspector
  CLI:
    dev / build / preview / init / migrate

Layer 2: Skill scaffolders(skills/<pack>/starter/,init-time 複製到 user)
─────────────────────────────────────────────
  template(完整內容見 §7.1):
    package.json / tsconfig.json     → workspace root
    AGENTS.md                        → workspace root(agent 規則 template)
    document/index.tsx               → config + shell JSX exports(範例值)
    document/design.md               → 設計規範
    document/memory/{USER,PROJECT,FEEDBACK,REFERENCES}.md + references/.gitkeep
    document/theme/                  → CSS tokens / base / fonts
    document/components/             → Cover / Toc / ChapterOpener / Page / BackCover
    document/media/                  → 範例媒體
    document/chapters/01-sample/     → 範例章節(chapter.tsx + content/ + media/ + styles/)

Layer 3: User document(init 後 user 完全自主)
─────────────────────────────────────────────
  my-doc/                                 ← workspace root
    package.json                          ← 唯一依賴: @qdoc/core
    tsconfig.json                         ← extends @qdoc/core/tsconfig base
    AGENTS.md                             ← cross-tool 標準入口(必備)
    document/
      index.tsx                           ← MERGED:config + shell JSX exports(這就是文件)
      design.md                           ← 設計規範
      memory/                             ← 可選,細分 agent context
        USER.md                           ← user 是誰
        PROJECT.md                        ← 文件目前狀態
        FEEDBACK.md                       ← 過去學到的修正
        REFERENCES.md                     ← 外部資源索引(指向 references/ 內檔案)
        references/                       ← 實際參考資料(PDF / markdown 摘錄 / blog 等)
          teacher-a/
            data-structures-2024.pdf
            linked-list-ch4.md
          mit-6.006/
            lec5-linked-list-notes.md
          clrs-3rd/
            ch10-elementary-data-structures.md
      theme/                              ← 全域 CSS tokens、字型、版面 base
      components/                         ← 全域共享 React components
        Cover.tsx                         ← document/index.tsx 內 <Cover/> 的實作
        Toc.tsx                           ← document/index.tsx 內 <Toc/> 的實作
        ChapterOpener.tsx                 ← 跨章節重複使用(風格一致)
        Page.tsx                          ← 每個 chapter page 的 chrome wrapper
        BackCover.tsx                     ← document/index.tsx 內 <BackCover/> 的實作
        (其他跨章節共用的 user component)
      media/                              ← 全域共享 media
      chapters/
        04-linked-list/                   ← 章節完全自包
          chapter.tsx                     ← meta + 可選 opener JSX export
          content/
            01-list-and-node.mdx          ← MDX prose
            02-singly-linked-list.mdx
            03-stack-queue.mdx
          components/                     ← 本章專屬 React 元件
            LinkedListVisual.tsx
            InsertionStep.tsx
          media/                          ← 本章專屬 media
            list-storage.png
          styles/                         ← 本章 scoped CSS(engine 自動 prefix)
            chapter.css
        05-tree/
          chapter.tsx
          content/
            01-tree-basics.mdx
            02-traversal.mdx
          components/
            TreeVisual.tsx
          media/
            tree-recursion.png
```

**責任邊界**:Layer 1 改不到的東西(紙張幾何、頁碼位置、break-inside 規則)由 BaseX props 強制限制;Layer 2 是一次性 starter 模板;Layer 3 一旦複製完成,完全是 user 的,跟 pack 沒有 binding。

---

## 3. 檔案格式

### 3.1 文件 entry — `document/index.tsx`

**這個檔案就是文件本身**。合併原本的 `qdoc.config.mjs` + shell singleton 兩件事:

```tsx
// document/index.tsx
import type { QDocManifest } from '@qdoc/core';
import { Cover, Toc, BackCover } from '@/components';

export const config: QDocManifest = {
  title: '資料結構筆記',
  subtitle: 'Data Structures Notes',
  organization: '你的姓名 / 課程代碼',
  workspaceLabel: 'Data structures notebook',

  publicDir: 'public/qdoc',
  outputDir: 'dist-react',

  pdf: {
    filename: 'data-structures-notes.pdf',
  },

  deploy: {
    adapter: 'cloudflare-pages',
    source: '.deploy/data-structure-note',
    projectName: 'data-structure-note',
    commitDirty: false,
    requiresConfirmation: true,
  },
};

export const cover = (
  <Cover
    title={config.title}
    subtitle={config.subtitle}
    organization={config.organization}
    hero="/media/cover.png"
  />
);

export const toc = <Toc title="目錄" levels={[2, 3]} />;

export const backCover = (
  <BackCover
    statement="一份安靜、可列印的程式教學講義。"
    summary="保留淡網格紙、細線、深藍灰文字、可重用教學內容區塊。"
  />
);
```

**規則**:
- 四個 named exports:`config` / `cover` / `toc` / `backCover`
- `config` 是 build / deploy / metadata 設定;`cover` / `toc` / `backCover` 是 shell JSX elements
- `config` 內的字串可被 shell JSX `props` 引用(single source of truth)
- 缺 shell exports,該 page 就不存在;空文件可以只有 `config`
- Type-safe — `QDocManifest` interface 確保 config 欄位、TS 確保 JSX props 正確
- 目錄路徑 default 走 convention,需要 override 時 `config.paths` 可指定

**約定路徑**(default,可在 `config.paths` 內 override):

| 內容 | 預設位置 |
|---|---|
| design 文檔 | `document/design.md` |
| 主題 CSS | `document/theme/` |
| 共享 components | `document/components/` |
| 共享 media | `document/media/` |
| 章節 | `document/chapters/<NN-slug>/` |

**Engine bootstrap 流程**:
1. 啟動內建 TS compiler(已包在 `@qdoc/core` 內)
2. Compile `document/index.tsx`
3. Read `config` export 拿到設定
4. Read `cover` / `toc` / `backCover` JSX elements(只是 data,不執行 SSR)
5. 進入 build / dev pipeline

對 user 透明,但 engine 從 `.mjs` config 轉成 `.tsx` 進入點。

### 3.2 Chapter prose — MDX

```mdx
# chapters/04-linked-list/01-list-and-node.mdx
## List、Node 與 Pointer

List(串列)是一組相同資料型態元素的有序集合……

<LinkedListVisual
  items={["A", "B", "C"]}
  highlight={1}
  caption="三個節點的串列示意"
/>

陣列也能表示串列,但陣列順序通常和記憶體位置綁在一起……
```

**規則**:
- 副檔名 `.mdx`(不是 `.md`)。
- MDX 內 JSX **必須 block-only**:component 自成一個區塊,前後留空行。inline JSX 在段落中是 anti-pattern,由 validation 警告。
- Component 透過 **MDXProvider auto-import**,user 不需要寫 `import` — engine 在 build 時把全域 + 章節 local components 注入 MDX scope(細節見 §6.3)。
- Chapter prose 本身**不需要 frontmatter**;若要可選 metadata,只允許 `title` / `slug` / `hidden`(暫時藏起來)三個欄位。
- 章節歸屬、tone 等資訊由所在資料夾的 `chapter.tsx` 提供(見 §3.3),不寫在每個 prose 檔的 frontmatter 內。

### 3.3 Chapter metadata + opener — `chapters/<id>/chapter.tsx`

每個章節資料夾**可選**有一份 `chapter.tsx`,export 兩個 named:

```tsx
// chapters/04-linked-list/chapter.tsx
import { ChapterOpener } from '@/components';

export const meta = {
  slug: 'linked-list',
  title: 'CH4 Linked List',
  tone: 'lavender',
};

export const opener = (
  <ChapterOpener
    slug={meta.slug}
    title={meta.title}
    subtitle="用 node 與 pointer 建立可變長度的線性結構"
    summary="先建立 Linked List 的心智模型……"
    tone={meta.tone}
    visual="linked-list"
  />
);
```

**三種章節狀態**:

```tsx
// 1. 完整 — 有 opener page + chapter context propagation
export const meta = { slug: 'linked-list', title: 'CH4', tone: 'lavender' };
export const opener = (
  <ChapterOpener slug="linked-list" title="CH4" tone="lavender" summary="..." />
);

// 2. 只有 meta(沒 opener page,但要 tone propagation 到 Page.tsx)
export const meta = { slug: 'tree', title: '第五章 Tree', tone: 'mint' };
// 沒有 export opener

// 3. 連 chapter.tsx 都沒有
//    engine 從資料夾名 04-linked-list 推 slug = 'linked-list'
//    tone undefined,沒 opener page
```

**規則**:
- `meta.slug` 是必填(若 chapter.tsx 存在);若無 chapter.tsx,engine 從資料夾名 prefix-strip 推 slug
- `meta.tone` 可選,會 propagate 到該章所有 `<Page>` 的 `chapterTone` prop(見 §6.2)
- `opener` JSX export 可選 — 缺則無 opener page
- ChapterOpener 是跨章節共用的 component(住 `document/components/`),用 props 帶不同章節資料 — 視覺一致性自然達成

### 3.4 Components — Single `.tsx` file

```tsx
// document/components/Cover.tsx
import { BaseCoverPage } from '@qdoc/core';

interface CoverProps {
  title: string;
  subtitle?: string;
  tagline?: string;
  organization?: string;
  hero?: string;
}

export default function Cover({
  title,
  subtitle,
  tagline,
  organization,
  hero,
}: CoverProps) {
  return (
    <BaseCoverPage>
      {hero && <img className="cover-hero" src={hero} alt="" />}
      <header className="cover-meta">
        {organization && <span>{organization}</span>}
      </header>
      <div className="cover-main">
        <h1 className="cover-title">{title}</h1>
        {tagline && <p className="cover-tagline">{tagline}</p>}
        {subtitle && <p className="cover-subtitle">{subtitle}</p>}
      </div>
    </BaseCoverPage>
  );
}
```

**規則**:
- **One file per component**(集中,不是 folder)。
- Default export 是 component;命名 export 是 props type / 子元件。
- Style 可以同檔內聯(CSS-in-JS / style attribute)或外部 `.css`(用 `@/components/foo.css` 引用)。
- 沒有 `data.json` / `schema.json` / `README.md` 副檔案。props 從 TypeScript interface 即可獲得 schema(engine 用 TS compiler API 提取)。

### 3.5 Agent context — `AGENTS.md` + `document/memory/`

**`AGENTS.md`** 在 workspace root,是跨工具事實標準(OpenAI Codex / Cursor / Claude Code / Copilot CLI 都 fetch 此檔)。內容是**規則**:

```md
# AGENTS.md

This is a QDoc document workspace.

## Before editing
1. Read `document/memory/USER.md`, `PROJECT.md`, `FEEDBACK.md` if present
2. Read `document/design.md` for visual rules

## Hard rules
- Do not modify `package.json`, `tsconfig.json`, `node_modules/`
- Do not import from outside `@qdoc/core` and `@/components`
- All prose edits live in `document/chapters/<chapter>/content/*.mdx`
- All component implementations live in `document/components/*.tsx` 或 chapter-local
- Run `qdoc validate` before committing
```

**`document/memory/`** 是可選的細分 context folder:

| 檔案 / 資料夾 | 性質 | 寫什麼 | 觸發時機 |
|---|---|---|---|
| `USER.md` | 純文字 | user role、偏好、技術背景 | learn 一次,跨 session reuse |
| `PROJECT.md` | 純文字 | 文件目前狀態、deadline、stakeholder | 章節進度、版本決定 |
| `FEEDBACK.md` | 純文字 | user 給的修正方向 | 避免重犯同錯 |
| `REFERENCES.md` | **索引** | 列出每份參考材料、purpose、影響哪些章節 | 編輯前 scan 看有沒有相關 reference |
| `references/` | **資料夾** | 實際 PDF / markdown 摘錄 / blog 截錄 | AI 寫對應章節時 deep read |

**`references/` 結構建議**(按來源組織):

```
memory/references/
  teacher-a/
    data-structures-2024.pdf
    linked-list-ch4.md             ← user 自己摘錄的重點
  mit-6.006/
    lec5-linked-list-notes.md
    lec7-tree-notes.md
  clrs-3rd/
    ch10-elementary.md
  open-sources/
    blog-post-tree-traversal.md
```

`REFERENCES.md` 為每份資料寫:**file path / origin / what borrowed / influences 哪些章節 / 法律限制(可否分享)**。

**為何 references/ 對 AI 有價值**:
- AI 改 `chapters/05-tree/02-traversal.mdx` 前,先讀 REFERENCES.md → 發現 MIT 6.006 有 tree traversal 筆記 → deep read 那份 → 改寫時跟權威來源對齊
- 沒有 references folder 時 AI 只能憑訓練 data 記憶,可能版本錯、跟你筆記其他章不一致

**Gitignore**:
- 預設 `references/` 進 git(版本控制有助於跨機器同步)
- 個別不可分享的版權材料 → 寫進 `references/.gitignore`

**規則**:
- `AGENTS.md` 必備
- `memory/` 可選(skill scaffold 預設提供空殼,user 可全刪)
- Engine 不 compile / process memory(純文檔 + 任意檔案)
- `qdoc validate` 可警告:有 `memory/` folder 但缺主要檔案

### 3.6 `'use client'` for hydration

預設所有 component 都是 SSR-only。若需要 client-side interactivity,在 component 頂部加 React 標準 `'use client'`:

```tsx
// document/components/InteractiveBST.tsx
'use client';

import { useState } from 'react';
import { BaseFigure } from '@qdoc/core';

export default function InteractiveBST({ initialNodes }) {
  const [nodes, setNodes] = useState(initialNodes);
  // ... interactive logic
  return <BaseFigure>{/* draggable tree */}</BaseFigure>;
}
```

Engine 偵測 `'use client'` 標記 → 把該 component 從 SSR-only bundle 分到 client bundle → reader 在執行時 hydrate 它。其他 component 仍 SSR-only,不送 React 到 client。

---

## 4. MDX engine pipeline(統一)

**單一 compile path** for dev + build:

```
.mdx file
   │
   ├─ @mdx-js/mdx compile
   │      ↓ MDX AST(remark + rehype)
   │      ↓ apply MDXProvider(注入 document/components 的 default exports)
   │      ↓
   │   React component(JSX tree)
   │
   ├─ React SSR via renderToString
   │      ↓
   │   HTML string + collected data attributes(chapter slug、tone、page index)
   │
   ├─ Pagination(see §5)
   │      ↓
   │   分頁後的 HTML page blocks
   │
   ├─ Static export → public/qdoc/document.json
   └─ Reader runtime 讀 document.json 顯示
```

Dev 跟 build 走**同一條 pipeline**,差別只在:
- Dev 時 Vite 監視檔案變化,re-compile + re-render
- Build 時一次性產出 + 寫盤

**為何統一**:double-pipeline 是 open-slide 的痛點之一(dev 跟 build 結果可能不同)。統一可以保證「dev 看到的就是 prod 看到的」。

---

## 5. Pagination 走 React tree

**現狀**(string-based):
1. Markdown → HTML string
2. `engine/pagination.ts` 對 string 做 regex / DOM-parse / 拆分
3. 輸出 HTML page blocks

**新版**(tree-based):
1. MDX → React tree
2. React SSR 一次到 DOM(JSDOM 或瀏覽器測量)
3. Pagination 在 React tree 層級拆分,**但用 DOM 測量決定 break point**
4. 每個 page = React subtree,個別 SSR

具體流程(草案):

```
React tree (from MDX)
   │
   ├─ SSR to DOM(JSDOM with theme tokens applied)
   │      ↓ measure: 每個 block 元素的 height, 累積高度
   │      ↓ find break points: 累積高度超過 page-safe-area 時切
   │      ↓ identify break boundaries:必須對齊 React component 邊界
   │              (不能把一個 <NodeDiagram> 對半切;break-inside: avoid 規則)
   │
   ├─ 把 React tree 依 break points 拆成 N 個 subtree
   │      每個 subtree 包進 <BaseReportPage pageIndex={i}>
   │
   └─ 對每個 subtree 重新 SSR 成獨立 page block
```

**為何 tree-based 對**:
- 不需要 regex parse HTML(現在 `pagination.ts` 對 PRE tag 拆分的 regex 已經很脆)
- 元件邊界乾淨(`<NodeDiagram>` 永遠是一個 unit,不會 mid-component 切)
- `break-inside: avoid` 規則跟 React 元件邊界對齊
- 元件可以 export 自己的 `pagination policy`(例如 `<LongList itemsPerPage={10}>`)

**測量階段仍需要 DOM**(JSDOM 或真實瀏覽器),因為文字高度只能用真實 rendering 算。但**拆分階段操作 React tree**,不是 HTML string。

---

## 6. 元件解析與 dispatch

### 6.1 Dispatch 模型

整個架構沒有 frontmatter-based 的 `kind` / `component` 對應機制。所有元件呼叫都是**直接 JSX**:

- shell:`document/index.tsx` 內 named exports `cover` / `toc` / `backCover` 是 JSX elements
- chapter opener:`chapter.tsx` 內 `opener` named export 是 JSX element
- chapter prose:`.mdx` 內元件直接 JSX(透過 auto-imports,§6.3)
- 一般 chapter page:由 engine 自動 wrap 進 `Page.tsx`(唯一的 implicit dispatch)

Engine 內部 implicit 對應只剩兩個:

| 場景 | Implicit |
|---|---|
| 章節 prose pagination 後的每一頁 | engine 自動 wrap `Page.tsx`(找 `document/components/Page.tsx`) |
| 章節資料夾名 → slug | 沒 `chapter.tsx` 時,engine 從 `chapters/<NN-slug>/` 推 slug |

**罕見:某個 chapter 想要不同 Page wrapper**(例如附錄章用不同 footer 樣式):

```tsx
// chapters/99-appendix/chapter.tsx
import { AppendixPage } from '@/components';

export const meta = { slug: 'appendix', title: '附錄', pageComponent: 'AppendixPage' };
```

Engine 看到 `meta.pageComponent` → 該章 chapter 用 `AppendixPage.tsx` wrap,不用全域的 `Page.tsx`。

### 6.2 `Page.tsx` 的角色(chapter prose 頁 wrapper)

對 chapter `.mdx` pagination 完之後,engine 把每個分頁 subtree 包進 `Page.tsx`。`Page.tsx` 控制**頁面 chrome**(header / footer / 頁碼 / running info),內容(`{children}`)由 pagination 注入。

```tsx
// document/components/Page.tsx
import { BaseReportPage } from '@qdoc/core';
import type { PageProps } from '@qdoc/core';

export default function Page({
  pageIndex,
  totalPages,
  chapterSlug,
  chapterTone,
  children,
}: PageProps) {
  return (
    <BaseReportPage
      pageIndex={pageIndex}
      totalPages={totalPages}
      runningHeader="資料結構筆記"
      footerLeft={`${pageIndex + 1} / ${totalPages}`}
      footerRight={chapterSlug}
      data-chapter-tone={chapterTone}
    >
      {children}
    </BaseReportPage>
  );
}
```

**Engine 注入的 props**(`PageProps` interface):
- `pageIndex: number` — 0-based 全文件頁碼
- `totalPages: number`
- `chapterSlug?: string` — 該頁所屬章節(從該章 `chapter.tsx` 的 `meta` export 傳遞;若無 chapter.tsx 則從資料夾名推斷)
- `chapterTone?: string` — 同上,來自 `meta.tone`
- `children: ReactNode` — pagination 後的 mdx subtree

User 可自由決定:
- 要不要顯示 running header / 哪一行字
- 頁碼格式(`1 / 80` vs `第 1 頁`)
- 偶數頁奇數頁不同 layout(`pageIndex % 2`)
- 章節間是否插入小章節標(用 `chapterSlug` 判斷)

### 6.3 MDX auto-imports(章節 scope 化)

每個 chapter 的 `.mdx` 檔有兩層 component scope:

1. **本章 components**:`chapters/<slug>/components/*.tsx`(僅本章可見)
2. **全域 components**:`document/components/*.tsx`(全文件可見)

Engine 為每個 chapter 生成獨立的 MDXProvider:

```tsx
// engine 內部生成(每個章節獨立)
const chapterComponents = await import.meta.glob(
  `@workspace/chapters/<slug>/components/*.tsx`,
  { eager: true }
);
const globalComponents = await import.meta.glob(
  '@workspace/components/*.tsx',
  { eager: true }
);

// chapter-local override global
const merged = { ...byFilename(globalComponents), ...byFilename(chapterComponents) };

<MDXProvider components={merged}>
  {/* 該章節的 mdx 在這之內 evaluate */}
</MDXProvider>
```

**規則**:
- 檔名即元件名(`NodeDiagram.tsx` → `<NodeDiagram>`)
- 一個 `.tsx` 檔一個 default export
- 章節 local 元件 shadow 全域同名元件(命名衝突採 local 優先)
- 命名 export(子元件)只在同檔內可見
- 不支援 plug-in 第三方 npm component(MVP);要用就先 user 自己 wrap 進 `document/components/`

### 6.4 章節 scoped CSS

`chapters/<slug>/styles/*.css` 自動 prefix 到 `[data-chapter-slug="<slug>"]`:

User 寫:
```css
/* chapters/04-linked-list/styles/chapter.css */
h2 {
  color: var(--qd-chapter-accent-lavender);
  border-bottom: 1px solid currentColor;
}

.callout {
  background: oklch(95% 0.02 280);
}
```

Engine build 時(PostCSS 或 native `@scope`)轉成:
```css
[data-chapter-slug="linked-list"] h2 { ... }
[data-chapter-slug="linked-list"] .callout { ... }
```

User 完全不用想 scope selector,直接寫一般選擇器。`<Page>` wrap chapter content 時帶 `data-chapter-slug` attribute,CSS 自然套用。

### 6.5 衝突處理

- `document/components/Foo.tsx` 跟 `document/components/Bar.tsx` 都 default export `Foo` → engine 用檔名 = `Foo` vs `Bar`,沒衝突。
- 同檔名不可能(filesystem 限制)。

---

## 7. Style pack 定位(scaffold-only)

### 7.1 Pack 是 skill scaffolder,不是 npm dep

```
skills/<pack-name>/
  SKILL.md
  starter/
    package.json
    tsconfig.json
    AGENTS.md                             ← starter 規則 template
    document/
      index.tsx                           ← config + shell JSX exports(範例值)
      design.md
      memory/                             ← 空殼,user init 後填
        USER.md
        PROJECT.md
        FEEDBACK.md
        REFERENCES.md
        references/
          .gitkeep
      theme/
      tokens.css
      base/
      patterns/
      fonts.css
      fonts/
    components/
      Cover.tsx
      Toc.tsx
      ChapterOpener.tsx
      Page.tsx                            ← 必備 — chapter prose 包這個
      BackCover.tsx
      (pack 想預設給的其他 components,如 TypeSpecimen)
    media/
    chapters/                             ← 範例章節
      01-sample/
        chapter.tsx
        content/
          01-intro.mdx
        components/
        media/
        styles/
```

`skill init <pack-name> .` 把 `starter/` 整個複製到 user 的 workspace,**之後 pack 消失在 user 的世界**。

### 7.2 Pack 升級不回頭動 document

- Pack 是 ship 的 skill,版本獨立
- Document 一旦 init,所有檔案歸 user 所有
- Skill 升級後,新文件用新版,舊文件不變
- 想拿新版的某個 component → user 手動 copy,自負 conflict 整合

### 7.3 跨 pack 怎麼混

- 一份 document 一個 pack(init time 決定)
- 後續想拿另一個 pack 的 component → user 從 `skills/<other-pack>/starter/components/X.tsx` 手動複製到 `document/components/X.tsx`
- 沒有 import path 衝突,因為都是 user-owned 檔案

---

## 8. Migration(從現狀切換)

產品還沒公告,**沒有過渡期**。一次性 cutover + codemod。

### 8.1 Codemod

`qdoc migrate-to-react .` CLI 命令做:

| 現有 | 轉成 |
|---|---|
| `qdoc.config.mjs` | 抽出欄位寫進 `document/index.tsx` 的 `config` export |
| `document/content/00-cover.md`(HTML body) | 在 `document/index.tsx` 新增 `cover` named export(`<Cover ... />`),HTML body 內的字串欄位抽成 props |
| `document/content/99-back-cover.md` | 在 `document/index.tsx` 新增 `backCover` named export(`<BackCover ... />`) |
| `document/content/01-toc.md` | 在 `document/index.tsx` 新增 `toc` named export(`<Toc ... />`) |
| `document/content/02-ch4-linked-list-opener.md` | `document/chapters/04-linked-list/chapter.tsx`(`meta` + `opener` named exports) |
| `document/content/03-list-and-node.md` | `document/chapters/04-linked-list/content/01-list-and-node.mdx`;`<qdoc-component name="X" data='{...}' />` 轉成 `<X {...props} />` |
| `document/components/<name>/component.mjs`(render function) | `document/components/<Name>.tsx`(React component);若該 component 只被一個章節用到,可選擇移到 `chapters/<slug>/components/<Name>.tsx` |
| `document/components/<name>/data.json` | 拆給每個使用該 component 的 mdx 處,變成 JSX props(inline)或留 `data.json` 在 chapter media |
| `document/components/<name>/style.css` | inline 進 component `.tsx` 或留在同檔 css(由 component import) |
| `document/components/<name>/schema.json` | 移除 — TS interface 取代 |
| `document/media/` | 跨章節仍用的 → 留 `document/media/`;只給單章用的 → 搬到 `chapters/<slug>/media/` |
| `document/design-system/` | 已合併到 `document/design.md`,無需動 |
| (新增)workspace root | 加 `AGENTS.md`、`document/memory/`(可選),`tsconfig.json` extends `@qdoc/core` base |

### 8.2 手動補正

Codemod 處理 70-80%,剩下:
- HTML cover/back-cover 內的客製 markup → user 手動抽到 `Cover.tsx` / `BackCover.tsx` 的 JSX
- 跨章節 vs 章節 local component 的決定(codemod 預設留在 `document/components/`,user 評估是否搬到 chapter-local)
- 跨章節 vs 章節 local media 的決定(codemod 預設留在 `document/media/`,user 評估是否搬到 chapter-local)
- 章節資料夾分組 → user 決定 flat content/ 內哪些檔案應該歸到哪個 chapter folder
- `AGENTS.md` 內容 — codemod 從現有 `AGENTS.md` 複製,user 補充新架構規則

### 8.3 工作量估算

- @qdoc/core 抽出 + npm publish 流程:**3-4 週**
- BaseX primitives 設計 + 實作:**1-2 週**
- MDX pipeline + auto-imports:**1 週**
- React tree pagination:**3-4 週**(最大風險點)
- Codemod + migration 工具:**1 週**
- skill scaffolder 重寫:**3-5 天**
- 文件 / SKILL.md 更新:**3-5 天**
- 對現有 dogfood document migration + QA:**1 週**

**總計約 2.5-3 個月**(單人全職)。

---

## 9. 開放議題(下一輪要解)

1. **Theme tokens 從 CSS variable 還是 TS const 提供?**
   - CSS var 跟現在一致,但 React component 想 read 要 inline-style or hook
   - TS const 對 component 友善,但 print/PDF 還是要轉成 CSS var

2. **`'use client'` component 在 PDF/print 怎麼處理?**
   - PDF 不可能執行 client React → 那 use client 的 component 在 PDF 顯示 SSR 結果(預設 state)? 還是用 placeholder?

3. **JSDOM 量測 vs 真實瀏覽器量測?**
   - JSDOM 不支援完整 layout(沒有真正的 font metrics)
   - 真實瀏覽器(Puppeteer / Playwright headless)精確但慢
   - dev 跟 build 用同一個?

4. **`document/components/<Name>.tsx` 還是支援子 module?**
   - 例如 `NodeDiagram` 拆成 `NodeDiagram.tsx` + `NodeShape.tsx`(內部 import)
   - 如果禁止,所有 helper 必須 inline 在同檔(open-slide 風格)
   - 如果允許,需要規則(只能 import 同層、不能跨層)

5. **MDX validation 時機**
   - 在 compile 時就 lint block-only?
   - 或留到 `qdoc validate` 才檢查?

6. **Inspector + apply-comments(從 open-slide 偷的 UX)是 v1 還是 v2?**
   - 強烈想要,但會吃 3-4 週工作量。建議 v2 phase。

7. **目前 reader runtime 的 view-mode toggle / scroll-snap / IO 設計需不需要因為這次架構改而調整?**
   - 預期不需要 — reader 吃的是 HTML page block,跟 source format 解耦。確認即可。

---

## 10. 不變的部分(明確列出來避免誤解)

下列現有機制**不在此 spec 範圍**內,維持原樣:

- Reader runtime(scroll-snap, IntersectionObserver, useQDocReaderRuntime)
- PDF print route(`@page` + print-color-adjust)
- iPad bookmark navigation race fixes
- Public viewer 的 cover / drawer / FAB / scrim 結構
- `qdoc validate` / `qdoc render` CLI(內部 impl 改寫,介面不變)
- Deploy adapter(Cloudflare Pages 等)
- Skill 系統(只有內容更新,機制不變)

---

## Decisions captured this round(快速 recap)

| Decision | Choice | Confidence |
|---|---|---|
| 文件 entry | `document/index.tsx` — `config` + `cover` / `toc` / `backCover` named exports(合併原 `qdoc.config.mjs` + shell) | High |
| 文件 metadata 型別 | `QDocManifest` interface from `@qdoc/core`,目錄路徑走 convention,可在 `config.paths` override | High |
| Chapter 結構 | 每章自包資料夾 `chapters/<NN-slug>/{chapter.tsx, content/, components/, media/, styles/}` | High |
| Chapter ordering | folder name prefix(`04-` `05-`) | High |
| Chapter opener | 從 `chapter.tsx` export `opener`(JSX element)— 可選 | High |
| Chapter metadata 來源 | `chapter.tsx` 的 `meta` named export(slug / title / tone);若無 chapter.tsx,engine 從資料夾名推 slug | High |
| Chapter prose format | `.mdx` with auto-imported components,沒 dispatch-related frontmatter | High |
| Inline JSX in prose | block-only rule(validation 警告) | High |
| Component format | single `.tsx` file per component;default export 是 component | High |
| Component primitives | `@qdoc/core` exports BaseX(BasePage, BaseCoverPage, BaseFigure 等),MVP 從小集合開始 | High |
| 主要 component 命名 | `Cover` / `Toc` / `ChapterOpener` / `Page` / `BackCover`(無 `Default` prefix) | High |
| Chapter-local component scope | `chapters/<slug>/components/*.tsx` 覆蓋全域同名元件 | High |
| Chapter-scoped CSS | `chapters/<slug>/styles/*.css` engine 自動 prefix `[data-chapter-slug="<slug>"]` | High |
| `Page.tsx` 角色 | 每個 chapter prose 頁的 chrome wrapper,engine 注入 `chapterSlug` / `chapterTone` / `pageIndex` / `totalPages` 等 props | High |
| 元件 dispatch | 沒有 frontmatter `kind` / `component` 機制;全部 JSX 直接指名 | High |
| 領域元件位置 | 章節專屬放 `chapters/<slug>/components/`;跨章節共用放 `document/components/`;不放 core / pack | High |
| Agent context | workspace root `AGENTS.md`(必備) + 可選 `document/memory/{USER,PROJECT,FEEDBACK,REFERENCES}.md` + `memory/references/` 實際參考資料夾 | High |
| Style pack | scaffold-only(skill init 複製到 document/),**不是 npm dep**,init 後 user 完全自主 | High |
| MDX engine pipeline | 統一 dev + build,單一 compile path | High |
| Pagination | walks React tree(DOM 測量決定 break point,React tree 層級拆分) | High |
| SSR vs hydration | 預設 SSR-only,component 頂部 `'use client'` opt-in 變 client component | High |
| Migration | hard cutover + `qdoc migrate-to-react` codemod,無過渡期(產品未公告) | High |
| Style pack 命名(本份文件用的 pack) | 暫定,後續重新規劃 | Low |

---

## Appendix A: 跟現狀對照

| 領域 | 現狀 | 新架構 |
|---|---|---|
| Markdown pipeline | `engine/markdown-renderer.mjs`(markdown-it + custom rules) | `@qdoc/core/mdx-compile`(@mdx-js/mdx + remark/rehype plugins) |
| Component 渲染 | `engine/component-renderer.mjs`(render function → HTML string) | React component + SSR via `renderToString` |
| Pagination | `engine/pagination.ts`(HTML string surgery) | React tree pagination + DOM measure |
| 元件呼叫語法 | `<qdoc-component name="X" data='{...}' />` | `<X {...props} />` in MDX(JSX 直接) |
| Component 物理結構 | `document/components/<name>/{component.mjs, data.json, schema.json, style.css}` | `document/components/<Name>.tsx`(props 從 TS interface 取得) |
| 文件 entry / config | `qdoc.config.mjs`(workspace root) | `document/index.tsx`(config + shell JSX exports) |
| Cover / TOC / Back-cover | `document/content/{00-cover, 01-toc, 99-back-cover}.md`(HTML body 自寫) | `document/index.tsx` 內 `cover` / `toc` / `backCover` named JSX exports |
| Chapter opener | `document/content/02-ch4-linked-list-opener.md`(frontmatter) | `chapters/<slug>/chapter.tsx` 的 `opener` named export(JSX) |
| 章節組織 | flat `document/content/*.md`,檔名 prefix 排序 | `document/chapters/<NN-slug>/` 自包資料夾 |
| 章節 metadata 傳遞 | 無正式機制(靠檔名跟 frontmatter 推) | `chapter.tsx` 的 `meta` named export,engine propagate 到該章每個 `<Page>` |
| Design 文件 | `document/design.md`(已是單檔) | 不變,仍是 `document/design.md` |
| Agent context | workspace root `AGENTS.md`(已有) | 不變 + 新增可選 `document/memory/{USER,PROJECT,FEEDBACK,REFERENCES}.md` + `memory/references/` |
| 元件 dispatch | 字串 attribute `name="X"`,engine 找 `document/components/X/component.mjs` | JSX 直接指名,MDX auto-imports 從 `document/components/` + chapter-local `components/` 注入 scope |
| Reader runtime | React + Vite(現在的 src/qdoc) | 不變(架構獨立於 source format) |
| Workspace shape | framework repo root = workspace,engine/ + src/ 跟 user document 混在一起 | `@qdoc/core` 抽 npm package,user workspace 只有 `package.json` + `tsconfig.json` + `AGENTS.md` + `document/` |

---

## Appendix B: 下一份 spec 要寫的內容

當這份 v1 design 通過 review,接著要寫的:

1. **`engine-core-package-extraction.md`** — 怎麼把 engine/ + src/qdoc/ 從這個 repo 抽出去成 `@qdoc/core` npm 套件
2. **`base-primitives-api.md`** — BasePage / BaseFigure 等的 props interface 完整定義 + 用法範例
3. **`mdx-pipeline.md`** — MDX compile / SSR / pagination 的具體實作步驟
4. **`react-tree-pagination.md`** — pagination 演算法 + 測量策略
5. **`migration-codemod.md`** — 現有 document 怎麼自動轉到新格式
