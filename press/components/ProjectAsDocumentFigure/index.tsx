const PROJECT_ITEMS = [
  ["openpress.config.mjs", "document identity"],
  ["document/index.tsx", "Press tree"],
  ["chapters/*.mdx", "manuscript"],
  ["theme/tokens.css", "visual rules"],
  ["components/*", "reusable blocks"],
  ["media/*", "document assets"],
];

const OUTPUT_ITEMS = ["Workbench", "Web reader", "PDF"];

export default function ProjectAsDocumentFigure() {
  return (
    <figure
      className="project-document-figure"
      data-openpress-component="ProjectAsDocumentFigure"
      aria-label="Project as a document illustration"
    >
      <div className="project-document-figure__stage">
        <section className="project-document-figure__panel project-document-figure__panel--source">
          <div className="project-document-figure__eyebrow">workspace</div>
          <div className="project-document-figure__tree" aria-label="OpenPress project tree">
            {PROJECT_ITEMS.map(([path, role]) => (
              <div className="project-document-figure__row" key={path}>
                <span>{path}</span>
                <small>{role}</small>
              </div>
            ))}
          </div>
        </section>

        <div className="project-document-figure__bridge" aria-hidden="true">
          <span />
        </div>

        <section className="project-document-figure__panel project-document-figure__panel--document">
          <div className="project-document-figure__eyebrow">document</div>
          <div className="project-document-figure__page-stack" aria-label="Rendered document pages">
            <div className="project-document-figure__page project-document-figure__page--back" />
            <div className="project-document-figure__page project-document-figure__page--front">
              <span className="project-document-figure__block project-document-figure__block--hero" />
              <span className="project-document-figure__line" />
              <span className="project-document-figure__line project-document-figure__line--short" />
              <span className="project-document-figure__table" />
            </div>
          </div>
          <div className="project-document-figure__outputs">
            {OUTPUT_ITEMS.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>
      </div>
      <figcaption>Project as a Document：一個可版本化的 workspace，同時包含內容、元件、媒體、theme 與輸出設定。</figcaption>
    </figure>
  );
}
