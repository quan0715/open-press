# open-press React Architecture — v1 Design Record

**Status:** Draft v1 — 部分已實作(engine/react/ 大致就位),部分 supersede 由 `2026-05-21-open-press-template-and-skill-init.md`
**Date:** 2026-05-20
**Scope:** 整體架構從「Markdown + custom-element tag + folder-of-mjs component」轉到「MDX + React component tree + BaseX primitive 繼承體系」
**Owner:** quan
**Related:** 之前的 sessions(reader runtime rewrite, design-system flatten, chapter-opener visuals)。本文件記錄未來方向,不取代現有實作。

> **Supersede note**:本 spec 原本假設 framework 以 npm 套件(`@qdoc/core`)分發。後續 spec `2026-05-21-open-press-template-and-skill-init.md` 改走 **template + SKILL** 模式 — framework 以 `core/` 資料夾形式存在於 user workspace 內,沒 npm publish。
>
> 本 spec 內所有 `@/core` 字眼即為 user workspace 內的 `core/` 資料夾(透過 tsconfig path alias `@/*` → `./*`),不是 npm 套件名。
>
> 品牌名亦從 `open-press` 改為 **open-press**,但本 spec 仍保留部分舊用語(會在 migration 階段一次性掃過)。

---

## 1. 為什麼動

四個 driver:

1. **AI 編輯 shell 頁面錯誤率高** — cover / opener / back-cover 是「填空到固定 layout」,markdown 內混 HTML 是錯的抽象,AI 寫的時候會壞 class 結構。
2. **`<qdoc-component name="..." />` 的 props 語法受限** — 複雜資料只能塞字串,JSON escape / 中文 / 巢狀都痛。
3. **想藏 Vite/React/tsconfig 在 `core/` 裡**(從 open-slide 學到),user workspace 只剩 `document/` + `package.json` + thin config files。
4. **想推 per-chapter 資料夾結構**,連帶要重新整理 page kind 跟元件繼承的關係。

---

## 2. 三層架構

```
Layer 1: core/(workspace 內 framework folder,read-only — 升級時 SKILL overwrite)
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
    package.json                          ← user 擁有;deps 列 transitive(MDX / React / Vite / Tailwind 等)
    tsconfig.json                         ← user 擁有;extends "./core/tsconfig.base.json"
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
import type { QDocManifest } from '@/core';
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
1. 啟動內建 TS compiler(已包在 `@/core` 內)
2. Compile `document/index.tsx`
3. Module import — **注意:top-level code 會執行**
4. Read `config` export 拿到設定
5. Read `cover` / `toc` / `backCover` JSX elements(JSX 本身是 data,不執行 SSR)
6. 進入 build / dev pipeline

對 user 透明,但 engine 從 `.mjs` config 轉成 `.tsx` 進入點。

**重要約定:`document/index.tsx` 不能有 side effects**

由於 module import 本身會 execute top-level code,這個檔案必須遵守:

| 禁止 | 原因 |
|---|---|
| `console.log(...)` | bootstrap 時噴雜訊 |
| Network 呼叫(`fetch(...)`)在 top level | 建構時打 network,build 不可重現 |
| File I/O(`fs.readFile(...)`)在 top level | 同上,還可能拖慢 build |
| 有 side effect 的 import(`import './polyfill'`) | 隱性執行,難偵錯 |
| 條件分支讀環境變數改 config 結構 | 同樣的 source 在不同環境產生不同 spec,違反 deterministic build |

**這個檔案是 trusted local code**,僅作為純資料/JSX 宣告。`qdoc validate` 會 lint:

- AST 掃描 top level statements
- 只允許 `import` / `export const` / `export type` / type definitions
- 任何 `console.*` / `fetch` / `fs.*` / 條件分支 export 都報錯

User 想動態決定 config(例:讀 `process.env.DEPLOY_TARGET`)→ 透過 build CLI flag(`qdoc build --target=prod`)由 engine 接收,不在 `index.tsx` 內讀。

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

### 3.4 Components — Folder per component(小元件可單檔)

兩種形式並存,engine 自動識別:

**形式 A:單檔**(小元件,< 200 行)

```tsx
// document/components/Cover.tsx
import { BaseCoverPage } from '@/core';

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
      {hero && (
        <img className="absolute inset-0 w-full h-full object-cover" src={hero} alt="" />
      )}
      <div className="relative h-full flex flex-col justify-end p-8">
        {organization && (
          <span className="font-mono text-xs uppercase tracking-widest text-document/70 mb-4">
            {organization}
          </span>
        )}
        <h1 className="font-serif text-7xl font-light text-document leading-none">
          {title}
        </h1>
        {tagline && (
          <p className="mt-3 font-mono text-sm uppercase tracking-widest text-document/80">
            {tagline}
          </p>
        )}
        {subtitle && (
          <p className="mt-2 font-body text-lg text-document/85">
            {subtitle}
          </p>
        )}
      </div>
    </BaseCoverPage>
  );
}
```

**形式 B:資料夾**(複雜元件,~300 行以上 OR 有 sub-components)

```
document/components/NodeDiagram/
  index.tsx                  ← main component,export default,被 MDX auto-import
  NodeShape.tsx              ← sub-component(只被本元件 import)
  PointerArrow.tsx
  utils.ts                   ← layout 計算等 helper
  style.css                  ← 若 Tailwind 不夠用(如 keyframes),可附 CSS
```

`index.tsx` 範例:
```tsx
// document/components/NodeDiagram/index.tsx
import { BaseFigure } from '@/core';
import { NodeShape } from './NodeShape';
import { PointerArrow } from './PointerArrow';
import { computeLayout } from './utils';

interface NodeDiagramProps {
  nodes: Array<{ id: string; value: string }>;
  links?: Array<{ from: string; to: string }>;
  highlight?: string;
  caption?: string;
}

export default function NodeDiagram({ nodes, links, highlight, caption }: NodeDiagramProps) {
  const layout = computeLayout(nodes);
  return (
    <BaseFigure caption={caption}>
      <svg viewBox="0 0 800 200" className="w-full">
        {layout.map((n) => (
          <NodeShape key={n.id} {...n} highlighted={highlight === n.id} />
        ))}
        {links?.map((l) => <PointerArrow key={`${l.from}-${l.to}`} {...l} />)}
      </svg>
    </BaseFigure>
  );
}
```

**規則**:
- Default export 是 component
- 命名 export 是 props type / 子元件(但不會被 MDX auto-import,只能同層 import)
- MDX 透過 default export 解析 component(`<NodeDiagram>` → `document/components/NodeDiagram/index.tsx` 或 `document/components/NodeDiagram.tsx`)
- Style:Tailwind class 為主(`text-ink`、`flex`、`mb-4` 等),少數需 CSS 的(keyframes)放同層 `.css` 檔
- 沒有 `data.json` / `schema.json` / `README.md` 副檔案;props 從 TypeScript interface 即可獲得 schema(engine 用 TS compiler API 提取)
- **Cross-component import 禁止讀別人的 sub-component**:`LinkedListVisual/index.tsx` 不能 import `NodeDiagram/NodeShape`,只能 import `NodeDiagram`(public default export);engine 在 build 時 lint 違規

### 3.5 Agent context — `AGENTS.md` + `document/memory/`

**`AGENTS.md`** 在 workspace root,是跨工具事實標準(OpenAI Codex / Cursor / Claude Code / Copilot CLI 都 fetch 此檔)。內容是**規則**:

```md
# AGENTS.md

