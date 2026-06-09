# Slide Template Protocol

## 背景與痛點 (Background)
1. **Agent 產出不穩定**：目前 Agent 撰寫 TSX/MDX 簡報時，由於缺乏統一的版型與元件介面標準，常會自由發揮產生不可預測的結構，導致排版容易跑版。
2. **需要抽換視覺風格**：使用者希望能快速載入特定的 slide template。如果所有樣板都實作同一個 Protocol，更換整套 Slide 的視覺風格只需要抽換 Component 實作，盡量不動每張 slide 的內容結構。
3. **與 Inline Editor 整合的挑戰**：OpenPress 的編輯器高度依賴 `Object Locator` 機制（在 AST 解析階段替原始碼中的 JSX Element 注入 `data-op-id`）來實作 Inline Text Editing。如果我們將文字資料定義在 Component Props (例如 `<TitleSlide title="Headline" />`)，會導致 Inline Editor 無法安全對應與寫回文字節點。

## 核心設計 (Core Design)

為了解決以上痛點，**Slide Template Protocol** 不使用 Props 傳遞文字，而是約定一套 **Compound Components (組合元件)** 介面。
這使得 Protocol 成為了「容器 (Namespaces)」與「內容插槽 (Slots)」的標準。

### 設計原則
1. **支援 Object Locator / Inline 編輯路線**：文字必須放置於 JSX Element 的 `children` 內，確保 Object Locator 能準確追蹤。Persistent write-back 仍必須經過目前 source-edit pipeline；`object-locator-edit` 不是已完成能力。
2. **語意化結構**：明確區分各個 Slide 版型的資料，如 Title, Subtitle, Statement 等。
3. **保留彈性 (Escape Hatch)**：在標準版型無法涵蓋特殊情境時，必須允許退回基礎的 `<Slide>` 元件進行自由排版。
4. **Slot Props 必須 forward**：`Object Locator Transform` 會把 `data-op-id` 注入 `<TitleSlide.Title>` 這類 JSX Element。所有 Slot Component 必須把 `...props` forward 到 `Text` 或實際 DOM，否則 locator 會被 component 吃掉。
5. **Root Props 是受控 escape hatch**：Protocol root 可 forward `className`、`aria-*`、`data-*` 到內部 layout `<section>`，讓 template 可以有小幅變體；但 root `id` 保留給 slide marker / frame identity，不作為 DOM id。

---

## 介面約定 (Protocol Spec)

所有的樣板實作 (Templates Implementation) 必須遵守以下 Component 結構與命名約定。

目前 OpenPress slides 採用 folder-per-slide 架構：
- `press/<slug>/press.tsx` 只放 `<Press type="slides">` 與自閉合 `<Slide id="..." />` markers。
- 每張內容放在 `press/<slug>/slides/<id>/slide.tsx`。
- Protocol Components 應用在 `slides/<id>/slide.tsx` 內，不取代 `press.tsx` 的 marker index。

因此第一版 root wrapper 必須接收 `id`，並在內部 render `<Slide id={id}>` 或既有 deck chrome wrapper。

### 1. TitleSlide (標題頁)
```tsx
<TitleSlide id="cover">
  <TitleSlide.Content>
    <TitleSlide.Kicker>Hello OpenPress Slide</TitleSlide.Kicker>
    <TitleSlide.Title>主標題內容</TitleSlide.Title>
    <TitleSlide.Subtitle>副標題內容</TitleSlide.Subtitle>
  </TitleSlide.Content>
  <TitleSlide.Media>
    <TitleSlide.Image src="/openpress/media/cover.png" alt="封面視覺" />
    <TitleSlide.MediaCaption>folder → slide → workspace</TitleSlide.MediaCaption>
  </TitleSlide.Media>
</TitleSlide>
```

### 2. StatementSlide (宣言/大字報)
適用於一句話定勝負、重點突出的版面。
```tsx
<StatementSlide id="closing">
  <StatementSlide.Kicker>Next</StatementSlide.Kicker>
  <StatementSlide.Statement>
    最核心的宣言文字
  </StatementSlide.Statement>
  <StatementSlide.Support>
    <StatementSlide.SupportText>補充說明一</StatementSlide.SupportText>
    <StatementSlide.SupportText>補充說明二</StatementSlide.SupportText>
  </StatementSlide.Support>
</StatementSlide>
```

### 3. TwoColumnSlide (雙欄排版)
左文右圖、或兩欄內容比較的常見版型。
```tsx
<TwoColumnSlide id="comparison">
  {/* Title 為選填項目 */}
  <TwoColumnSlide.Title>比較分析</TwoColumnSlide.Title>
  <TwoColumnSlide.Left>
    <TwoColumnSlide.Kicker>02 · CLI 介紹</TwoColumnSlide.Kicker>
    <TwoColumnSlide.Title>比較分析</TwoColumnSlide.Title>
  </TwoColumnSlide.Left>
  <TwoColumnSlide.Right>
    <TwoColumnSlide.List>
      <TwoColumnSlide.Item>
        <TwoColumnSlide.ItemNumber>01</TwoColumnSlide.ItemNumber>
        <TwoColumnSlide.ItemCopy>
          <TwoColumnSlide.ItemTitle>第一項</TwoColumnSlide.ItemTitle>
          <TwoColumnSlide.ItemBody>說明文字放在 children，保留 locator。</TwoColumnSlide.ItemBody>
        </TwoColumnSlide.ItemCopy>
      </TwoColumnSlide.Item>
    </TwoColumnSlide.List>
  </TwoColumnSlide.Right>
</TwoColumnSlide>
```

