import type { Manifest } from "@openpress/core";
import { BaseBackCoverPage, BaseCoverPage, BaseTocPage } from "@openpress/core";

export const config: Manifest = {
  title: "open-press",
  subtitle: "產品說明、使用流程與 Agent 互動建議",
  organization: "open-press",
  sourceDir: "chapters",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/openpress",
  outputDir: "dist-react",
  pdf: {
    filename: "document.pdf",
  },
  deploy: {
    adapter: "cloudflare-pages",
    source: ".deploy/document",
    projectName: null,
    commitDirty: false,
    requiresConfirmation: true,
  },
};

export const cover = (
  <BaseCoverPage data-page-title="封面" aria-labelledby="report-title">
    <header className="cover-meta">
      <span className="cover-meta-title">產品說明與使用文件</span>
    </header>
    <div className="cover-main">
      <h1 id="report-title" className="cover-title">open-press</h1>
      <p className="cover-tagline">AI-first fixed-layout document workspace</p>
      <div className="cover-rule"></div>
      <p className="cover-subtitle">為需要固定視覺樣式的長篇文件，建立可由 AI 協作、驗證與輸出的工作流。</p>
      <p className="cover-summary">open-press 將內容、文件設計、視覺元件、預覽與 PDF 輸出收斂在同一個 workspace。</p>
    </div>
    <footer className="cover-byline">
      <span>open-press</span>
      <span>v0 Showcase</span>
    </footer>
  </BaseCoverPage>
);

export const toc = (
  <BaseTocPage data-page-title="目錄" id="toc">
    <div className="page-frame">
      <header className="page-header" aria-hidden="true"></header>
      <main className="page-body">
        <h2 id="toc-title" className="toc-heading">目錄</h2>
      </main>
    </div>
  </BaseTocPage>
);

export const backCover = (
  <BaseBackCoverPage data-page-title="封底">
    <header className="back-cover-meta">
      <span className="cover-meta-title">產品說明、使用流程與 Agent 互動建議</span>
    </header>
    <div className="back-cover-main">
      <p className="back-cover-kicker">open-press</p>
      <div className="back-cover-rule"></div>
      <p className="back-cover-statement">把長篇文件的寫作、設計與輸出，變成 Agent 可以參與、使用者可以審核、系統可以驗證的流程。</p>
      <p className="back-cover-summary">從 style pack 起手，用 skill 協調寫作、設計、本機審稿、貢獻者工作流與部署檢查，再透過 open-press CLI 驗證、預覽與輸出。</p>
    </div>
    <footer className="back-cover-byline">
      <span>open-press</span>
      <span>v0 Showcase</span>
    </footer>
  </BaseBackCoverPage>
);
