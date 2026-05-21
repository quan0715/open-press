import ChapterOpenerVisual from "@/components/ChapterOpenerVisual";

export const meta = {
  slug: "review-loop",
  title: "Review Loop",
  tone: "mint",
};

export const opener = (
  <section
    className="reader-page reader-page--chapter-opener no-footer"
    data-page-kind="chapter-opener"
    data-page-footer="false"
    data-page-title="Review Loop"
    aria-labelledby="chapter-opener-review-loop"
  >
    <div className="page-frame">
      <header className="page-header" aria-hidden="true" />
      <main className="page-body">
        <p className="chapter-opener-kicker">Chapter 2</p>
        <h2 id="chapter-opener-review-loop" className="chapter-opener-title">
          Review Loop
        </h2>
        <div className="chapter-opener-body">
          <ChapterOpenerVisual variant="review" tone="mint" />
        </div>
      </main>
    </div>
  </section>
);
