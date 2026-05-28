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

export default function UserStoryPhaseFigure({ phase = "prep" }: { phase?: Phase }) {
  const data = PHASES[phase] ?? PHASES.prep;

  return (
    <figure
      className="user-story-phase-figure"
      data-openpress-component="UserStoryPhaseFigure"
      data-phase={phase}
      aria-label={data.title}
    >
      <div className="user-story-phase-figure__stage">
        <header className="user-story-phase-figure__header">
          <span>{data.eyebrow}</span>
          <strong>{data.title}</strong>
        </header>
        <div className="user-story-phase-figure__track">
          {data.nodes.map((node, index) => (
            <div className="user-story-phase-figure__node" key={node}>
              <span>{node}</span>
              {index < data.nodes.length - 1 ? <i aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
        <p className="user-story-phase-figure__output">{data.output}</p>
      </div>
      <figcaption>{data.caption}</figcaption>
    </figure>
  );
}
