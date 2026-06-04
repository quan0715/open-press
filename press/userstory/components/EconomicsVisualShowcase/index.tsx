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

export default function EconomicsVisualShowcase() {
  return (
    <figure
      className="economics-visual-showcase"
      data-openpress-component="EconomicsVisualShowcase"
      aria-label="Economics report visual component examples"
    >
      <div className="economics-visual-showcase__grid">
        <section className="economics-visual-showcase__panel economics-visual-showcase__panel--flow">
          <p className="economics-visual-showcase__kicker">流程圖</p>
          <div className="economics-visual-showcase__flow" aria-label="Policy impact flow">
            {["政策變動", "誘因改變", "行為反應", "效果討論"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section className="economics-visual-showcase__panel economics-visual-showcase__panel--variables">
          <p className="economics-visual-showcase__kicker">變數圖</p>
          <div className="economics-visual-showcase__variable-map" aria-label="Variable relationship map">
            <span className="economics-visual-showcase__node economics-visual-showcase__node--top">價格</span>
            <span className="economics-visual-showcase__node economics-visual-showcase__node--left">需求</span>
            <span className="economics-visual-showcase__node economics-visual-showcase__node--right">供給</span>
            <span className="economics-visual-showcase__node economics-visual-showcase__node--bottom">福利效果</span>
            <span className="economics-visual-showcase__axis economics-visual-showcase__axis--x" />
            <span className="economics-visual-showcase__axis economics-visual-showcase__axis--y" />
          </div>
        </section>

        <section className="economics-visual-showcase__panel economics-visual-showcase__panel--data">
          <p className="economics-visual-showcase__kicker">資料圖</p>
          <div className="economics-visual-showcase__charts" aria-label="Generated chart examples">
            <div className="economics-visual-showcase__pie" aria-label="Household spending pie chart">
              <span>42%</span>
            </div>
            <div className="economics-visual-showcase__line" aria-label="Trend line chart">
              <svg viewBox="0 0 160 74" role="img" aria-label="Example line chart">
                <polyline points="6,62 34,54 62,47 90,31 122,37 154,18" />
                <circle cx="6" cy="62" r="2.5" />
                <circle cx="34" cy="54" r="2.5" />
                <circle cx="62" cy="47" r="2.5" />
                <circle cx="90" cy="31" r="2.5" />
                <circle cx="122" cy="37" r="2.5" />
                <circle cx="154" cy="18" r="2.5" />
              </svg>
            </div>
          </div>
        </section>

        <section className="economics-visual-showcase__panel economics-visual-showcase__panel--prompt">
          <p className="economics-visual-showcase__kicker">可複製 Prompt</p>
          <div className="economics-visual-showcase__prompt-list">
            {PROMPT_CARDS.map((card) => (
              <article className="economics-visual-showcase__prompt-card" key={card.label}>
                <span>{card.label}</span>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
      <figcaption>經濟學報告的視覺素材應先服務內容：用流程圖說明機制、用變數圖整理關係，也可以根據資料做圓餅圖與折線圖。</figcaption>
    </figure>
  );
}
