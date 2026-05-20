import type { QDocManifest } from "@qdoc/core";

export const config: QDocManifest = {
  title: "QDoc",
  subtitle: "產品說明、使用流程與 Agent 互動建議",
  organization: "QDoc",
  sourceDir: "chapters",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/qdoc",
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
  <section
    className="reader-page cover no-footer"
    data-page-kind="cover"
    data-page-footer="false"
    aria-labelledby="report-title"
  >
    <header className="cover-meta">
      <span className="cover-meta-title">產品說明與使用文件</span>
    </header>
    <div className="cover-main">
      <h1 id="report-title" className="cover-title">QDoc</h1>
      <p className="cover-tagline">AI-first fixed-layout document workspace</p>
      <div className="cover-rule"></div>
      <p className="cover-subtitle">為需要固定視覺樣式的長篇文件，建立可由 AI 協作、驗證與輸出的工作流。</p>
      <p className="cover-summary">QDoc 將內容、文件設計、視覺元件、預覽與 PDF 輸出收斂在同一個 workspace。</p>
    </div>
    <footer className="cover-byline">
      <span>QDoc</span>
      <span>v0 Showcase</span>
    </footer>
  </section>
);

export const toc = (
  <section
    className="reader-page toc no-footer"
    data-page-kind="toc"
    data-page-footer="false"
  >
    <div className="page-frame">
      <header className="page-header" aria-hidden="true"></header>
      <main className="page-body">
        <h2 id="toc-title" className="toc-heading">目錄</h2>
      </main>
    </div>
  </section>
);

export const backCover = (
  <section
    className="reader-page back-cover no-footer"
    data-page-kind="back-cover"
    data-page-footer="false"
  >
    <header className="back-cover-meta">
      <span className="cover-meta-title">產品說明、使用流程與 Agent 互動建議</span>
    </header>
    <div className="back-cover-main">
      <p className="back-cover-kicker">QDoc</p>
      <div className="back-cover-rule"></div>
      <p className="back-cover-statement">把長篇文件的寫作、設計與輸出，變成 Agent 可以參與、使用者可以審核、系統可以驗證的流程。</p>
      <p className="back-cover-summary">從 style pack 起手，用 skill 協調寫作、設計、本機審稿、貢獻者工作流與部署檢查，再透過 QDoc CLI 驗證、預覽與輸出。</p>
    </div>
    <footer className="back-cover-byline">
      <span>QDoc</span>
      <span>v0 Showcase</span>
    </footer>
  </section>
);
