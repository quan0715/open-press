import { Frame, Press } from "@open-press/core";
import type { Manifest } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, Toc } from "@open-press/core/manuscript";
import Page from "./components/Page";

export const config: Manifest = {
  title: "Paper Title",
  subtitle: "An academic-paper draft built with open-press",
  organization: "Department · Institution",
  sourceDir: "chapters",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/openpress",
  outputDir: "dist-react",
  pdf: {
    filename: "paper.pdf",
  },
  deploy: {
    adapter: "cloudflare-pages",
    source: ".deploy/document",
    projectName: null,
    commitDirty: false,
    requiresConfirmation: true,
  },
};

export const sources = {
  story: mdxSource({ preset: "section-folders", root: "chapters" }),
};

/**
 * The cover renders the academic title block: paper title, author grid,
 * abstract band, and index terms. Replace the placeholders with your own.
 */
function Cover() {
  return (
    <Frame
      frameKey="cover"
      role="manuscript.cover"
      chrome={false}
      className="reader-page--cover"
      data-page-title="Title page"
      aria-labelledby="paper-title"
    >
      <div className="paper-cover">
        <h1 id="paper-title" className="paper-title">
          Conference Paper Title
        </h1>
        <p className="paper-subtitle">
          Sub-title (optional). Not captured by indexing services like IEEE Xplore.
        </p>

        <ol className="paper-authors" aria-label="Authors">
          <li className="paper-author">
            <p className="paper-author-name">First Author Surname</p>
            <p className="paper-author-affiliation">dept. of organization</p>
            <p className="paper-author-affiliation">name of organization</p>
            <p className="paper-author-location">City, Country</p>
            <p className="paper-author-contact">email or ORCID</p>
          </li>
          <li className="paper-author">
            <p className="paper-author-name">Second Author Surname</p>
            <p className="paper-author-affiliation">dept. of organization</p>
            <p className="paper-author-affiliation">name of organization</p>
            <p className="paper-author-location">City, Country</p>
            <p className="paper-author-contact">email or ORCID</p>
          </li>
          <li className="paper-author">
            <p className="paper-author-name">Third Author Surname</p>
            <p className="paper-author-affiliation">dept. of organization</p>
            <p className="paper-author-affiliation">name of organization</p>
            <p className="paper-author-location">City, Country</p>
            <p className="paper-author-contact">email or ORCID</p>
          </li>
        </ol>

        <section className="paper-abstract" aria-label="Abstract">
          <p>
            <span className="paper-abstract-label">Abstract</span>—This document
            is a model and starting point for an academic paper drafted in
            open-press. Replace this abstract with your own — keep it under
            250 words. Do not use abbreviations, symbols, footnotes, or math
            in the abstract.
          </p>
        </section>

        <section className="paper-index-terms" aria-label="Index terms">
          <p>
            <span className="paper-abstract-label">Index Terms</span>—keyword
            one, keyword two, keyword three, keyword four
          </p>
        </section>
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
      className="reader-page--back-cover"
      data-page-title="Back cover"
    >
      <div className="paper-back-cover">
        <p className="paper-back-kicker">open-press · academic-paper</p>
        <p className="paper-back-statement">
          Draft built with open-press. When the paper is ready for submission,
          port the prose into the publisher's LaTeX class (IEEEtran, acmart,
          etc.). open-press is the iteration loop, not the camera-ready output.
        </p>
      </div>
    </Frame>
  );
}

export default function AcademicPaperPress() {
  return (
    <Press>
      <Cover />
      <Toc source="story" heading={<h2 id="toc-title" className="toc-heading">Contents</h2>} />
      <Sections source="story" page={Page} />
      <BackCover />
    </Press>
  );
}
