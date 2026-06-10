const PROMPT_CARDS = [
  {
    label: "概念圖",
    text: "請把外送平台補貼、價格、需求與勞動供給畫成變數關係圖。",
  },
  {
    label: "流程圖",
    text: "請用政策、誘因、行為反應、可能效果四層整理這段分析。",
  },
  {
    label: "數據圖",
    text: "請根據這份 CSV 產生一張折線圖與一張圓餅圖，並附上 caption。",
  },
];

const FLOW_STEPS = [
  { label: "政策變動", className: "bg-[var(--openpress-chart-gold-bg)]" },
  { label: "誘因改變", className: "bg-[var(--openpress-chart-coral-bg)]" },
  { label: "行為反應", className: "bg-[var(--openpress-chart-coral-deep-bg)]" },
  { label: "效果討論", className: "bg-[var(--openpress-chart-dark-bg)]" },
];

const FIGURE_CLASS = "!mx-auto !my-[var(--openpress-space-4)] !w-[min(100%,166mm)] break-inside-avoid";
const GRID_CLASS = "grid grid-cols-2 gap-[3mm]";
const PANEL_CLASS = "min-w-0 border border-[var(--openpress-color-line)] bg-[var(--openpress-color-document)] p-[4.5mm]";
const WIDE_PANEL_CLASS = `${PANEL_CLASS} col-span-full`;
const KICKER_CLASS =
  "!mb-[3mm] !mt-0 text-[clamp(4pt,1.3cqw,7pt)] uppercase leading-none tracking-[0.14em] text-[var(--openpress-color-muted)] [font-family:var(--openpress-font-mono)]";
const FLOW_CLASS =
  "grid min-h-[42mm] grid-cols-4 border-l border-t border-[var(--openpress-color-line)]";
const FLOW_ITEM_BASE_CLASS =
  "relative grid place-items-center border-b border-r border-[var(--openpress-color-line)] p-[3mm] text-center text-[clamp(5pt,1.45cqw,8pt)] font-semibold leading-[1.25] text-[var(--openpress-color-ink)]";
const FLOW_ARROW_CLASS =
  "absolute right-[-2.2mm] top-1/2 z-[1] h-[4.4mm] w-[4.4mm] -translate-y-1/2 rotate-45 border-r border-t border-[var(--openpress-color-muted)] bg-[var(--openpress-color-document)]";
const VARIABLE_MAP_CLASS =
  "relative min-h-[42mm] border border-[var(--openpress-color-line)] bg-[linear-gradient(var(--openpress-color-soft-line)_1px,transparent_1px),linear-gradient(90deg,var(--openpress-color-soft-line)_1px,transparent_1px),rgb(31_35_40_/_2.5%)] [background-size:100%_10mm,14mm_100%,100%_100%]";
const NODE_BASE_CLASS =
  "absolute z-[2] grid min-h-[9mm] min-w-[18mm] place-items-center border border-[var(--openpress-chart-dark-border)] bg-white px-[2mm] py-[1.2mm] text-[clamp(5pt,1.5cqw,8pt)] font-semibold leading-[1.1] text-[var(--openpress-color-ink)]";
const NODE_TOP_CLASS = `${NODE_BASE_CLASS} left-1/2 top-[3mm] -translate-x-1/2`;
const NODE_LEFT_CLASS = `${NODE_BASE_CLASS} left-[5mm] top-[17mm]`;
const NODE_RIGHT_CLASS = `${NODE_BASE_CLASS} right-[5mm] top-[17mm]`;
const NODE_BOTTOM_CLASS = `${NODE_BASE_CLASS} bottom-[3mm] left-1/2 -translate-x-1/2 bg-[var(--openpress-chart-gold-bg)]`;
const AXIS_BASE_CLASS = "absolute block bg-[var(--openpress-color-muted)] opacity-70";
const AXIS_X_CLASS = `${AXIS_BASE_CLASS} left-[20mm] right-[20mm] top-[22mm] h-px`;
const AXIS_Y_CLASS = `${AXIS_BASE_CLASS} bottom-[12mm] left-1/2 top-[12mm] w-px`;
const CHARTS_CLASS =
  "grid min-h-[40mm] grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] items-center gap-[5mm]";
const PIE_CLASS =
  "mx-auto grid aspect-square w-[min(32mm,100%)] place-items-center rounded-full bg-[radial-gradient(circle_at_center,var(--openpress-color-document)_0_34%,transparent_35%),conic-gradient(var(--openpress-chart-gold)_0_42%,var(--openpress-chart-coral)_42%_70%,var(--openpress-chart-coral-deep)_70%_86%,var(--openpress-chart-dark)_86%_100%)]";
const PIE_VALUE_CLASS =
  "text-[clamp(7pt,1.9cqw,11pt)] font-bold leading-none text-[var(--openpress-color-ink)] [font-family:var(--openpress-font-mono)]";