### 4. Dogfood Extensions (第一版已實作的額外版型)
除了上面的核心三種，`press/slide/layouts/SlideProtocol.tsx` 也提供以下版型，讓真實 dogfood deck 不需要回退到任意 Tailwind：
- `BlankSlide`: 新增 slide placeholder。
- `CardGridSlide`: 三欄卡片資訊頁，包含 `Heading`, `Grid`, `Card`, `Label`, `CardTitle`, `Body`。
- `ProcessSlide`: 四步驟流程圖，包含 `Heading`, `Map`, `Step`, `StepNumber`, `StepTitle`, `Body`。

### 5. 保留彈性的自訂 Slide (Escape Hatch)
當以上版型都不適用時，開發者與 Agent 可以隨時退回最基礎的 `<Slide>` 容器，在內部放入任何元件組合：
```tsx
<Slide id="custom-chart">
  <MyCustomDataChart />
  <Text as="p" className="op-caption text-text-muted">客製化排版內容</Text>
</Slide>
```

Escape Hatch 仍應遵守 styling guardrails：優先使用 `op-*` semantic classes 與允許的 layout utilities。`absolute`、raw palette、arbitrary values 僅限 template implementation 內部使用，不應由 Agent 直接輸出到 slide content。

### Slot Implementation Contract

Slot component 不能只 render `children`，必須 forward locator props：

```tsx
function TitleSlideTitle({ children, className, ...props }: TextProps) {
  return (
    <Text {...props} as="h1" className={cx("op-display", className)}>
      {children}
    </Text>
  );
}
```

Protocol components 從 `@open-press/core/slides` 直接發布，可在任何 slide workspace 中 import：

```tsx
import { TitleSlide, TwoColumnSlide, BlankSlide } from "@open-press/core/slides";
```

Dogfood 的 `press/slide/layouts/SlideProtocol.tsx` 只是 re-export，確保真實使用路徑可以正確運作。`press/slide/slides/*/slide.tsx` 應優先只消費這些 compound slots；任意 `className`、裸 `<Text>`、或客製 DOM class 應留在 template implementation，而不是 slide content。

---

## Workflow 流程整合

1. **CLI 新增 Slide**：
   使用者輸入 `open-press slide add <id>`。CLI 建立 `slides/<id>/slide.tsx` 並在 `press.tsx` append `<Slide id="<id>" />` marker。`openpress add slide-template <theme-name>` 屬於後續 template installer 能力，不是目前已存在的 CLI contract。
2. **Agent 撰寫**：
   Agent 在產生或編輯 `slides/<id>/slide.tsx` 時，只需根據意圖挑選合適的 Wrapper Component 並填空 `children`，無須自行處理 flexbox 或 grid。
3. **引擎編譯與 Object Locator 介入**：
   在打包時，`Object Locator Transform` 會辨識出 `<TitleSlide.Title>` 等子元件，並自動掛上類似 `data-op-id="cover::title-slide-title:1"` 的標籤。
4. **WYSIWYG 互動**：
   當使用者在畫面上修改該段文字時，架構底層需要用 locator map 對應回 `.tsx / .mdx` source range。這條 persistent write-back 路線仍需要和現有 `/__openpress/source-edit` 能力接上，不能只靠 `data-op-id` 宣稱完成。

---

## 第一版 Style / Tailwind CSS 規範 (Slide Styling Layer)

**核心定位**：OpenPress 負責 Canvas / Slide / Page rendering，而 PPT Design System 只負責 Style Layer。
這套系統提供了一套給 OpenPress 使用的 **Tailwind-based slide styling layer**，帶來穩定、語意化、可擴充的簡報樣式語法。

目前框架已接入 Tailwind CSS v4 Vite plugin。全域 CSS 匯入 `tailwindcss/theme.css` 與 `tailwindcss/utilities.css`，刻意不匯入 Preflight，避免重置既有 reader/workbench CSS。第一版 token 與 component layer 位於 `packages/core/src/styles/openpress/slide-design-system.css`。

### 1. 核心原則
不要讓 AI 直接亂寫 Tailwind class，而是讓 AI 使用一套定義好的 **Slide Semantic Classes**。
- **Semantic token > raw Tailwind class** (例如用 `op-card` 取代 `bg-blue-500 text-white p-7 rounded-xl shadow-lg`)
- **Component class > arbitrary class**
- **Variant > custom CSS**

