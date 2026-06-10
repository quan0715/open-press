type Phase = "prep" | "openpress" | "iterate";

const PHASES: Record<Phase, {
  eyebrow: string;
  title: string;
  nodes: string[];
  output: string;
  caption: string;
}> = {
  prep: {
    eyebrow: "開始前",
    title: "先整理工具與課堂資料",
    nodes: ["AI 工具", "老師要求", "參考資料", "報告大綱"],
    output: "看得懂、能開始寫的報告方向",
    caption: "前置準備階段：先選一個 AI 工具，整理老師要求、參考資料與自己的研究方向。",
  },
  openpress: {
    eyebrow: "生成報告",
    title: "用 OpenPress 做出報告",
    nodes: ["封面目錄", "章節草稿", "圖表", "引用整理"],
    output: "有版面、有圖表的期末報告",
    caption: "OpenPress 協作階段：把整理好的大綱轉成章節、圖表與可檢查的正式報告。",
  },
  iterate: {
    eyebrow: "微調交付",
    title: "一輪一輪修到能交",
    nodes: ["改文字", "補圖表", "調頁面", "匯出"],
    output: "可繳交版本與可分享截圖",
    caption: "微調階段：用一輪一輪 prompt 修正文體、補圖表、調整頁面節奏，再輸出可繳交版本。",
  },
};

const FIGURE_CLASS = "!mx-auto !my-[var(--openpress-space-4)] !w-[min(100%,160mm)] break-inside-avoid";
const STAGE_CLASS_BY_PHASE: Record<Phase, string> = {
  prep:
    "border border-[var(--openpress-color-line)] bg-[linear-gradient(120deg,rgb(255_176_0_/_11%),transparent_40%),linear-gradient(300deg,rgb(31_35_40_/_5.5%),transparent_34%),var(--openpress-color-document)] p-[6mm]",
  openpress:
    "border border-[var(--openpress-color-line)] bg-[linear-gradient(120deg,rgb(255_106_77_/_10%),transparent_40%),linear-gradient(300deg,rgb(31_35_40_/_5.5%),transparent_34%),var(--openpress-color-document)] p-[6mm]",
  iterate:
    "border border-[var(--openpress-color-line)] bg-[linear-gradient(120deg,rgb(92_140_79_/_10%),transparent_40%),linear-gradient(300deg,rgb(31_35_40_/_5.5%),transparent_34%),var(--openpress-color-document)] p-[6mm]",
};
const HEADER_CLASS = "mb-[5mm] grid gap-[1.4mm]";
const EYEBROW_CLASS =
  "text-[clamp(4pt,1.3cqw,7pt)] uppercase leading-none tracking-[0.14em] text-[var(--openpress-color-muted)] [font-family:var(--openpress-font-mono)]";
const TITLE_CLASS =
  "text-[clamp(10pt,2.35cqw,16pt)] font-light leading-[1.22] text-[var(--openpress-color-ink)] [font-family:var(--openpress-font-serif)]";
const TRACK_CLASS =
  "grid grid-cols-4 border-l border-t border-[var(--openpress-color-line)]";
const NODE_CLASS =
  "relative grid min-h-[25mm] min-w-0 place-items-center border-b border-r border-[var(--openpress-color-line)] bg-white/62 p-[3mm]";
const NODE_TEXT_CLASS =
  "text-center text-[clamp(4.7pt,1.35cqw,7.6pt)] leading-[1.2] text-[var(--openpress-color-ink)] [font-family:var(--openpress-font-mono)] [overflow-wrap:anywhere]";
const ARROW_CLASS =
  "absolute right-[-2.2mm] top-1/2 z-[1] h-[4.4mm] w-[4.4mm] -translate-y-1/2 rotate-45 border-r border-t border-[var(--openpress-color-muted)] bg-[var(--openpress-color-document)]";
const OUTPUT_CLASS =
  "!mb-0 !mt-[4mm] text-[clamp(5.4pt,1.55cqw,8.6pt)] font-semibold leading-[1.45] text-[var(--openpress-color-ink)]";

export default function UserStoryPhaseFigure({ phase = "prep" }: { phase?: Phase }) {
  const data = PHASES[phase] ?? PHASES.prep;

  return (
    <figure
      className={FIGURE_CLASS}
      data-openpress-component="UserStoryPhaseFigure"
      data-phase={phase}
      aria-label={data.title}
    >
      <div className={STAGE_CLASS_BY_PHASE[phase] ?? STAGE_CLASS_BY_PHASE.prep}>
        <header className={HEADER_CLASS}>
          <span className={EYEBROW_CLASS}>{data.eyebrow}</span>
          <strong className={TITLE_CLASS}>{data.title}</strong>
        </header>
        <div className={TRACK_CLASS}>
          {data.nodes.map((node, index) => (
            <div className={NODE_CLASS} key={node}>
              <span className={NODE_TEXT_CLASS}>{node}</span>
              {index < data.nodes.length - 1 ? <i className={ARROW_CLASS} aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
        <p className={OUTPUT_CLASS}>{data.output}</p>
      </div>
      <figcaption>{data.caption}</figcaption>
    </figure>
  );
}