This is a open-press document workspace.

## Before editing
1. Read `document/memory/USER.md`, `PROJECT.md`, `FEEDBACK.md` if present
2. Read `document/design.md` for visual rules

## Hard rules
- Do not modify `package.json`, `tsconfig.json`, `node_modules/`
- Do not import from outside `@/core` and `@/components`
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
import { BaseFigure } from '@/core';

export default function InteractiveBST({ initialNodes }) {
  const [nodes, setNodes] = useState(initialNodes);
  // ... interactive logic
  return <BaseFigure>{/* draggable tree */}</BaseFigure>;
}
```

Engine 偵測 `'use client'` 標記 → 把該 component 從 SSR-only bundle 分到 client bundle → reader 在執行時 hydrate 它。其他 component 仍 SSR-only,不送 React 到 client。

---

## 4. Tailwind v4 整合

### 4.1 為什麼用 Tailwind v4

open-press 需要:
- 文件元件用 React + Tailwind class
- Theme tokens 給 React 跟 CSS 共用(per-chapter accent scope、dark/print 變體)
- Print/PDF 路徑不仰賴 JS evaluate
- TypeScript 型別安全

Tailwind v4 剛好同時解這四件事:
- **CSS-first config**(`@theme { --color-ink: ... }`)— token 用 CSS variable 表達
- **自動生 utility class**(`text-ink` `bg-document` `font-serif`)
- **自動生 TS 型別**(`@tailwindcss/typescript-plugin`)
- **`print:` prefix 內建**
- **per-chapter scope** 用標準 CSS cascade,Tailwind utility 自動跟著變

### 4.2 Token 寫在哪

```css
/* document/theme/tokens.css */
@import "tailwindcss";

@theme {
  /* Color tokens */
  --color-ink: #1F2D3D;
  --color-muted: #486581;
  --color-document: #FBFAF6;
  --color-accent: var(--qd-chapter-accent, var(--color-ink));

  /* Per-chapter accent palette */
  --color-lavender: #c598ff;
  --color-sage: #6f9f8a;
  --color-mint: #84ffae;
  --color-amber: #ffb000;

  /* Typography */
  --font-serif: 'Georgia', 'Noto Serif TC', serif;
  --font-body: 'Noto Sans TC', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing (mm scale 給 A4) */
  --spacing-1: 2mm;
  --spacing-2: 4mm;
  --spacing-3: 6mm;
  --spacing-4: 9mm;
  --spacing-5: 13mm;

  /* Page geometry */
  --width-page: 210mm;
  --height-page: 297mm;
}
```

Tailwind 看到 `@theme` 自動生:
- **CSS variables**:`--color-ink`、`--font-family-serif`、`--spacing-4` 等(在 `:root` scope,所有 component 可用 `var(--color-ink)` 或 `text-[var(--color-ink)]` 引用)
- **Utility class**:`text-ink`、`bg-document`、`font-serif`、`mb-4`、`w-page`
- **Editor IntelliSense**(Tailwind CSS IntelliSense VS Code 套件):class autocomplete / hover preview / 拼錯時 linting

> **沒有 importable TS token object**。Tailwind v4 預設**不**生 `tw.color.ink` 這種 JS module(無法 `import { tw } from 'tailwindcss'`)。如果 component 需要在 TS 端 read token(例如 D3 canvas / SVG generator 內動態算顏色),走兩條路:
> - 走 `getComputedStyle(el).getPropertyValue('--color-ink')`(runtime,反映 cascade)
> - `@/core` 自己 ship 一份 typed token module `import { tokens } from '@/core/tokens'` — 但這是 open-press 自己維護的副本,**會跟 Tailwind `@theme` drift**,只在 build-time canvas 等場景才用

### 4.3 Per-chapter accent 怎麼 work

```css
/* @/core 預定義 */
[data-chapter-tone="lavender"] {
  --color-accent: var(--color-lavender);
}
[data-chapter-tone="sage"] {
  --color-accent: var(--color-sage);
}
/* ... 其他 tone ... */
```

Component 寫:
```tsx
<h2 className="font-serif text-3xl text-accent border-b border-accent/30">
  Linked List 操作
</h2>
```

該章 wrap 在 `[data-chapter-tone="lavender"]` 內 → `--color-accent` 解析到 lavender → `text-accent` 跟 `border-accent/30` 自動是紫色。**Component 不知道章節 tone,純由 CSS cascade 處理**。

### 4.4 BaseX vs Tailwind class 的責任分工

| 層 | 用什麼 | 例 |
|---|---|---|
| **`@/core` BaseX 內部** | 純結構 + `data-*` attribute,**少量** Tailwind | `<section className="reader-page" data-kind={kind}>...</section>` |
| **Style pack scaffold / user component** | **Tailwind class 為主** | `<h1 className="font-serif text-7xl font-light text-document">{title}</h1>` |
| **Global typography**(`h1`, `h2`, `p`) | semantic CSS in `theme/base/*.css`,**不要 atomic 化** | `h2 { font-family: var(--font-serif); font-size: 26pt; ... }` |
| **Chapter-scoped CSS** | Tailwind `@apply` 或純 CSS,engine 自動加 prefix | `.step-callout { @apply rounded-lg border border-accent/30 ... }` |
| **Print** | Tailwind `print:` prefix | `<button className="print:hidden">下載 PDF</button>` |

**規則**:**typography 跟頁面結構走 cascade(semantic CSS),layout chrome 跟 component 視覺走 Tailwind**。混用模式而非二擇一。

### 4.5 @/core 提供 Tailwind preset

```ts
// @/core/tailwind-preset.ts
export default {
  theme: {
    extend: {
      // open-press 基礎 token defaults
      colors: { /* ... */ },
      fontFamily: { /* ... */ },
      spacing: { 'page': '210mm', /* ... */ },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@/core/tailwind-plugin'),  // open-press 專屬 utility(page-* 等)
  ],
};
```

User workspace `tailwind.config.ts`:
```ts
import openpressPreset from '@/core/tailwind-preset';

