import { Frame, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, Toc } from "@open-press/core/manuscript";
import ChapterOpenerVisual from "./components/ChapterOpenerVisual";
import Page from "./components/Page";

function Cover() {
  return (
    <Frame
      frameKey="cover"
      role="manuscript.cover"
      chrome={false}
      className="reader-page--cover no-footer"
      data-page-title="Cover"
      aria-labelledby="document-title"
    >
      <ChapterOpenerVisual variant="overview" tone="sage" />
      <div className="cover-main">
        <h1 id="document-title" className="cover-title">
          Claude
          <br />
          Document
        </h1>
        <p className="cover-author">
          <span>Prepared for</span>
          <strong>Working Notes</strong>
        </p>
      </div>
    </Frame>
  );
}

function BackCover() {
  return (
    <Frame
      frameKey="back-cover"
      role="manuscript.back-cover"
      chrome={false}
      className="reader-page--back-cover no-footer"
      data-page-title="Back cover"
    >
      <ChapterOpenerVisual variant="overview" tone="sage" />
      <div className="back-cover-main">
        <h2 className="back-cover-title">
          Claude
          <br />
          Document
        </h2>
        <p className="cover-author">
          <span>Prepared for</span>
          <strong>Working Notes</strong>
        </p>
      </div>
    </Frame>
  );
}

export default function ClaudeDocumentPress() {
  return (
    <Press
      slug="claude-document"
      title="Claude Document"
      page="a4"
      componentsDir="./components"
      mediaDir="./media"
      sources={[
        mdxSource({ id: "story", preset: "section-folders", root: "claude-document/chapters" }),
      ]}
    >
      <Cover />
      <Toc source="story" heading={<h2 id="toc-title" className="toc-heading">Contents</h2>} />
      <Sections source="story" page={Page} />
      <BackCover />
    </Press>
  );
}
