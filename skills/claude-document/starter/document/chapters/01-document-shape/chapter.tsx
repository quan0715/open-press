import ChapterOpenerVisual from "@/components/ChapterOpenerVisual";

export const meta = {
  slug: "document-shape",
  title: "Document Shape",
  tone: "sage",
};

export const opener = (
  <section
    className="reader-page reader-page--chapter-opener no-footer"
    data-page-kind="chapter-opener"
    data-page-footer="false"
    data-page-title="Document Shape"
    aria-labelledby="chapter-opener-document-shape"
  >
    <div className="page-frame">
      <header className="page-header" aria-hidden="true" />
      <main className="page-body">
        <p className="chapter-opener-kicker">Chapter 1</p>
        <h2 id="chapter-opener-document-shape" className="chapter-opener-title">
          Document Shape
        </h2>
        <div className="chapter-opener-body">
          <ChapterOpenerVisual variant="structure" tone="sage" />
        </div>
      </main>
    </div>
  </section>
);