export default {
  presets: [openpressPreset],
  content: ['./document/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      // 此份文件的客製
    },
  },
};
```

### 4.6 Print purge gotcha

Tailwind 預設 purge 沒用到的 utility。**`print:` 跟 `break-inside-avoid` 等只在 PDF 路徑用到的 class**,如果 source 沒 mention 就會被誤刪。

解法:
- `content` config 把 PDF render 路徑用到的 component 也納入(已預設 `./document/**/*.{ts,tsx,mdx}`)
- `@/core` 的 BaseX 元件內**明確寫死**這些 class,確保 purge 不掉
- safelist 不建議用(會 dilute purge 效益),首選靠 source 包含

### 4.7 System 層 vs User document 層的 CSS 隔離

CSS / token / Tailwind 一律分兩層,不混:

| 層 | 由誰維護 | 範圍 | 設計系統 |
|---|---|---|---|
| **System 層** | `@/core` ship | Reader chrome(drawer / FAB / bookmark panel / scrim)+ Inspector overlay | `@/core` 自己的 token / class,user 不該動 |
| **User document 層** | user 在 `document/` 裡寫 | Cover / TOC / 章節內容 / 全域 components / chapter-local components | user 自己的 Tailwind v4 `@theme` + chapter-scoped 覆蓋 |

**隔離手段**:

1. **DOM 邊界**:engine 把 user document 渲染進 `<main data-qdoc-document>` root,system chrome(FAB、drawer、bookmark panel)在這個 root **外側**。Cascade 天然不互相污染。

2. **CSS variable 命名前綴不同**:
   - System 層用 `--qdc-*`(qdoc-core 縮寫,內部用)
   - User document 層用 `--color-*` / `--font-*` / `--spacing-*` 等 Tailwind v4 預設前綴
   - **沒有重名可能**

3. **Tailwind 是 user 專屬**:
   - `@/core` reader chrome 不靠 Tailwind utility,走 plain scoped CSS(class 已 prefix `qdoc-public-*` / `qdoc-reader-*`)
   - User 的 Tailwind `content` 只掃 `document/**/*.{ts,tsx,mdx}`,不掃 `core/`
   - User 的 utility class(`text-ink`、`bg-document`)在 `[data-qdoc-document]` 內生效,外面用了也沒效(因為 `--color-ink` 只在 document scope 內被 `@theme` 定義)

4. **Inspector 是 system 層**:
   - Inspector overlay (hover outline、FAB toggle) 用 `--qdc-*` token,跟 reader chrome 同套設計系統
   - 不吃 user 的 Tailwind / theme(避免 user 改 theme 把 inspector 染瞎)

5. **Per-chapter `@theme` 自動 prefix**:engine 把 `chapters/<slug>/styles/` 內的 `@theme {}` block 自動轉成 `[data-chapter-slug="<slug>"] { --color-*: ...; }`,只影響該章節內容,不外洩到 reader chrome 或其他章節。

**結論給 user**:你在 `document/` 內怎麼動 Tailwind / `@theme` / chapter styles 都不會打到 reader chrome,反過來 `@/core` 更新 reader chrome 也不會干涉你的設計系統。兩層是真正獨立的 design system,只透過 React props 跟 `[data-qdoc-document]` DOM boundary 連結。

---

## 5. MDX engine pipeline(統一)

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

**MDX compile path 統一**(MDX → React tree → SSR HTML):dev 跟 build 走同一份 compile 邏輯,確保 component 解析、auto-imports scope、chapter-scoped CSS、SSR 結果完全一致。

**Pagination 是分裂的兩段**(見 §6):
- **`qdoc dev`**:runtime CSS-only 量測,page break 為近似值
- **`qdoc build`**:Puppeteer 預分頁,deterministic 最終頁碼

**結論**:dev 跟 prod 看到的「內容 / 樣式 / component 結果」一致(MDX compile 統一);但 **dev 看到的「頁碼 / 哪個 break 在哪一頁」不是最終值**,只有 `qdoc build` 跑完才 lock。Reader UI 在 dev 模式要明標 "page numbers preview only — run `qdoc build` to lock"。

---

## 6. Pagination — Build-time Puppeteer

**現狀**(runtime, string-based):
1. Reader 載入時 `engine/pagination.ts` 在 browser 內 measure + regex parse + 拆分
2. 不同裝置 / 字型 metric 差異會造成**不同使用者看到不同的「page 5」**
3. 對「請翻到第 5 頁第二題」這種引用會失效

**新版**(build-time, tree-based,精準度為主):
1. Build 時啟動 Puppeteer headless Chromium
2. MDX → React tree → SSR HTML 進 A4 viewport
3. 等字型載入完(`document.fonts.ready`)
4. JS 在瀏覽器內測量每個 block 的 height,累積到超過 page-safe-area
5. 識別 break point(對齊 React component 邊界,figure 不切碎)
6. 把 React tree 拆成 N 個 subtree,各包進 `<Page>` SSR
7. 輸出 `document.json`,內含預分頁好的 page blocks

具體流程:

```
Build:
  MDX source
     │
     ├─ MDX compile + rehype-block-id plugin
     │      ↓ 每個 paginable block 注入 stable data-qdoc-block-id
     │      ↓ 同時 build blockId → MDAST node map
     │
     ├─ React tree (with data-qdoc-block-id on each block boundary)
     │
     ├─ 啟動 Puppeteer headless Chromium
     │   - viewport = A4 (210×297mm at 96dpi)
     │   - 載入 @/core base CSS + theme tokens + Tailwind output
     │   - 載入 web fonts,await document.fonts.ready
     │
     ├─ SSR React tree 進測量 container
     │      ↓ querySelectorAll('[data-qdoc-block-id]')
     │      ↓ 對每個 block 算 getBoundingClientRect().height
     │      ↓ 累積到超過 page-safe-area 時記下 break,回傳 { pageIndex, blockIds[] }[]
     │
     ├─ 拿 measurements + AST map,把 MDAST 切成 N 個 page subtree
     │      ↓ 走 AST level filter,不做 HTML string slicing
     │
     ├─ 每個 subtree wrap 進 <Page pageIndex={i} ...> 個別 SSR
     │
     └─ 寫進 document.json(block-id strip 掉,reader 不需要)

Reader 載入:
   └─ 直接消費 document.json 的 page blocks,不再做 runtime 測量

PDF:
   └─ 拿 document.json 的 page blocks → Chrome print engine 印出 → 跟 reader 完全一致
```

### 6.1 DOM ↔ React tree 的 block-id bridge

「SSR 進 DOM、量高度、拆 React tree」需要一條從 DOM node 對回 MDX AST / React tree 的橋。否則最後會退回 HTML string slicing(就是我們現在要拋棄的方案)。

**Protocol**(三個位置一條 id):

```
MDX AST node ──compile time──→  React element        ──SSR──→  DOM element
   (block id 生成)                (data-qdoc-block-id)         (attribute 仍在)
