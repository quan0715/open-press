import type { Manifest } from "@openpress/core";
import ChapterOpenerVisual from "@/components/ChapterOpenerVisual";

export const config: Manifest = {
  title: "Claude Document",
  subtitle: "Warm Editorial Working Notes",
  organization: "OpenPress",
  sourceDir: "chapters",
  mediaDir: "media",
  themeDir: "theme",
  componentsDir: "components",
  publicDir: "public/openpress",
  outputDir: "dist-react",
  pdf: {
    filename: "claude-document.pdf",
  },
  deploy: {
    adapter: "cloudflare-pages",
    source: ".deploy/claude-document",
    projectName: null,
    commitDirty: false,
    requiresConfirmation: true,
  },
};

export const cover = (
  <section
    className="reader-page reader-page--cover no-footer"
    data-page-kind="cover"
    data-page-footer="false"
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
  </section>
);

export const toc = (
  <section
    className="reader-page reader-page--toc no-footer"
    data-page-kind="toc"
    data-page-footer="false"
    data-page-title="Contents"
    data-toc-continuation="false"
    aria-labelledby="toc-title"
  >
    <div className="page-frame">
      <header className="page-header" aria-hidden="true" />
      <main className="page-body">
        <h2 id="toc-title" className="toc-heading">
          Contents
        </h2>
      </main>
    </div>
  </section>
);

export const backCover = (
  <section
    className="reader-page reader-page--back-cover no-footer"
    data-page-kind="back-cover"
    data-page-footer="false"
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
  </section>
);
