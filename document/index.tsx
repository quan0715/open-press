import type { Manifest } from "@openpress/core";
import { BaseBackCoverPage, BaseCoverPage, BaseTocPage } from "@openpress/core";

export const config: Manifest = {
  title: "OpenPress User Story Book",
  subtitle: "框架開發、dogfood 工作流與公開文件驗證",
  organization: "open-press",
  sourceDir: "chapters",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/openpress",
  outputDir: "dist-react",
  pdf: {
    filename: "openpress-user-story-book.pdf",
  },
  deploy: {
    adapter: "cloudflare-pages",
    source: ".deploy/story",
    projectName: "open-press-story",
    commitDirty: false,
    requiresConfirmation: true,
  },
};

export const cover = (
  <BaseCoverPage data-page-title="封面" aria-labelledby="report-title">
    <header className="cover-meta">
      <span className="cover-meta-title">Framework Dogfood Document</span>
    </header>
    <div className="cover-main">
      <h1 id="report-title" className="cover-title">OpenPress User Story Book</h1>
      <p className="cover-tagline">AI-first fixed-layout document framework</p>
      <div className="cover-rule"></div>
      <p className="cover-subtitle">用一份公開、可部署的 dogfood 文件，驗證 OpenPress 從作者體驗、風格系統、工作區模型到 Cloudflare Pages 發布的完整路徑。</p>
      <p className="cover-summary">這本 user story book 是 framework/openpress 的主要測試文件，也是對外說明 OpenPress 如何被開發、使用與驗證的第一版內容。</p>
    </div>
    <footer className="cover-byline">
      <span>open-press</span>
      <span>story.open-press.dev</span>
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
      <span className="cover-meta-title">OpenPress User Story Book</span>
    </header>
    <div className="back-cover-main">
      <p className="back-cover-kicker">open-press</p>
      <div className="back-cover-rule"></div>
      <p className="back-cover-statement">OpenPress 的 framework 開發必須搭配真實文件輸出驗證。這份 dogfood 文件把需求、設計、開發與部署放回同一條可檢查的流程。</p>
      <p className="back-cover-summary">每次改動 framework，都應回到這份文件跑 validate、render、PDF 與 deploy preflight，確保新功能不是只在抽象測試中成立。</p>
    </div>
    <footer className="back-cover-byline">
      <span>open-press</span>
      <span>open-press-story</span>
    </footer>
  </BaseBackCoverPage>
);
