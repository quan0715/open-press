const PROJECT_ITEMS = [
  ["openpress.config.mjs", "document identity"],
  ["document/index.tsx", "Press tree"],
  ["chapters/*.mdx", "manuscript"],
  ["theme/tokens.css", "visual rules"],
  ["components/*", "reusable blocks"],
  ["media/*", "document assets"],
];

const OUTPUT_ITEMS = ["Workbench", "Web reader", "PDF"];

const FIGURE_CLASS = "!mx-auto !my-[var(--openpress-space-4)] !w-[min(100%,164mm)] break-inside-avoid";
const STAGE_CLASS =
  "grid min-h-[86mm] grid-cols-[minmax(0,1fr)_18mm_minmax(0,0.9fr)] items-stretch gap-0 border border-[var(--openpress-color-line)] bg-[linear-gradient(90deg,rgb(179_74_45_/_6%),transparent_36%),var(--openpress-color-document)]";
const SOURCE_PANEL_CLASS = "relative flex min-w-0 flex-col p-[6mm]";
const DOCUMENT_PANEL_CLASS =
  "relative flex min-w-0 flex-col items-center justify-between border-l border-[var(--openpress-color-line)] p-[6mm]";
const EYEBROW_CLASS =
  "text-[clamp(3.4pt,1.3cqw,7.2pt)] uppercase tracking-[0.18em] text-[var(--openpress-color-muted)] [font-family:var(--openpress-font-mono)]";
const TREE_CLASS = "mt-[5mm] grid gap-[1.8mm]";
const ROW_CLASS =
  "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-[3mm] border-b border-[var(--openpress-color-line)] py-[2.1mm]";
const ROW_PATH_CLASS =
  "text-[clamp(3.6pt,1.45cqw,8.2pt)] text-[var(--openpress-color-ink)] [font-family:var(--openpress-font-mono)] [overflow-wrap:anywhere]";
const ROW_ROLE_CLASS =
  "whitespace-nowrap text-[clamp(3.4pt,1.25cqw,7.4pt)] text-[var(--openpress-color-muted)] [font-family:var(--openpress-font-body)]";
const BRIDGE_CLASS = "grid place-items-center border-l border-[var(--openpress-color-line)]";
const BRIDGE_LINE_CLASS = "relative block h-px w-[13mm] bg-[var(--openpress-color-muted)]";
const BRIDGE_DOT_CLASS =
  "absolute left-0 top-1/2 h-[3mm] w-[3mm] -translate-y-1/2 rounded-full border border-[var(--openpress-color-muted)]";
const BRIDGE_ARROW_CLASS =
  "absolute right-0 top-1/2 h-[5mm] w-[5mm] -translate-y-1/2 rotate-45 border-r border-t border-[var(--openpress-color-muted)]";
const PAGE_STACK_CLASS = "relative mx-auto mb-[2mm] mt-[3mm] aspect-[0.72] w-[min(48mm,72%)]";
const PAGE_CLASS =
  "absolute inset-0 border border-[var(--openpress-color-ink)] bg-white shadow-[0_6px_18px_rgb(0_0_0_/_6%)]";
const PAGE_BACK_CLASS = `${PAGE_CLASS} translate-x-[5mm] translate-y-[-4mm] bg-[#f8f4ea] opacity-55`;
const PAGE_FRONT_CLASS = `${PAGE_CLASS} grid grid-rows-[16mm_1px_1px_1fr] gap-[4mm] p-[6mm]`;
const PAGE_HERO_CLASS = "block bg-[rgb(179_74_45_/_18%)]";
const PAGE_LINE_CLASS = "block h-px bg-[var(--openpress-color-line)]";
const PAGE_SHORT_LINE_CLASS = `${PAGE_LINE_CLASS} w-[68%]`;
const PAGE_TABLE_CLASS =
  "block min-h-[18mm] self-end bg-[linear-gradient(var(--openpress-color-line)_1px,transparent_1px),linear-gradient(90deg,var(--openpress-color-line)_1px,transparent_1px),rgb(132_146_115_/_12%)] [background-size:100%_4.5mm,12mm_100%,100%_100%]";
const OUTPUTS_CLASS = "flex w-full flex-wrap justify-center gap-[1.6mm]";
const OUTPUT_CHIP_CLASS =
  "border border-[var(--openpress-color-line)] px-[2.3mm] py-[1.5mm] text-[clamp(3.4pt,1.25cqw,7.4pt)] leading-none text-[var(--openpress-color-ink)]";

export default function ProjectAsDocumentFigure() {
  return (
    <figure
      className={FIGURE_CLASS}
      data-openpress-component="ProjectAsDocumentFigure"
      aria-label="Project as a document illustration"
    >
      <div className={STAGE_CLASS}>
        <section className={SOURCE_PANEL_CLASS}>
          <div className={EYEBROW_CLASS}>workspace</div>
          <div className={TREE_CLASS} aria-label="OpenPress project tree">
            {PROJECT_ITEMS.map(([path, role]) => (
              <div className={ROW_CLASS} key={path}>
                <span className={ROW_PATH_CLASS}>{path}</span>
                <small className={ROW_ROLE_CLASS}>{role}</small>
              </div>
            ))}
          </div>
        </section>

        <div className={BRIDGE_CLASS} aria-hidden="true">
          <span className={BRIDGE_LINE_CLASS}>
            <span className={BRIDGE_DOT_CLASS} />
            <span className={BRIDGE_ARROW_CLASS} />
          </span>
        </div>

        <section className={DOCUMENT_PANEL_CLASS}>
          <div className={EYEBROW_CLASS}>document</div>
          <div className={PAGE_STACK_CLASS} aria-label="Rendered document pages">
            <div className={PAGE_BACK_CLASS} />
            <div className={PAGE_FRONT_CLASS}>
              <span className={PAGE_HERO_CLASS} />
              <span className={PAGE_LINE_CLASS} />
              <span className={PAGE_SHORT_LINE_CLASS} />
              <span className={PAGE_TABLE_CLASS} />
            </div>
          </div>
          <div className={OUTPUTS_CLASS}>
            {OUTPUT_ITEMS.map((item) => (
              <span className={OUTPUT_CHIP_CLASS} key={item}>{item}</span>
            ))}
          </div>
        </section>
      </div>
      <figcaption>Project as a Document：一個可版本化的 workspace，同時包含內容、元件、媒體、theme 與輸出設定。</figcaption>
    </figure>
  );
}