```

**1. Compile 時注入 block id**

MDX compile pipeline 加一個 rehype plugin,在每個 **paginable block boundary** 上 attach stable id:

```ts
// @/core/mdx/rehype-block-id.ts
function rehypeBlockId() {
  let counter = 0;
  return (tree, file) => {
    visit(tree, 'element', (node) => {
      if (isPaginableBlock(node)) {
        const id = `b-${file.basename}-${counter++}`;
        node.properties['data-qdoc-block-id'] = id;
      }
    });
  };
}
```

**Paginable block 定義**(MVP):
- block-level HTML element(`<p>`、`<h1>`-`<h6>`、`<ul>`、`<ol>`、`<pre>`、`<blockquote>`、`<figure>`、`<table>`)
- 任何 JSX MDX component(`<NodeDiagram>`、`<Callout>` 等)— 整個元件視為一個原子 block,不切
- `<section>` / `<div>` 容器除非標 `data-qdoc-paginable`,否則 **不**自己當 boundary(內部子 block 才是)

**Id 設計需求**:
- **Stable**:同份 source compile 多次 id 不變(基於 source order,不是 random)
- **Source-locatable**:id 含 source filename + 序號,debug 看得出來
- **Unique within document**:跨章節不撞(prefix 章節 slug)

**2. SSR 後 DOM 內 id 仍在**

React `data-*` props 自動 forward 到 DOM element,SSR HTML 內每個 paginable block 都帶 `data-qdoc-block-id="..."`。

**3. 測量階段回傳 break block ids**

Puppeteer 內測量 script:

```js
// 在 headless Chromium 內跑
const blocks = document.querySelectorAll('[data-qdoc-block-id]');
const measurements = [];
let cumulativeHeight = 0;
let currentPageBlocks = [];

for (const el of blocks) {
  const rect = el.getBoundingClientRect();
  if (cumulativeHeight + rect.height > PAGE_SAFE_AREA) {
    measurements.push({
      pageIndex: measurements.length,
      blockIds: currentPageBlocks,
      breakAfter: el.previousElementSibling?.dataset.qdocBlockId,
    });
    currentPageBlocks = [];
    cumulativeHeight = 0;
  }
  currentPageBlocks.push(el.dataset.qdocBlockId);
  cumulativeHeight += rect.height;
}
// flush last page
```

回傳 `measurements: { pageIndex, blockIds[], breakAfter }[]`。

**4. 用 AST/tree map 拆 React tree**

Compile 階段同時 build 一份 `blockId → MDAST node` 的 map(以及 `blockId → React element key`)。拿 measurement 回來後:

```ts
function splitTreeByMeasurements(mdast, measurements) {
  return measurements.map(({ blockIds }) => {
    const pageMdast = filterMdast(mdast, (node) =>
      blockIds.includes(node.data?.qdocBlockId)
    );
    return mdastToReactTree(pageMdast);   // 每頁獨立 subtree
  });
}
```

不對 HTML string 做 slicing — 一律走 AST level,然後該頁的 subtree 各自獨立 SSR。

**5. 不可切的 case**

- `<figure>` / `<table>` / 任何 JSX component 視為原子 block,跨頁時 block 整個推下一頁(`break-inside: avoid` + 邏輯上保持完整)
- 一個 block 自己就超過一頁高度:warn + 留在原處(這是 user 寫得太長,不是 engine 能修)— `qdoc validate` 報 `block-overflows-page`
- 對 `<ul>` / `<ol>` / `<pre>` 等可細分的 block,v1 仍視為原子;v2 才考慮 split-at-item-boundary

**6. Inspector 跟 block-id 共享 attribute 嗎?**

不共享。
- `data-qdoc-block-id`:**production + dev 都有**,build 時 strip(reader 不需要 — 已是預分頁好的 page block)
- `data-qdoc-loc`:**dev only**(inspector 用),build 不注入

兩個 attribute 各做各的事,不混用。

### 6.2 為何 build-time + Puppeteer

| 角度 | 收益 |
|---|---|
| **跨環境穩定度** | 同個 source,Mac 上 A 看 Page 5、iPad 上 A 看也是同個 Page 5、PDF 上也是,引用 "翻到第 5 頁" 永遠對 |
| **真實 layout** | Chromium 真正的 layout engine,字型 metric 精確 |
| **元件邊界乾淨** | `<NodeDiagram>` 永遠是一個 unit,不會 mid-component 切 |
| **`break-inside: avoid`** | 跟 React 元件邊界對齊,build 跟 Chrome print 都認 |
| **元件可 export pagination policy** | `<LongList itemsPerPage={10}>` 在 build 時生效 |
| **Reader 載入快** | 不用 runtime measure,直接顯示 |
| **PDF 一致** | 同份 page blocks,reader / PDF / 引用全部對齊 |

**代價**:

| 代價 | 量級 | 緩解 |
|---|---|---|
| Build 環境需 Chromium binary | ~280MB | CI image cache;dev 一次裝 reuse |
| Build 時間 +1-2 秒 / 100 頁 | 可接受 | 一次性 |
| Web font 必須 build 時 ready | 已是 open-press 規範(`document/theme/fonts/`) | — |
| Dev mode 怎麼處理 | Vite dev 用 runtime 測量(犧牲精準換速度),build 才 Puppeteer | 見下 |

**Dev mode 二段策略**:

- **`qdoc dev`**:用 runtime browser 測量(現有 `paginateQDocSourcePages` 改成 React tree 版),hot reload 快,但 break point 跟 prod 可能略漂
- **`qdoc build`**:跑 Puppeteer 預分頁,輸出 deterministic 結果
- Dev 看大局 / 視覺 / 內容;build 才 lock 頁碼
- 這個分裂風險:user 在 dev 看到 page 5,build 完變 page 4。需在 UI 上明確提醒「dev 頁碼是預覽,build 才是最終」

---

## 7. 元件解析與 dispatch

### 7.1 Dispatch 模型

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

export const meta = { slug: 'appendix', title: '附錄' };
export const Page = AppendixPage;   // 直接 JSX reference,不走字串 dispatch
```

Engine 看到 `chapter.tsx` 有 named export `Page` → 該章 chapter 用此 component wrap,不用全域的 `Page.tsx`。**沒有字串名稱比對**,純粹是 React 元件 reference,跟整體「JSX 直接指名」一致。

### 7.2 `Page.tsx` 的角色(chapter prose 頁 wrapper)

對 chapter `.mdx` pagination 完之後,engine 把每個分頁 subtree 包進 `Page.tsx`。`Page.tsx` 控制**頁面 chrome**(header / footer / 頁碼 / running info),內容(`{children}`)由 pagination 注入。

