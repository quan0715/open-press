# Slide Template Protocol

## 背景與痛點 (Background)
1. **Agent 產出不穩定**：目前 Agent 撰寫 MDX 簡報時，由於缺乏統一的版型與元件介面標準，常會自由發揮產生不可預測的結構，導致排版容易跑版。
2. **需要抽換視覺風格**：使用者希望能透過 `cli add` 快速載入特定的 template。如果所有樣板都實作同一個 Protocol，更換整套 Slide 的視覺風格只需要抽換 Component 實作，完全不需要動到 MDX 內容。
3. **與 Inline Editor 整合的挑戰**：OpenPress 的編輯器高度依賴 `Object Locator` 機制（在 AST 解析階段替原始碼中的 JSX Element 注入 `data-op-id`）來實作 Inline Text Editing。如果我們將文字資料定義在 Component Props (例如 `<TitleSlide title="Headline" />`)，會導致 Inline Editor 無法安全對應與寫回文字節點。

## 核心設計 (Core Design)

為了解決以上痛點，**Slide Template Protocol** 不使用 Props 傳遞文字，而是約定一套 **Compound Components (組合元件)** 介面。
這使得 Protocol 成為了「容器 (Namespaces)」與「內容插槽 (Slots)」的標準。

### 設計原則
1. **100% 支援 Inline 編輯**：文字必須放置於 JSX Element 的 `children` 內，確保 Object Locator 能準確追蹤並綁定點擊編輯事件。
2. **語意化結構**：明確區分各個 Slide 版型的資料，如 Title, Subtitle, Statement 等。
3. **保留彈性 (Escape Hatch)**：在標準版型無法涵蓋特殊情境時，必須允許退回基礎的 `<Slide>` 元件進行自由排版。

---

## 介面約定 (Protocol Spec)

所有的樣板實作 (Templates Implementation) 必須遵守以下 Component 結構與命名約定。

### 1. TitleSlide (標題頁)
```tsx
<TitleSlide>
  <TitleSlide.Title>主標題內容</TitleSlide.Title>
  {/* Subtitle 為選填項目 */}
  <TitleSlide.Subtitle>副標題內容</TitleSlide.Subtitle>
</TitleSlide>
```

### 2. StatementSlide (宣言/大字報)
適用於一句話定勝負、重點突出的版面。
```tsx
<StatementSlide>
  <StatementSlide.Statement>
    最核心的宣言文字
  </StatementSlide.Statement>
</StatementSlide>
```

### 3. TwoColumnSlide (雙欄排版)
左文右圖、或兩欄內容比較的常見版型。
```tsx
<TwoColumnSlide>
  {/* Title 為選填項目 */}
  <TwoColumnSlide.Title>比較分析</TwoColumnSlide.Title>
  <TwoColumnSlide.Left>
    <Text>左欄文字或列表內容</Text>
  </TwoColumnSlide.Left>
  <TwoColumnSlide.Right>
    <Image src="..." />
  </TwoColumnSlide.Right>
</TwoColumnSlide>
```

### 4. 保留彈性的自訂 Slide (Escape Hatch)
當以上版型都不適用時，開發者與 Agent 可以隨時退回最基礎的 `<Slide>` 容器，在內部放入任何元件組合：
```tsx
<Slide>
  <MyCustomDataChart />
  <p className="absolute bottom-4 text-sm">客製化排版內容</p>
</Slide>
```

---

## Workflow 流程整合

1. **CLI 安裝樣板**：
   使用者輸入 `openpress add slide-template <theme-name>`。CLI 將該樣板（實作了上述所有 Compound Components）複製至專案中。
2. **Agent 撰寫**：
   Agent 在產生或編輯 MDX 時，只需根據意圖挑選合適的 Wrapper Component 並填空 `children`，無須自行處理 flexbox 或 grid。
3. **引擎編譯與 Object Locator 介入**：
   在打包時，`Object Locator Transform` 會辨識出 `<TitleSlide.Title>` 等子元件，並自動掛上類似 `data-op-id="cover::title-slide-title:1"` 的標籤。
4. **WYSIWYG 互動**：
   當使用者在畫面上修改該段文字時，架構底層可以安全地將變更寫回對應的 `.tsx / .mdx` 檔案。

---

## 樣式與 CSS 規範 (Styling & CSS Protocol)

為解決多重 AI 模型協作時「樣式發散、重複發明 BEM Class 名稱、遺留大量孤兒 CSS 檔案」的痛點，Slide Template Protocol **全面強制採用 Tailwind CSS** 作為樣式標準。

### Tailwind CSS 限制與守則
1. **禁止使用元件級 `.css` 檔案**：不允許在樣板資料夾內創建專屬的 `style.css`。所有排版與樣式皆須透過 TSX 內的 Tailwind Utility Classes 完成。
2. **無狀態設計 (Context Independence)**：透過 Inline Utility Classes，確保任何接手的 Agent 或開發者都能在單一檔案內掌握完整樣式，無需跨檔追蹤 CSS，也避免了 Dead Code 的堆積。

### Slide Base Tokens (主題切換基礎)
為了讓所有 Slide Template 擁有一致的排版節奏，且能透過單一設定檔無痛抽換風格，所有樣板開發**禁止使用 Hard-coded 的色碼或絕對尺寸**，必須使用以下定義的 **Slide Base Tokens**（這些 Tokens 將被註冊在 `tailwind.config.js` 中）：

#### 1. 顏色 Tokens (Colors)
- `bg-slide-base`: 投影片全局底色
- `bg-slide-surface`: 卡片或區塊底色 (用於雙欄、重點框)
- `text-slide-primary`: 主要文字 (標題、核心宣言)
- `text-slide-secondary`: 次要文字 (內文、副標題)
- `text-slide-muted`: 輔助文字 (註解、頁碼、來源說明)
- `border-slide-divider`: 分割線與邊框色
- `text-slide-accent` / `bg-slide-accent`: 品牌強調色 (用於 Highlight、按鈕、圖示)

#### 2. 排版 Tokens (Typography)
- `text-slide-title`: 巨型標題 (TitleSlide 主視覺專用)
- `text-slide-h1`: 頁面大標題
- `text-slide-h2`: 區塊標題
- `text-slide-body`: 標準內文 (需確保在投影裝置上具備極高可讀性，建議映射至 `24px` 或 `1.5rem` 以上)
- `text-slide-small`: 輔助與備註文字

#### 3. 間距 Tokens (Spacing & Layout)
- `p-slide-safe`: 投影片的安全邊距 (Safe Area Padding)，確保內容不會貼齊螢幕邊緣 (例如映射至 `p-12` 或 `p-16`)。
- `gap-slide-section`: 主要區塊之間的垂直間距 (例如標題與內文之間)。
- `gap-slide-element`: 相鄰小元素之間的間距。

#### 4. 形狀與裝飾 Tokens (Shape & Decoration)
- `rounded-slide-card`: 卡片或重點區塊的圓角半徑 (可對應至 `rounded-xl` 或硬朗的直角 `rounded-none`)。
- `rounded-slide-image`: 圖片或多媒體容器的圓角處理。
- `shadow-slide-surface`: 卡片或浮動元素的陰影層級，確保元素間的高低層次一致。

**抽換風格的運作原理：**
未來透過 CLI 安裝不同主題時（例如 `dark-tech` 或 `minimalist`），只需要覆寫 `tailwind.config.js` 中的 Token 映射值。因為所有的 TSX 樣板都共用 `className="bg-slide-base text-slide-primary p-slide-safe"` 這樣的語法，整套簡報的視覺語彙就能瞬間切換，達成真正的 Theming。
