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

export default function ZeroToOpenPressFigure() {
  return (
    <figure
      className="zero-openpress-figure"
      data-openpress-component="ZeroToOpenPressFigure"
      aria-label="How to start using OpenPress from zero"
    >
      <div className="zero-openpress-figure__stage">
        <div className="zero-openpress-figure__headline">
          <span>從 0 開始</span>
          <strong>從期末報告要求到正式成品</strong>
        </div>
        <div className="zero-openpress-figure__flow" aria-label="OpenPress start workflow">
          {STEPS.map((step, index) => (
            <div className="zero-openpress-figure__step" key={step.title}>
              <b>{step.title}</b>
              <small>{step.detail}</small>
              {index < STEPS.length - 1 ? <span className="zero-openpress-figure__arrow" aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      </div>
      <figcaption>從 0 開始使用 OpenPress：先把老師要求與參考資料整理清楚，再用 OpenPress 協作產生有文字、圖表與版面的正式報告。</figcaption>
    </figure>
  );
}