```tsx
// document/components/Page.tsx
import { BaseReportPage } from '@/core';
import type { PageProps } from '@/core';

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

### 7.3 MDX auto-imports(章節 scope 化)

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

### 7.4 章節 scoped CSS

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

### 7.5 衝突處理

- `document/components/Foo.tsx` 跟 `document/components/Bar.tsx` 都 default export `Foo` → engine 用檔名 = `Foo` vs `Bar`,沒衝突。
- 同檔名不可能(filesystem 限制)。

---

## 8. Style pack 定位(scaffold-only)

### 8.1 Pack 是 skill scaffolder,不是 npm dep

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

### 8.2 Pack 升級不回頭動 document

- Pack 是 ship 的 skill,版本獨立
- Document 一旦 init,所有檔案歸 user 所有
- Skill 升級後,新文件用新版,舊文件不變
- 想拿新版的某個 component → user 手動 copy,自負 conflict 整合

### 8.3 跨 pack 怎麼混

- 一份 document 一個 pack(init time 決定)
- 後續想拿另一個 pack 的 component → user 從 `skills/<other-pack>/starter/components/X.tsx` 手動複製到 `document/components/X.tsx`
- 沒有 import path 衝突,因為都是 user-owned 檔案

---

## 9. Validation 分層

`qdoc validate` 跟其他工具按嚴格度分四層,讓 dev iteration 不被擋,但 commit / build 前該嚴格的點不漏:

| Rule | 編輯器(LSP + ESLint) | `qdoc dev` | `qdoc validate` | `qdoc build` |
|---|---|---|---|---|
| TypeScript error(missing/wrong prop) | 🔴 紅底線 | 🟡 console warn | 🔴 fail | 🔴 fail |
| Unknown component(`<Foo />` 找不到) | 🔴 紅底線 | 🔴 MDX compile fail | 🔴 fail | 🔴 fail |
| MDX 內 `import` 出現 | 🔴 紅底線 | 🔴 fail | 🔴 fail | 🔴 fail |
| `document/index.tsx` 有 side effect | 🟡 黃底線 | 🟡 warn | 🔴 fail | **🔴 fail** |
| Cross-component 引用 sub-component(架構不變式) | 🟡 黃底線 | 🟡 warn | 🔴 fail | **🔴 fail** |
| `chapter.tsx` 缺 `meta.slug`(required metadata) | 🟡 黃底線 | 🟡 warn | 🔴 fail | **🔴 fail** |
| Media path / asset 不存在 | 🟡 黃底線(LSP plugin) | 🟡 warn | 🔴 fail | **🔴 fail** |
| MDX inline JSX(block-only violation) | 🟡 黃底線 | 🟡 console warn | 🔴 fail | 🟡 warn |
| Shell page body 有內容(`<Cover>...</Cover>`) | 🟡 黃底線 | 🟡 warn | 🔴 fail | 🟡 warn |
| `@qdoc-comment` marker 殘留 | 🟡 黃底線 | 🟡 warn | 🔴 fail | 🟡 warn |

**哲學**:
- **dev 期間 lenient** — user / AI 寫到一半也能 preview
- **`qdoc validate` 嚴格** — 顯式跑代表「我要確認 OK」,任何錯都報
- **`qdoc build` 看「會不會產出壞 artifact」**:
  - **架構不變式 / deterministic artifact 受影響 → fail**(TS error、unknown component、import、`document/index.tsx` side effect、cross-component import、缺 required metadata、missing asset)
  - **純 style / 內容慣例 → warn**(inline JSX、shell body、marker 殘留)
  - 理由:build 產出壞文件比擋 user 出貨嚴重;style 類錯 user 仍能看到 reader 自行決定是否處理

### 9.1 Editor / LSP 設定

`@/core` ship 一份 ESLint preset:

```js
// .eslintrc.js(starter 預設)
module.exports = {
  extends: [
    '@/core/eslint-preset',
  ],
};
```

包含:
- `eslint-plugin-mdx`(MDX 結構檢查)
- `@typescript-eslint`(TS rules)
- `@openpress/eslint-plugin`(open-press 專屬:block-only、cross-component import、document/index.tsx side-effect、unknown component)

VS Code / Cursor / Claude Code 自動套用,寫到一半 underline 提示。

### 9.2 `qdoc validate` 輸出格式

人類可讀 + machine-readable:

```bash
$ qdoc validate .

✗ document/chapters/04-linked-list/content/01-list-and-node.mdx:42
  inline JSX in paragraph — must be block-only
  rule: block-only-jsx
  see: https://qdoc.dev/rules/block-only-jsx

✗ document/chapters/05-tree/content/01-tree-basics.mdx:15
  unknown component <TreeNode />
  rule: unknown-component
  did you mean <TreeVisual />?

⚠ document/chapters/04-linked-list/content/02-singly-linked-list.mdx:88
  <img src="/media/insertion.png" /> — file not found
  rule: media-not-found
  resolved to: document/media/insertion.png

3 issues (2 errors, 1 warning) — exit 1
```

加 `--json` 旗標給 AI 收割:
```bash
$ qdoc validate . --json | jq
{
  "errors": 2,
  "warnings": 1,
  "issues": [
    { "file": "...", "line": 42, "col": 3, "rule": "block-only-jsx", "message": "...", "severity": "error" },
    ...
  ]
}
```

### 9.3 Pre-commit hook(starter 預設提供)

```sh
#!/bin/sh
# .husky/pre-commit
qdoc validate . || exit 1
```

User init 時可選擇是否 enable;starter 預設裝。

---

## 10. Inspector + apply-comments

從 open-slide 偷的 UX,但走純 file-based persistence(無 DB)。閉環:**reader 看到 → 點 → 評 → AI `/apply-comments` 收割 → 看**。

### 10.1 持久化模型(無 DB)

```
Browser (Mac / iPad)
   │ ① 點段落 → 跳評論框
   │ ② 寫 note
   │ ③ POST /__qdoc/comment to dev server
   ↓
Mac local dev server (Vite + @/core)
   │ ④ AST-aware insert:找最內側 JSX 容器,塞 marker
   │ ⑤ 寫進 .mdx source 檔
   │ ⑥ Vite HMR 推到 connected clients
   ↓
Browser(全部 tab)→ reader 重新 evaluate MDX,markers 仍在 source
```

Refresh / 跨裝置 / AI / git 都靠 source 檔自然 work。

### 10.2 Vite plugin `data-qdoc-loc`(dev only)

Babel parser walk JSX,在每個元素加 `data-qdoc-loc="<chapter>:<file>:<line>:<col>"`:

```tsx
// dev mode rendered:
<p data-qdoc-loc="linked-list:01-list-and-node.mdx:42:3">
  插入節點時先 X.next = head.next
