---
name: editorial-monograph
description: Use when starting or applying a quiet, hairline-driven A4 editorial style pack for long-form monographs, reports, proposals, whitepapers, product specs, or academic documents.
---

# Editorial Monograph

A document style for **嚴肅長文**——日系簡約 + IBM Carbon hairline 風格的衍生，適合產品提案書、白皮書、研究報告、規格文件等需要 A4 印製、章節結構清楚、長段閱讀的場合。

This is a **style-pack skill**：除了規則文，還在 `starter/` 內附帶完整可用的 React/MDX document starter、theme、design doc 與起手章節，agent 可在新工作區直接拷貝套用。

## Visual signature

- **Type**：serif 章首（Noto Serif TC / Source Han Serif TC）+ sans body（IBM Plex Sans / PingFang TC）
- **Lines**：1px hairline + dotted underline for links；不用 box-shadow / gradient
- **Color**：黑白灰主體 + 三色 status accent（warn / success / info）+ chart palette（gold / coral / dark）
- **Layout**：A4 固定版面、章首占整頁、TOC 帶頁碼但不顯示 footer、可選章節 mini cover、figure / table 自動編號
- **Chapter numbering**：default `01 / 02 / 2.1`（pagination + CSS `::before`）；可改 `一、二、（一）` 或 `Chapter 1 / §1.1`，token 與 selector 在 starter 內 `theme/base/typography.css` 與 `design.md` 的 Typography Scale / Chapter & Section Numbering 段

## Suitable for

- product proposal / business plan
- whitepaper / spec / requirements doc
- academic monograph / long-form research report
- editorial-format business report

## Not suitable for

- slide deck（請改 page-geometry tokens 至 16:9 或另用 deck-oriented style pack）
- poster / one-pager
- marketing landing page

## How to apply（套用到新工作區）

當 user 說「套用 editorial-monograph」或「用這個風格起手」時，agent 執行以下動作：

1. **檢查 `document/` 是否為空 / 是否與既有 user 內容衝突**：
   - 若 `document/index.tsx` 或 `document/chapters/` 有 user 自訂檔 → **不要覆寫**，先問 user 要保留還是覆蓋
   - 若 `document/theme/` 有 user 自訂 CSS → 同上

2. **拷貝 starter 檔案**：
   ```
   skills/editorial-monograph/starter/document/       → document/
   skills/editorial-monograph/starter/qdoc.config.mjs → <workspace root>/qdoc.config.mjs（新工作區）
   ```

3. **填入 metadata**：詢問 user `title` / `subtitle` / `organization`，寫入 `document/index.tsx` 與 `document/qdoc.config.mjs`。

4. **跑 validate + export**：
   ```bash
   node engine/cli.mjs validate
   node engine/cli.mjs export .
   ```

5. **告知 user 下一步**：可以開始改 `document/chapters/**/*.mdx` 寫實際內容；想改封面/目錄/封底改 `document/index.tsx`；想客製樣式改 `document/theme/tokens.css` 的 token。

## Do / Don't

**Do：**
- 換 brand color：改 `tokens.css` 內 `--qd-chart-gold` 或新增 `--qd-brand-accent`
- 換字體：改 `--qd-font-serif` / `--qd-font-body` 的字體棧；需要跨 mobile / iPad 穩定時，同步更新 `theme/fonts.css` 載入 webfont，不要只靠 `local(...)`
- 加新 page kind（divider / appendix-cover）：在 `theme/page-surfaces/` 新增 CSS；已有 `chapter-opener` 可作書籍/教材章節 mini cover
- 換編號樣式（一、二、 or §1.1）：改 `theme/base/typography.css` 的 `::before content`，搭 `@counter-style`
- 改 page 尺寸（B5 / Letter / 投影片）：改 `tokens.css` 的 `--qd-page-width` / `--qd-page-height` / `--qd-page-margin`

**Don't：**
- 不要把 inline emphasis color 改成自由色票（破壞語意系統）；新狀態色票要先補 `--qd-status-*` token 再用
- 不要在 `theme/base/typography.css` 內放單一 chart / specimen 的 CSS（那是 `document/components/<name>/` 的責任）
- 不要為了 dense 內容把字級縮太小；A4 body 正文不應低於 9.5pt
- 不要把 hairline 改成 2px 以上實線；style pack 的氣質就靠線細

## 深入設計規則

editorial-monograph 不單獨維護一份 reference/ 文件——所有規格都寫在 `starter/document/design.md` 內，跟著 starter 一起拷貝到 workspace 後變成該專案的 design document：

- 第 1 節 風格目標與使用場景 — 目標 / 適用場景 / 角色定義
- 第 2 節 Tokens — typography / color / spacing / page geometry / inline emphasis / chapter & section numbering
- 第 3 節 Components — page surfaces / text components / tables / figures / charts
- 第 4 節 CSS 權責

Agent 套用 skill 後，這份檔案就成為該專案 `document/design.md` 的內容；之後 user 想客製，直接改 design.md，不用回頭改 skill。

## Activation summary（給 agent 自己讀的速查）

> 套用 editorial-monograph =
>   拷貝 `starter/document/` → `document/`、
>   新工作區拷貝 `starter/qdoc.config.mjs` → workspace root、
>   詢問 user 填 title / subtitle / organization、
>   跑 `qdoc:validate` 確認。
