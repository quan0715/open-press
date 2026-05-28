import { Frame, Press, Workspace } from "@open-press/core";
import type { Manifest } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, Toc } from "@open-press/core/manuscript";

// Transitional config — paths + deploy + pdf still live here in v0.x.
// Document metadata (title / captionNumbering) has moved onto <Press>
// props below; engine merges them and Press props win. v1.0 drops this
// file entirely and reads operational settings from package.json.
export const config: Manifest = {
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

function Cover() {
  return (
    <Frame
      frameKey="cover"
      role="manuscript.cover"
      chrome={false}
      className="reader-page--cover"
      data-page-title="封面"
      aria-labelledby="report-title"
    >
      <header className="cover-meta">
        <span className="cover-meta-title">OpenPress Storybook</span>
      </header>
      <div className="cover-main">
        <h1 id="report-title" className="cover-title">OpenPress Storybook</h1>
        <p className="cover-tagline">AI-first fixed-layout document framework</p>
        <div className="cover-rule"></div>
        <p className="cover-subtitle">用一份公開、可部署的指南，說明 OpenPress 如何把 AI 協作、固定版面、PDF 輸出與 web reader 串成同一條文件工作流。</p>
        <p className="cover-summary">這本 user story book 從使用者角度介紹 OpenPress：什麼時候該用它、如何初始化專案、如何和 agent 一起擴充內容，以及如何匯出與部署。</p>
      </div>
      <footer className="cover-byline">
        <span>open-press</span>
        <span>story.open-press.dev</span>
      </footer>
    </Frame>
  );
}

function BackCover() {
  return (
    <Frame
      frameKey="back-cover"
      role="manuscript.back-cover"
      chrome={false}
      className="reader-page--back-cover"
      data-page-title="封底"
    >
      <header className="back-cover-meta">
        <span className="cover-meta-title">OpenPress Storybook</span>
      </header>
      <div className="back-cover-main">
        <p className="back-cover-kicker">open-press</p>
        <div className="back-cover-rule"></div>
        <p className="back-cover-statement">OpenPress 適合需要長期維護、可審查、可匯出、可部署的正式文件。它讓 AI 不只是產出一次性文字，而是進入一個可以反覆修改與交付的 workspace。</p>
        <p className="back-cover-summary">從初始化到部署，OpenPress 的核心想法是讓 AI 產出的內容進入可維護的文件系統，而不是停在一次性的檔案。</p>
      </div>
      <footer className="back-cover-byline">
        <span>open-press</span>
        <span>open-press-story</span>
      </footer>
    </Frame>
  );
}

export default function OpenPressStorybook() {
  return (
    <Workspace name="OpenPress Storybook">
      <Press
        title="OpenPress Storybook"
        page="a4"
        sources={[
          mdxSource({ id: "story", preset: "section-folders", root: "chapters" }),
        ]}
        captionNumbering={{ figure: "圖", table: "表" }}
      >
        <Cover />
        <Toc source="story" maxLevel={2} />
        <Sections source="story" />
        <BackCover />
      </Press>
    </Workspace>
  );
}