</p>
```

Plugin 只在 `apply: 'serve'` + `enforce: 'pre'` 跑,**build 時不注入**(prod 看不到 attribute)。

### 10.3 Marker 格式

```mdx
{/* @qdoc-comment id="c-abc12345" ts="2026-05-20T..." text="<base64url(JSON)>" */}
```

- `id` — 8 字元 hex,unique
- `ts` — ISO timestamp
- `text` — base64url-encoded JSON `{ note: string, hint?: string }`
- 必須是 JSX comment(`{/* ... */}`),不是 markdown 註解
- **AST-aware insertion**:engine 找到 click 元素對應的 JSX 容器,marker 塞在該元素內側第一個 child 位置;對 self-closing 元素(`<img />`)hoist 到最近的 non-self-closing 父元素

### 10.4 `/apply-comments` skill

`skills/openpress/skills/apply-comments/SKILL.md`(@/core 內建):

```md
---
name: apply-comments
description: Apply pending @qdoc-comment markers...
---

# Apply qdoc comments

1. Scan @qdoc-comment markers in:
   - `document/index.tsx`(cover / toc / backCover shell JSX)
   - `document/chapters/**/*.mdx`(chapter prose)
   - `document/chapters/**/chapter.tsx`(chapter opener + meta)
   - `document/chapters/**/components/**/*.tsx`(chapter-local components)
   - `document/components/**/*.tsx`(全域 components — 較罕見,但 inspector 可能點到)
2. For each marker:
   - base64url-decode text → { note, hint? }
   - Read ~30 lines around the marker for context
   - 若 `note` 指向「全文件性」改動(例如「把所有 H2 換 H3」),拒絕並要求 user 開新 prompt — 不在 marker scope 內動
   - Apply the edit described in `note`
   - Remove the marker line
3. Run `qdoc validate` to confirm no breakage
4. Report: "{N} applied, {M} skipped (out-of-scope), 0 remaining"
```

User 在 Claude Code / Codex 跑 `/apply-comments` → AI 走完上述流程。

### 10.5 Reader inspector UI

```tsx
// publicPage.tsx 內(reader runtime layer)
<button
  className="qdoc-public-fab fixed bottom-4 right-20 ..."
  aria-label={inspectorMode ? '退出 Inspector' : 'Inspector'}
  onClick={toggleInspectorMode}
>
  {inspectorMode ? <X /> : <MessageSquare />}
</button>
```

進 inspector mode 時:
- `<main data-qdoc-inspector-mode="on">` 設 root attribute
- CSS 對有 `data-qdoc-loc` 的元素加 `:hover` outline
- Click handler delegate:有 `data-qdoc-loc` 才攔(reader chrome 不攔)

```css
[data-qdoc-inspector-mode="on"] [data-qdoc-loc]:hover {
  outline: 2px solid var(--color-accent);
  cursor: pointer;
}
```

### 10.6 Touch device(iPad)考量

- iPad Safari clipboard 限制:必須 user gesture 內才寫 clipboard → 點段落不能直接 copy 路徑,要跳 modal 讓 user 按按鈕觸發
- iOS rubber-banding 跟 inspector outline 互相干擾:inspector mode 暫關 scroll-snap(讓 user 容易精準點到段落)
- Tap target ≥ 44pt(WCAG)— 段落本身就夠大,小元素(inline `<code>` 等)的 inspector target 可以是父段落

### 10.7 Build 時 marker 不存在於 prod

`qdoc validate` 警告(但不擋 dev);`qdoc build` 自動 strip(從 SSR 輸出移除 marker JSX comment)。

如果 commit 時還留 marker:
- pre-commit hook 跑 `qdoc validate` → 列出殘留 marker → user 跑 `/apply-comments` 或手動處理才能 commit

---

## 11. Reader runtime delta

新架構對現有 reader runtime(`src/qdoc/readerRuntime.ts` + `readerScroll.ts`)的影響:

### 11.1 刪除(約 200 行)

- `paginateQDocSourcePages`(runtime measure + 拆分)
- `usePaginatedQDocPages`(hook + Vite-side pagination 邏輯)
- Reader 改成消費 `document.json` 內的預分頁 page blocks(由 build-time Puppeteer 算好)

### 11.2 新增(約 100-150 行,inspector layer)

- `useQDocInspector` hook(state: `inspectorMode`,toggle 行為,localStorage persist)
- Inspector UI(FAB toggle 按鈕、hover overlay、click delegation)
- POST `/comment` 到 dev server endpoint 的 client-side 邏輯
- 跟現有 click handler 不衝突:只攔有 `data-qdoc-loc` 屬性的內容元素;reader chrome(bookmark、FAB、drawer)放行

### 11.3 不變(已穩定運作的部分)

- `useQDocReaderRuntime`:`currentPageIndex` / `rightPanelOpen` / IntersectionObserver / 雜湊同步 / `pendingScrollTargetRef` guard / resize re-anchor
- `useQDocViewMode`:viewport < 360px auto reading mode 的邏輯
- Scroll-snap CSS(`scroll-snap-type: y mandatory` 限定 paged mode)
- Hash route(`#page-NN` ↔ currentPageIndex)
- `readerScroll.ts`:`scrollToPage` + IntersectionObserver wrapper

### 11.4 估時

| 項目 | 估時 |
|---|---|
| 刪除 runtime pagination + 切換到消費 document.json blocks | 2-3 天 |
| 加 useQDocInspector + UI 元件 | 3-5 天 |
| 跟現有 click handler 整合測試(iPad / desktop) | 2-3 天 |
| **合計** | **1-1.5 週** |

---

## 12. Migration(從現狀切換)

產品還沒公告,**沒有過渡期**。一次性 cutover + codemod。

### 12.1 Codemod

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
| (新增)workspace root | 加 `AGENTS.md`、`document/memory/`(可選),`tsconfig.json` extends `@/core` base |

### 12.2 手動補正

Codemod 處理 70-80%,剩下:
- HTML cover/back-cover 內的客製 markup → user 手動抽到 `Cover.tsx` / `BackCover.tsx` 的 JSX
- 跨章節 vs 章節 local component 的決定(codemod 預設留在 `document/components/`,user 評估是否搬到 chapter-local)
- 跨章節 vs 章節 local media 的決定(codemod 預設留在 `document/media/`,user 評估是否搬到 chapter-local)
- 章節資料夾分組 → user 決定 flat content/ 內哪些檔案應該歸到哪個 chapter folder
- `AGENTS.md` 內容 — codemod 從現有 `AGENTS.md` 複製,user 補充新架構規則

### 12.3 工作量估算