### 2. 命名空間 (Namespace)
全面採用 `op-` 作為 class prefix（代表 OpenPress / Open Presentation）。
例如：`op-title`, `op-body`, `op-card`, `op-frame`, `op-callout`, `op-kicker`。這能帶來產品感，並避免與其他套件衝突。

### 3. 第一版 Tailwind Token 設計
避免定義過多 raw palette，全面語意化。

#### Color Tokens
```ts
bg, surface, surface-muted, surface-inverse
text, text-muted, text-subtle, text-inverse
accent, accent-muted
border, border-strong
positive, warning, negative
chart-1, chart-2, chart-3, chart-4
```

#### Typography Scale
避免使用 Web 尺寸 (`text-sm`, `text-lg`)，改用簡報專用的 Scale：
```txt
op-display (72px)
op-title (44px)
op-section (56px)
op-lead (30px)
op-body (24px)
op-caption (16px)
op-source (12px)
op-number (72px)
```

#### Spacing Scale
簡報的間距必須大且穩重，捨棄原生 Tailwind Scale：
```txt
op-2xs (8px), op-xs (12px), op-sm (24px), op-md (40px), op-lg (64px), op-xl (96px), op-2xl (128px)
```

#### Radius / Shadow / Border
保持裝飾穩定，不過度複雜化：
- **Radius**: `op-none`, `op-sm`, `op-card`, `op-panel`, `op-pill`
- **Shadow**: `op-none`, `op-card`, `op-floating`
- **Border**: 只開放 `border`, `border-2`, `border-l-4`, `border-l-8` 與語意顏色。

### 4. Component Class Layer (`@layer components`)
利用 Tailwind 的 `@layer components` 將常用的組合封裝為 `op-*` 類別，降低 AI 記憶負擔：

```css
@layer components {
  /* Typography */
  .op-display { @apply font-heading text-op-display font-bold text-text; }
  .op-title { @apply font-heading text-op-title font-bold text-text; }
  .op-section { @apply font-heading text-op-section font-bold text-text; }
  .op-lead { @apply text-op-lead text-text-muted; }
  .op-body { @apply text-op-body text-text; }
  .op-caption { @apply text-op-caption text-text-muted; }
  .op-source { @apply text-op-source text-text-subtle; }
  .op-kicker { @apply text-op-caption font-semibold uppercase tracking-[0.14em] text-accent; }

  /* Surfaces & Containers */
  .op-card { @apply rounded-op-card border border-border bg-surface p-op-md shadow-op-card; }
  .op-card-muted { @apply rounded-op-card border border-border bg-surface-muted p-op-md shadow-op-none; }
  .op-card-accent { @apply rounded-op-card border border-accent bg-accent p-op-md text-text-inverse shadow-op-card; }
  .op-panel { @apply rounded-op-panel border border-border bg-surface p-op-lg shadow-op-card; }
  .op-frame { @apply overflow-hidden rounded-op-panel border border-border bg-surface shadow-op-card; }
  .op-callout { @apply rounded-op-card border-l-8 border-accent bg-surface p-op-md shadow-op-card; }
  .op-divider { @apply h-px w-full bg-border; }
  .op-chip { @apply inline-flex items-center rounded-op-pill border border-border bg-surface-muted px-op-sm py-op-xs text-op-caption font-medium text-text-muted; }
}
```

### 5. AI 可用 Class 規則與白名單 (Guardrails)

為確保 AI 產出的穩定性，未來在 Agents 的 Skill 中必須明確規範：

**允許使用的 Class：**
- **Semantic Components**: `op-title`, `op-body`, `op-card`, `op-panel`, `op-callout` 等。
- **Color/Text**: `bg-bg`, `bg-surface`, `text-text`, `text-accent`, `border-border` 等語意色。
- **Spacing**: `p-op-md`, `gap-op-lg`, `mt-op-sm` 等 OpenPress 專屬間距。
- **Layout**: 基礎的 `flex`, `grid`, `items-center`, `justify-between`, `grid-cols-2` 等。

**嚴格禁止的 Class：**
- ❌ **Arbitrary Values**: `text-[37px]`, `bg-[#123456]`, `mt-[19px]`
- ❌ **Raw Tailwind Palette**: `bg-blue-500`, `text-gray-900`
- ❌ **Web Typography**: `text-xs`, `text-base`, `text-2xl`
- ❌ **自由 Positioning**: `absolute`, `fixed`, `top-*`, `inset-*` (例外：OpenPress 底層元件內部可用，但 AI 不能主動輸出)
- ❌ **Transform / Z-Index**: `scale-*`, `animate-*`, `z-*`

### 6. Style Variants (變體策略)
不一開始做過多風格套件，而是專注於「單一穩定風格內的變體」。
- **Card Variants**: `default`, `muted`, `accent`, `outline`
- **Text Emphasis**: `default`, `muted`, `accent`, `positive`, `negative` 等。
- **Density (密度)**: `comfortable` (`p-op-lg`, `gap-op-lg`), `balanced`, `compact`。
