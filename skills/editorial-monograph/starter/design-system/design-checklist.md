---
kind: back-cover
title: Design Checklist
---

<header class="back-cover-meta">
  <span class="cover-meta-title">Design Checklist</span>
</header>
<div class="back-cover-main">
  <p class="back-cover-kicker">Design Document</p>
  <div class="back-cover-rule"></div>
  <p class="back-cover-statement">Design tab 顯示的內容，就是 User 與 Agent 共同使用的 design document source。</p>
  <p class="back-cover-summary">驗收時檢查 typography scale、color tokens、spacing、cover、TOC、chapter page、tables、figures、captions、mobile preview 與 PDF-safe 輸出。若正式文件風格不符合期待，先更新這份 design document，再更新 `document/theme/` 實作。</p>
</div>
<footer class="back-cover-byline">
  <span>design-checklist.md</span>
  <span>User / Agent review checklist</span>
</footer>

## Hard rules（不做的事）

下列規則由 editorial-monograph 風格直接帶來，不可違反；違反就破壞了「日系簡約 + IBM Carbon hairline」的核心氣質。

| 不做 | 為什麼 |
|---|---|
| 不用 `box-shadow` / `outline > 1px` / `border > 1px` | 視覺重量由留白與 typography 形成，不靠線寬 |
| 不用 `linear-gradient` 鋪滿背景或章首 | 漸層破壞 hairline 系統的安靜感 |
| 不用 `<u>` underline 樣式 | 印刷上跟 `<a>` 撞 |
| 不用 viewport 單位（`vw` / `vh` / `dvh`）於 fixed-layout 內容 | 固定版面 PDF 輸出時 viewport 無意義 |
| 不在 body 正文用低於 9.5pt 字級 | A4 長文閱讀門檻 |
| 不在文件內加入動畫 / 互動 | PDF-safe；reader 模式可以淡入淡出，文件本身不行 |
| 不為單一 instance 在 `theme/patterns/` 新增 CSS | 那層只放跨文件通用 pattern；instance 走 `document/components/<name>/` |
| 不在 `theme/base/typography.css` 內放 page-surface 或 component-specific selector | 各 layer 邊界要乾淨 |
| 不在 markdown 內用自由色票 `<span style="color: #ff0000">` | 顏色強調走 `.status-warn` / `.status-success` / `.status-info` 受控 token；新狀態需先補 `--qd-status-*` token |
| 不寫死語言特定字串到 engine | engine 已國際化中性；cover / toc / back-cover 標題從 frontmatter `title:` 讀 |

## 留白與密度的判斷

每頁應該保持「能呼吸但不空」。檢核：

- **太鬆**：整頁只有 paragraph → 拆出 list / 表格 / figure 換氣
- **太密**：整頁全是 table / figure → 留一段 paragraph 作為閱讀緩衝
- **斷層**：caption 距下一個 heading < `--qd-space-3` → 整段往前壓或頂到下一頁
- **誤插空段落製造留白** → 改 spacing token、改頁面拆分，不要硬塞空段

固定版面中，**寧可拆章節，也不要把過多內容硬塞同頁**。

## Component 寫作安全規則

當 Agent 撰寫 `document/components/<name>/component.mjs` 時：

- 每個 interpolated value 都要過 `helpers.escapeHtml` / `helpers.escapeAttr`
- `style="--var: <value>"` 介入的值要驗證或 clamp（百分比 clamp 到 0-100、`var(--token)` 走白名單）
- 不允許從 user data 注入任意 CSS / HTML

違反這些會打開 CSS / HTML injection 攻擊面，PDF / public deploy 也會出問題。

## 動畫政策

文件內容 PDF-safe，**正文 / 圖表 / 表格本身完全不做動畫**。Reader 工作區內可以有：

- 換頁淡入：`opacity 0 → 1` 配 `translateY(8px → 0)` 或 `translateX(-10px → 0)`
- 持續時間 `180-260ms`，曲線 `cubic-bezier(0.22, 0.61, 0.36, 1)`

不允許：

- 3D transform（`rotateY` 翻書效果之類）— 違背日系簡約氣質
- 彈簧 / 回彈曲線（`cubic-bezier(.68,-0.55,.27,1.55)`）— 文件感覺輕浮
- 大於 300ms 的轉場 — 干擾閱讀節奏

匯出 PDF 時 reader 端要先 disable animation；engine 已處理，design 端注意不要在 chapter content 內加自訂動畫。

## 常見錯誤

| 症狀 | 原因 | 解法 |
|---|---|---|
| 章節編號全部顯示「01」 | `container-type: inline-size` 觸發 `contain: style`，CSS counter 被 scope 限制 | 不要試圖用 CSS counter；engine pagination 已寫 `data-chapter` attribute、`::before content: attr()` 顯示 |
| 章節標題視覺太重 / 制式 | weight 用了 500+ 或顏色非 `--qd-color-ink` | 改回 weight 300、配 `--qd-color-ink`、`--qd-font-serif` |
| 圖片在 grid 內被壓縮變形 | `max-height` + `width:100%` + `object-fit:contain` 同時用 | 改用 `aspect-ratio` + `object-fit: cover` |
| Table 數字欄沒對齊 | 沒用 `<td class="numeric">` | 數字 / 百分比欄一律加 `.numeric` 觸發 tabular-nums |
| caption 標號跳號 | 自己手寫「圖 3：…」當 caption | 寫「圖：…」開頭，engine 會自動填編號 |
| Status emphasis 顏色失控 | 用 `<span style="color: #ff0000">` | 改用 `.status-warn` / `.status-success` / `.status-info` |

## 驗收前的最後檢查

`qdoc:validate` 通過後再人工確認以下三點：

1. **章首視覺一致**：每個 chapter h2 出現時都帶 hairline + `data-chapter` 編號樣式，沒有單頁脫鉤
2. **TOC 頁碼正確**：每個章節對應的頁碼是 reader pagination 跑出的真實頁，不是 markdown 行內估計
3. **PDF 33 頁內每頁不被截斷**：開 PDF 滾一遍，特別檢查 figure 與表格底部沒有切掉文字