| 工作項目 | 估時 | 風險 |
|---|---|---|
| @/core 抽出 + npm publish 流程 | 3-4 週 | Low |
| BaseX primitives 設計 + 實作 | 1-2 週 | Low |
| MDX pipeline + auto-imports + chapter-scoped components | 1.5 週 | Medium |
| Tailwind v4 整合(preset / per-chapter scope / print purge) | 1 週 | Low |
| Build-time Puppeteer pagination(§6) | **4-5 週** | **High** |
| Validation 分層(§9) — ESLint preset + qdoc validate | 1.5 週 | Low |
| Inspector + apply-comments(§10) — Vite plugin + UI + skill | 3 週 | Medium |
| Reader runtime delta(§11) | 1-1.5 週 | Low |
| Codemod + migration 工具(§12) | 1.5 週 | Medium |
| skill scaffolder 重寫 + AGENTS.md / memory template | 1 週 | Low |
| 文件 / SKILL.md / starter 範例 | 1 週 | Low |
| 對現有 dogfood document migration + QA(iPad / desktop / print) | 1.5 週 | Medium |

**總計約 3.5-4 個月**(單人全職)。

**最大風險:Build-time Puppeteer pagination**(§6)— 字體/CSS load timing、Linux ↔ macOS metrics 差異、`@page` interaction 全是踩雷的地方。建議:**在進入 v1 正式 build 前,先做 2-3 週 prototype gate**,目標是把 dogfood document 的目前章節跑得跟現狀 100% 一致再 commit。沒過 gate 不開 v1。

---

## 13. 開放議題

七個原始 Q 都已在這份 v1 spec 內收斂(見下方 Decisions table)。剩下待解的:

1. **`'use client'` component 在 PDF/print 怎麼處理?**
   - PDF route 不執行 client React → 該 component 在 PDF 顯示 SSR 結果(預設 state)
   - 規則:`'use client'` component 必須在 SSR pass 渲染出 *可用的* fallback(static snapshot)— 否則 PDF 會 blank。寫進 `@/core` lint rule + AGENTS.md 規則。

2. **Puppeteer 量測在 CI(Linux)跟本機(macOS)字體 metrics 差異**
   - 同一份 mdx 在 Mac 跑出 80 頁、CI Linux 跑出 81 頁的風險。
   - 緩解方案候選:(a) CI/本機都鎖 Docker image 同一份 Chromium;(b) 字體全內嵌(self-host woff2,不靠 system font);(c) build artifact 鎖死在 CI,本機只跑 dev 預覽
   - 留到 prototype gate 階段(§12.3 風險區)定論

3. **Inspector marker 衝突偵測**
   - 兩個 tab 同時點同一段落 → 同時 POST → 兩條 marker 寫進 source
   - v1 acceptable:apply-comments 會處理同檔多 marker。但要不要 dev server 給 ETag-like 衝突檢測?
   - 暫定 v1 不做,留 backlog

4. **AI 跑 `/apply-comments` 時對自己沒看過的章節怎麼避免誤改?**
   - 規則:apply-comments skill 規定每個 marker 處理時必須 read ~30 lines context
   - 若 note 提到「全文件性」改動(例如「把所有 H2 換 H3」)→ 工具拒絕,要求 user 開新 chat 用更明確 prompt
   - 寫進 SKILL.md

5. **Tailwind v4 跟 print page-break 的互動**
   - `@media print` + Tailwind utility class 在某些 utility 上會被 purge,需要在 `safelist` 加白名單
   - 待 prototype 時驗

6. **per-chapter theme tokens 是 hard override 還是 cascade?**
   - cascade(目前設計):`document/theme/tokens.css` 是 base,`chapters/<slug>/styles/` 內 `@theme {}` 覆蓋;但 Tailwind v4 對巢狀 `@theme` 行為要實驗確認

---

## 14. 不變的部分(明確列出來避免誤解)

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

### Q1-Q7 七題決議(這輪)

| Question | Decision | 落到哪一節 |
|---|---|---|
| Q1: Theme tokens 形式 | **Tailwind v4** —`@theme {}` 寫 CSS variable,component 直接吃 utility class;per-chapter override 在 `chapters/<slug>/styles/` 內加 `@theme` | §4 |
| Q2: Component 物理結構 | **Folder per component**,小元件可單檔(Form A);大元件用資料夾 + `index.tsx` + 子元件(Form B) | §3.4 |
| Q3: Pagination 演算法 | **Build-time Puppeteer**(precision 優先,headless Chromium 真實 layout 量測);run-time tree pagination route 砍掉 | §6 |
| Q4: Component 子模組 | 允許 — folder per component,子元件 sibling 並列,僅 `index.tsx` 對外 export | §3.4 |
| Q5: Validation 時機 | **分層**:Editor LSP warn / `qdoc dev` lenient / `qdoc validate` 全嚴 / `qdoc build` critical-only fail | §9 |
| Q6: Inspector + apply-comments | **v1 含進去**(user 要求「要做就一次做到好」),file-based persistence,Vite plugin `data-qdoc-loc` + AST-aware marker | §10 |
| Q7: Reader runtime 影響 | 刪除 runtime pagination(~200 行)、加 inspector layer(~150 行),其他不變 | §11 |

### 整體架構決議

| Decision | Choice | Confidence |
|---|---|---|
| 文件 entry | `document/index.tsx` — `config` + `cover` / `toc` / `backCover` named exports(合併原 `qdoc.config.mjs` + shell);**規定 side-effect free** | High |
| 文件 metadata 型別 | `QDocManifest` interface from `@/core`,目錄路徑走 convention,可在 `config.paths` override | High |
| Chapter 結構 | 每章自包資料夾 `chapters/<NN-slug>/{chapter.tsx, content/, components/, media/, styles/}` | High |
| Chapter ordering | folder name prefix(`04-` `05-`) | High |
| Chapter opener | 從 `chapter.tsx` export `opener`(JSX element)— 可選 | High |
| Chapter metadata 來源 | `chapter.tsx` 的 `meta` named export(slug / title / tone);若無 chapter.tsx,engine 從資料夾名推 slug | High |
| Chapter prose format | `.mdx` with auto-imported components,沒 dispatch-related frontmatter | High |
| Inline JSX in prose | block-only rule(validation 警告 / qdoc validate fail) | High |
| Component 物理結構 | folder per component(允許子元件 sibling);小元件可單檔 | High |
| Component dispatch | 沒有 frontmatter `kind` / `component` 機制;全部 JSX 直接指名 reference;chapter override 用 `export const Page = AppendixPage`(非字串) | High |
| Component primitives | `@/core` exports BaseX(BasePage, BaseCoverPage, BaseFigure 等),MVP 從小集合開始 | High |
| 主要 component 命名 | `Cover` / `Toc` / `ChapterOpener` / `Page` / `BackCover`(無 `Default` prefix) | High |
| Chapter-local component scope | `chapters/<slug>/components/*.tsx` 覆蓋全域同名元件 | High |
| Chapter-scoped CSS | `chapters/<slug>/styles/*.css` engine 自動 prefix `[data-chapter-slug="<slug>"]` | High |
| `Page.tsx` 角色 | 每個 chapter prose 頁的 chrome wrapper,engine 注入 `chapterSlug` / `chapterTone` / `pageIndex` / `totalPages` 等 props | High |
| 領域元件位置 | 章節專屬放 `chapters/<slug>/components/`;跨章節共用放 `document/components/`;不放 core / pack | High |
| Style 系統 | **Tailwind v4 + BaseX 分工**:BaseX 處理 layout / page semantic,Tailwind class 處理 visual / spacing / typography | High |
| CSS / token 兩層隔離 | **System 層**(reader chrome + inspector,`@/core` ship,用 `--qdc-*` token + plain scoped CSS,**不吃 Tailwind**)+ **User document 層**(`[data-qdoc-document]` 內,user 完全自主 Tailwind v4 `@theme`)| High |
| Agent context | workspace root `AGENTS.md`(必備) + 可選 `document/memory/{USER,PROJECT,FEEDBACK,REFERENCES}.md` + `memory/references/` 實際參考資料夾 | High |
| Style pack | scaffold-only(skill init 複製到 document/),**不是 npm dep**,init 後 user 完全自主 | High |
| MDX engine pipeline | 統一 dev + build,單一 compile path | High |
| Pagination(prod build) | **Build-time Puppeteer**(headless Chromium 真實量測);dev mode 走 lightweight CSS-only approximation 即可 | Medium(待 prototype gate 驗證) |
| Pagination DOM ↔ tree bridge | **stable block-id protocol**:MDX compile 時 rehype plugin 注入 `data-qdoc-block-id` 到每個 paginable block,measurement 回傳 break block ids,engine 用 AST level map 拆 MDAST 成 page subtree(不做 HTML string slicing) | High |
| Inspector + apply-comments | v1 含;file-based marker;`/apply-comments` skill 走 source patch | High |
| Validation 分層 | Editor → dev → validate → build,嚴格度遞增 | High |
| SSR vs hydration | 預設 SSR-only,component 頂部 `'use client'` opt-in 變 client component | High |
| Migration | hard cutover + `qdoc migrate-to-react` codemod,無過渡期(產品未公告) | High |
| Style pack 命名(本份文件用的 pack) | 暫定,後續重新規劃 | Low |

