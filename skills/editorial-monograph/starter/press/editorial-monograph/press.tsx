import { Frame, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, Toc } from "@open-press/core/manuscript";
import Page from "./components/Page";

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
        <span className="cover-meta-title">產品說明、使用流程與 Agent 互動建議</span>
      </header>
      <div className="back-cover-main">
        <p className="back-cover-kicker">open-press</p>
        <div className="back-cover-rule"></div>
        <p className="back-cover-statement">把長篇文件的寫作、設計與輸出，變成 Agent 可以參與、使用者可以審核、系統可以驗證的流程。</p>
        <p className="back-cover-summary">從 starter skill 起手，用 skill 協調寫作、設計、本機審稿、貢獻者工作流與部署檢查，再透過 open-press CLI 驗證、預覽與輸出。</p>
      </div>
      <footer className="back-cover-byline">
        <span>open-press</span>
        <span>v0 Showcase</span>
      </footer>
    </Frame>
  );
}

export default function EditorialMonographPress() {
  return (
    <Press
      slug="editorial-monograph"
      title="open-press"
      page="a4"
      componentsDir="./components"
      mediaDir="./media"
      sources={[
        mdxSource({ id: "story", preset: "section-folders", root: "editorial-monograph/chapters" }),
      ]}
    >
      <Cover />
      <Toc source="story" />
      <Sections source="story" page={Page} />
      <BackCover />
    </Press>
  );
}
