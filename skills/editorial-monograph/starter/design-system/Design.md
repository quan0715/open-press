---
kind: cover
title: Design Document
---

<header class="cover-meta">
  <span class="cover-meta-title">Design Document</span>
</header>
<div class="cover-main">
  <h1 id="report-title" class="cover-title">[文件設計說明]</h1>
  <p class="cover-tagline">給 User 檢查，也給 Agent 依循的文件風格規格</p>
  <div class="cover-rule"></div>
  <p class="cover-subtitle">這份 design document 是這個工作區的視覺與排版規格。User 在 Design tab 看到的是它，Agent 生成或修改 `document/content/` 時也依賴它。</p>
  <p class="cover-summary">Design document 拆成多個 source files，讓 Agent 可以按任務讀取對應章節：`style-brief.md` 定義風格定位、`tokens.md` 定義字體 / 色彩 / spacing / page geometry / inline emphasis / 章節編號、`components.md` 定義文件元件規則。這些檔案共同構成同一份 design document，而不是多套規格。</p>
</div>
<footer class="cover-byline">
  <span>Design.md</span>
  <span>Design document entry point</span>
</footer>