---

## Appendix A: 跟現狀對照

| 領域 | 現狀 | 新架構 |
|---|---|---|
| Markdown pipeline | `engine/markdown-renderer.mjs`(markdown-it + custom rules) | `@/core/mdx-compile`(@mdx-js/mdx + remark/rehype plugins) |
| Component 渲染 | `engine/component-renderer.mjs`(render function → HTML string) | React component + SSR via `renderToString` |
| Pagination | `engine/pagination.ts`(HTML string surgery) | Build-time Puppeteer + headless Chromium 量測,輸出預分頁 `document.json`(reader 不再 paginate) |
| 元件呼叫語法 | `<qdoc-component name="X" data='{...}' />` | `<X {...props} />` in MDX(JSX 直接) |
| Component 物理結構 | `document/components/<name>/{component.mjs, data.json, schema.json, style.css}` | `document/components/<Name>/` folder per component(`index.tsx` + 子元件 + utils + `style.css`),小元件可單檔 |
| 文件 entry / config | `qdoc.config.mjs`(workspace root) | `document/index.tsx`(config + shell JSX exports;side-effect free) |
| Cover / TOC / Back-cover | `document/content/{00-cover, 01-toc, 99-back-cover}.md`(HTML body 自寫) | `document/index.tsx` 內 `cover` / `toc` / `backCover` named JSX exports |
| Chapter opener | `document/content/02-ch4-linked-list-opener.md`(frontmatter) | `chapters/<slug>/chapter.tsx` 的 `opener` named export(JSX) |
| 章節組織 | flat `document/content/*.md`,檔名 prefix 排序 | `document/chapters/<NN-slug>/` 自包資料夾 |
| 章節 metadata 傳遞 | 無正式機制(靠檔名跟 frontmatter 推) | `chapter.tsx` 的 `meta` named export,engine propagate 到該章每個 `<Page>` |
| Design 文件 | `document/design.md`(已是單檔) | 不變,仍是 `document/design.md` |
| Style 系統 | 手寫 CSS + skill 提供 `theme/` 資料夾 | **Tailwind v4**(`@theme {}` token block + utility class),BaseX 處理 layout |
| Agent context | workspace root `AGENTS.md`(已有) | 不變 + 新增可選 `document/memory/{USER,PROJECT,FEEDBACK,REFERENCES}.md` + `memory/references/` |
| 元件 dispatch | 字串 attribute `name="X"`,engine 找 `document/components/X/component.mjs` | JSX 直接指名,MDX auto-imports 從 `document/components/` + chapter-local `components/` 注入 scope |
| Reader runtime pagination | Runtime DOM measure + scroll-snap | 刪除 — 消費預分頁的 `document.json` blocks |
| Reader inspector | 無 | 新增 inspector layer(`useQDocInspector` + FAB + `data-qdoc-loc` overlay) |
| Validation | `qdoc validate` 單層 | 四層(editor / dev / validate / build),嚴格度遞增 |
| Workspace shape | framework repo root = workspace,engine/ + src/ 跟 user document 混在一起 | `@/core` 抽 npm package,user workspace 只有 `package.json` + `tsconfig.json` + `AGENTS.md` + `document/` |

---

## Appendix B: 下一份 spec 要寫的內容

當這份 v1 design 通過 review,接著要寫的:

1. ~~`engine-core-package-extraction.md`~~ — **已 supersede**,改走 `2026-05-21-open-press-template-and-skill-init.md`(template + SKILL 分發模式,framework 以 `core/` 資料夾形式存在於 user workspace)
2. **`base-primitives-api.md`** — BasePage / BaseFigure 等的 props interface 完整定義 + 用法範例
3. **`mdx-pipeline.md`** — MDX compile / SSR / chapter-scoped MDXProvider / auto-imports 的具體實作步驟
4. **`pagination-algorithm.md`** — Build-time Puppeteer pagination 演算法 + measurement 策略 + **block-id bridge protocol 細部**(rehype plugin 實作、id 命名 / stability / collision 處理、AST map 結構、subtree split 演算法、不可切 case 的 fallback)+ **prototype gate 通過條件**(dogfood document 跑出跟現狀 100% 一致頁數)
5. **`tailwind-v4-integration.md`** — `@/core/tailwind-preset` 設計 + per-chapter `@theme` cascade 行為驗證 + print purge safelist
6. **`inspector-protocol.md`** — `data-qdoc-loc` 屬性 schema、`/comment` dev server endpoint、AST-aware marker insertion 演算法、`/apply-comments` skill 細部行為(含 ~30 lines context window 規則)
7. **`validation-rules.md`** — `@openpress/eslint-plugin` 全規則清單 + 每條規則對應 §9 四層 tier 的 severity table
8. **`migration-codemod.md`** — 現有 document 怎麼自動轉到新格式(`qdoc migrate-to-react` 行為)
