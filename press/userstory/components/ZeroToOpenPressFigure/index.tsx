const STEPS = [
  {
    title: "前置準備",
    detail: "工具、資料夾、老師要求",
  },
  {
    title: "OpenPress 協作",
    detail: "報告骨架、章節、圖表",
  },
  {
    title: "反覆微調",
    detail: "文字、視覺、頁面",
  },
];

const FIGURE_CLASS = "!mx-auto !my-[var(--openpress-space-4)] !w-[min(100%,166mm)] break-inside-avoid";
const STAGE_CLASS =
  "border border-[var(--openpress-color-line)] bg-[linear-gradient(120deg,rgb(255_176_0_/_12%),transparent_38%),linear-gradient(300deg,rgb(31_35_40_/_6%),transparent_34%),var(--openpress-color-document)] p-[7mm]";
const HEADLINE_CLASS = "mb-[6mm] grid gap-[1.4mm]";
const EYEBROW_CLASS =
  "text-[clamp(4pt,1.4cqw,7.4pt)] uppercase tracking-[0.14em] text-[var(--openpress-color-muted)] [font-family:var(--openpress-font-mono)]";
const HEADLINE_TEXT_CLASS =
  "text-[clamp(11pt,2.7cqw,18pt)] font-light leading-[1.2] text-[var(--openpress-color-ink)] [font-family:var(--openpress-font-serif)]";
const FLOW_CLASS =
  "grid grid-cols-3 gap-0 border-y border-[var(--openpress-color-line)]";
const STEP_CLASS =
  "relative grid min-h-[34mm] min-w-0 content-start gap-[2mm] border-r border-[var(--openpress-color-line)] px-[4mm] pb-[4mm] pt-[5mm] last:border-r-0";
const STEP_TITLE_CLASS =
  "text-[clamp(5.8pt,1.65cqw,9pt)] font-semibold leading-[1.25] text-[var(--openpress-color-ink)]";
const STEP_DETAIL_CLASS =
  "text-[clamp(4.8pt,1.38cqw,7.6pt)] leading-[1.35] text-[var(--openpress-color-muted)] [overflow-wrap:anywhere]";
const ARROW_CLASS =
  "absolute right-[-2.8mm] top-1/2 z-[1] h-[5.6mm] w-[5.6mm] -translate-y-1/2 rotate-45 border-r border-t border-[var(--openpress-color-muted)] bg-[var(--openpress-color-document)]";

export default function ZeroToOpenPressFigure() {
  return (
    <figure
      className={FIGURE_CLASS}
      data-openpress-component="ZeroToOpenPressFigure"
      aria-label="How to start using OpenPress from zero"
    >
      <div className={STAGE_CLASS}>
        <div className={HEADLINE_CLASS}>
          <span className={EYEBROW_CLASS}>從 0 開始</span>
          <strong className={HEADLINE_TEXT_CLASS}>從期末報告要求到正式成品</strong>
        </div>
        <div className={FLOW_CLASS} aria-label="OpenPress start workflow">
          {STEPS.map((step, index) => (
            <div className={STEP_CLASS} key={step.title}>
              <b className={STEP_TITLE_CLASS}>{step.title}</b>
              <small className={STEP_DETAIL_CLASS}>{step.detail}</small>
              {index < STEPS.length - 1 ? <span className={ARROW_CLASS} aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      </div>
      <figcaption>從 0 開始使用 OpenPress：先把老師要求與參考資料整理清楚，再用 OpenPress 協作產生有文字、圖表與版面的正式報告。</figcaption>
    </figure>
  );
}