const LINE_CHART_CLASS =
  "min-w-0 border border-[var(--openpress-color-line)] bg-[linear-gradient(var(--openpress-color-soft-line)_1px,transparent_1px),linear-gradient(90deg,var(--openpress-color-soft-line)_1px,transparent_1px),rgb(255_176_0_/_5.5%)] p-[3mm] [background-size:100%_9mm,14mm_100%,100%_100%]";
const LINE_SVG_CLASS = "block h-[31mm] w-full";
const LINE_POLYLINE_CLASS =
  "fill-none stroke-[var(--openpress-chart-coral-deep)] stroke-[3] [stroke-linecap:round] [stroke-linejoin:round]";
const LINE_POINT_CLASS =
  "fill-[var(--openpress-color-document)] stroke-[var(--openpress-chart-coral-deep)] stroke-[2]";
const PROMPT_LIST_CLASS = "grid grid-cols-3 gap-[3mm]";
const PROMPT_CARD_CLASS =
  "min-h-[28mm] min-w-0 border border-[var(--openpress-color-line)] bg-[rgb(255_176_0_/_7%)] p-[3.5mm]";
const PROMPT_LABEL_CLASS =
  "mb-[2mm] block text-[clamp(4pt,1.25cqw,7pt)] leading-none tracking-[0.1em] text-[var(--openpress-color-muted)] [font-family:var(--openpress-font-mono)]";
const PROMPT_TEXT_CLASS =
  "!m-0 text-[clamp(5pt,1.45cqw,8pt)] leading-[1.45] text-[var(--openpress-color-ink)]";

export default function EconomicsVisualShowcase() {
  return (
    <figure
      className={FIGURE_CLASS}
      data-openpress-component="EconomicsVisualShowcase"
      aria-label="Economics report visual component examples"
    >
      <div className={GRID_CLASS}>
        <section className={PANEL_CLASS}>
          <p className={KICKER_CLASS}>流程圖</p>
          <div className={FLOW_CLASS} aria-label="Policy impact flow">
            {FLOW_STEPS.map((item, index) => (
              <span className={`${FLOW_ITEM_BASE_CLASS} ${item.className}`} key={item.label}>
                {item.label}
                {index < FLOW_STEPS.length - 1 ? <span className={FLOW_ARROW_CLASS} aria-hidden="true" /> : null}
              </span>
            ))}
          </div>
        </section>

        <section className={PANEL_CLASS}>
          <p className={KICKER_CLASS}>變數圖</p>
          <div className={VARIABLE_MAP_CLASS} aria-label="Variable relationship map">
            <span className={NODE_TOP_CLASS}>價格</span>
            <span className={NODE_LEFT_CLASS}>需求</span>
            <span className={NODE_RIGHT_CLASS}>供給</span>
            <span className={NODE_BOTTOM_CLASS}>福利效果</span>
            <span className={AXIS_X_CLASS} />
            <span className={AXIS_Y_CLASS} />
          </div>
        </section>

        <section className={WIDE_PANEL_CLASS}>
          <p className={KICKER_CLASS}>資料圖</p>
          <div className={CHARTS_CLASS} aria-label="Generated chart examples">
            <div className={PIE_CLASS} aria-label="Household spending pie chart">
              <span className={PIE_VALUE_CLASS}>42%</span>
            </div>
            <div className={LINE_CHART_CLASS} aria-label="Trend line chart">
              <svg className={LINE_SVG_CLASS} viewBox="0 0 160 74" role="img" aria-label="Example line chart">
                <polyline className={LINE_POLYLINE_CLASS} points="6,62 34,54 62,47 90,31 122,37 154,18" />
                <circle className={LINE_POINT_CLASS} cx="6" cy="62" r="2.5" />
                <circle className={LINE_POINT_CLASS} cx="34" cy="54" r="2.5" />
                <circle className={LINE_POINT_CLASS} cx="62" cy="47" r="2.5" />
                <circle className={LINE_POINT_CLASS} cx="90" cy="31" r="2.5" />
                <circle className={LINE_POINT_CLASS} cx="122" cy="37" r="2.5" />
                <circle className={LINE_POINT_CLASS} cx="154" cy="18" r="2.5" />
              </svg>
            </div>
          </div>
        </section>

        <section className={WIDE_PANEL_CLASS}>
          <p className={KICKER_CLASS}>可複製 Prompt</p>
          <div className={PROMPT_LIST_CLASS}>
            {PROMPT_CARDS.map((card) => (
              <article className={PROMPT_CARD_CLASS} key={card.label}>
                <span className={PROMPT_LABEL_CLASS}>{card.label}</span>
                <p className={PROMPT_TEXT_CLASS}>{card.text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
      <figcaption>經濟學報告的視覺素材應先服務內容：用流程圖說明機制、用變數圖整理關係，也可以根據資料做圓餅圖與折線圖。</figcaption>
    </figure>
  );
}
