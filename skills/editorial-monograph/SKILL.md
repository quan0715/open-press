---
name: editorial-monograph
description: Use when starting or adapting a quiet, hairline-driven A4 OpenPress editorial starter for long-form monographs, reports, proposals, whitepapers, product specs, or academic documents.
---

# Editorial Monograph

A document style for **嚴肅長文**——日系簡約 + IBM Carbon hairline 風格的衍生，適合產品提案書、白皮書、研究報告、規格文件等需要 A4 印製、章節結構清楚、長段閱讀的場合。

This is a **starter-bearing skill**: it ships SKILL rules plus a runnable `starter/` document workspace (React/MDX entry, theme, design doc, sample chapters). Use `openpress` to initialize the OpenPress runtime workspace; this skill owns the editorial starter files and design rules.

## Visual Signature

- **Type**: serif 章首（Noto Serif TC / Source Han Serif TC）+ sans body（IBM Plex Sans / PingFang TC）
- **Lines**: 1px hairline + dotted underline for links；不用 box-shadow / gradient
- **Color**: 黑白灰主體 + 三色 status accent（warn / success / info）+ chart palette（gold / coral / dark）
- **Layout**: A4 固定版面、章首占整頁、TOC 帶頁碼但不顯示 footer、可選章節 mini cover、figure / table 自動編號
- **Chapter numbering**: default `01 / 02 / 2.1`（pagination + CSS `::before`）；可改 `一、二、（一）` 或 `Chapter 1 / §1.1`，token 與 selector 在 starter 內 `theme/base/typography.css` 與 `design.md` 的 Typography Scale / Chapter & Section Numbering 段

## Suitable For

- product proposal / business plan
- whitepaper / spec / requirements doc
- academic monograph / long-form research report
- editorial-format business report

## Not Suitable For

- slide deck（沒有 bundled starter；自訂尺寸時改 `config.page`，不要把 A4 starter 當成投影片硬改 tokens）
- poster / one-pager
- marketing landing page

## Related Starters

- `claude-document` — warmer paper, Claude-like rhythm. Choose it when the document is closer to a working brief / spec / note than a formal monograph.

## Apply To A Workspace

Use `openpress` to initialize a target workspace, then copy or adapt this skill's
`starter/press` tree into the workspace. Then:

1. Fill `title` / `subtitle` / `organization` on the `<Press>` props inside `press/index.tsx`. Merge `starter/package.openpress.json` into the workspace `package.json`'s `"openpress"` field for deploy / pdf settings.
2. Ask `openpress` to choose the validation/export/render commands needed to confirm the workspace is healthy.
3. Use `openpress` for the source-boundary decision; typical editable source areas are `press/chapters/**/*.mdx` for content, `press/index.tsx` for cover/TOC/back-cover, and `press/theme/tokens.css` for visual tokens.

Page content rules (hierarchy, table captions, figure numbering, factual boundaries) live in `openpress-create-pages`; this skill does not redefine them.

## Do / Don't

**Do:**

- 換 brand color：改 `tokens.css` 內 `--openpress-chart-gold` 或新增 `--openpress-brand-accent`
- 換字體：改 `--openpress-font-serif` / `--openpress-font-body` 的字體棧；需要跨 mobile / iPad 穩定時，同步更新 `theme/fonts.css` 載入 webfont，不要只靠 `local(...)`
- 加新 page kind（divider / appendix-cover）：在 `theme/page-surfaces/` 新增 CSS；已有 `chapter-opener` 可作書籍/教材章節 mini cover
- 換編號樣式（一、二、 or §1.1）：改 `theme/base/typography.css` 的 `::before content`，搭 `@counter-style`
- 改 page 尺寸（B5 / Letter / 投影片）：改 `press/index.tsx` 內 `<Press page="...">` 的 prop；`tokens.css` 只保留 theme fallback 與視覺 token

**Don't:**

- 不要把 inline emphasis color 改成自由色票（破壞語意系統）；新狀態色票要先補 `--openpress-status-*` token 再用
- 不要在 `theme/base/typography.css` 內放單一 chart / specimen 的 CSS（那是 `press/components/<name>/` 的責任）
- 不要為了 dense 內容把字級縮太小；A4 body 正文不應低於 9.5pt
- 不要把 hairline 改成 2px 以上實線；這個 starter 的氣質就靠線細

## 深入設計規則

editorial-monograph 不單獨維護一份 reference/ 文件——所有規格都寫在 `starter/press/design.md` 內，跟著 starter 一起拷貝到 workspace 後變成該專案的 design document：

- 第 1 節 風格目標與使用場景 — 目標 / 適用場景 / 角色定義
- 第 2 節 Tokens — typography / color / spacing / page geometry / inline emphasis / chapter & section numbering
- 第 3 節 Components — page surfaces / text components / tables / figures / charts
- 第 4 節 CSS 權責

Agent 套用 skill 後，這份檔案就成為該專案 `press/design.md` 的內容；之後 user 想客製，直接改 design.md，不用回頭改 skill。
