interface FigureProps {
  caption?: string;
  className?: string;
  id?: string;
}

export default function PluginArchitectureFigure({
  caption = "OpenPress Plugin 架構：由 openpress/settings.json 宣告、openpress-plugins 推薦與橋接、外部 Skill 產出並適配為 React Figure 元件",
  className = "",
  id,
}: FigureProps) {
  return (
    <figure
      id={id}
      className={`!mx-auto !my-[var(--openpress-space-4)] !w-full break-inside-avoid ${className}`}
      data-openpress-component="PluginArchitectureFigure"
      aria-label="OpenPress Plugin 架構圖"
    >
      <svg
        role="img"
        viewBox="0 0 760 260"
        className="!h-auto !w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background panel */}
        <rect
          x="4"
          y="4"
          width="752"
          height="252"
          rx="12"
          className="fill-[var(--openpress-color-surface,#18181b)] stroke-[var(--openpress-color-border,#27272a)]"
          strokeWidth="1.5"
        />

        {/* Column 1: Settings & Intent */}
        <g transform="translate(24, 24)">
          <rect
            width="200"
            height="212"
            rx="8"
            className="fill-[var(--openpress-color-document,#09090b)] stroke-[var(--openpress-color-border,#27272a)]"
            strokeWidth="1"
          />
          <text
            x="16"
            y="32"
            className="fill-[var(--openpress-color-text,#fafafa)] text-[12px] font-semibold"
            style={{ fontFamily: "var(--openpress-font-sans, sans-serif)" }}
          >
            1. 宣告與意圖 (Intent)
          </text>
          <rect
            x="16"
            y="48"
            width="168"
            height="64"
            rx="6"
            className="fill-[var(--openpress-color-surface,#18181b)] stroke-[var(--openpress-color-border,#3f3f46)]"
          />
          <text
            x="24"
            y="70"
            className="fill-[var(--openpress-color-accent,#f59e0b)] text-[10px] font-mono font-medium"
          >
            openpress/settings.json
          </text>
          <text
            x="24"
            y="88"
            className="fill-[var(--openpress-color-muted,#a1a1aa)] text-[9px] font-mono"
          >
            "plugins": {"{"}"diagram-design": true{"}"}
          </text>

          <rect
            x="16"
            y="124"
            width="168"
            height="72"
            rx="6"
            className="fill-[var(--openpress-color-surface,#18181b)] stroke-[var(--openpress-color-border,#3f3f46)]"
          />
          <text
            x="24"
            y="146"
            className="fill-[var(--openpress-color-text,#fafafa)] text-[10px] font-medium"
          >
            User / Agent 對話
          </text>
          <text
            x="24"
            y="164"
            className="fill-[var(--openpress-color-muted,#a1a1aa)] text-[9px]"
          >
            「幫我畫系統架構圖」
          </text>
          <text
            x="24"
            y="180"
            className="fill-[var(--openpress-color-accent,#f59e0b)] text-[9px]"
          >
            觸發 Recommendation Card
          </text>
        </g>

        {/* Arrow 1 -> 2 */}
        <path
          d="M236 130 H268"
          className="stroke-[var(--openpress-color-accent,#f59e0b)]"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <polygon
          points="268,126 276,130 268,134"
          className="fill-[var(--openpress-color-accent,#f59e0b)]"
        />

        {/* Column 2: OpenPress Plugins Hub */}
        <g transform="translate(280, 24)">
          <rect
            width="200"
            height="212"
            rx="8"
            className="fill-[var(--openpress-color-document,#09090b)] stroke-[var(--openpress-color-border,#27272a)]"
            strokeWidth="1"
          />
          <text
            x="16"
            y="32"
            className="fill-[var(--openpress-color-text,#fafafa)] text-[12px] font-semibold"
            style={{ fontFamily: "var(--openpress-font-sans, sans-serif)" }}
          >
            2. 插件中樞 (Plugin Hub)
          </text>

          <rect
            x="16"
            y="48"
            width="168"
            height="64"
            rx="6"
            className="fill-[var(--openpress-color-surface,#18181b)] stroke-[var(--openpress-color-border,#3f3f46)]"
          />
          <text
            x="24"
            y="70"
            className="fill-[var(--openpress-color-text,#fafafa)] text-[10px] font-semibold"
          >
            openpress-plugins
          </text>
          <text
            x="24"
            y="88"
            className="fill-[var(--openpress-color-muted,#a1a1aa)] text-[9px]"
          >
            • catalog.json 比對
          </text>
          <text
            x="24"
            y="102"
            className="fill-[var(--openpress-color-muted,#a1a1aa)] text-[9px]"
          >
            • doctor 健康診斷
          </text>

          <rect
            x="16"
            y="124"
            width="168"
            height="72"
            rx="6"
            className="fill-[var(--openpress-color-surface,#18181b)] stroke-[var(--openpress-color-accent,#f59e0b)]"
            strokeWidth="1.5"
          />
          <text
            x="24"
            y="146"
            className="fill-[var(--openpress-color-accent,#f59e0b)] text-[10px] font-semibold"
          >
            diagram-design (外部 Skill)
          </text>
          <text
            x="24"
            y="164"
            className="fill-[var(--openpress-color-muted,#a1a1aa)] text-[9px]"
          >
            專門產出結構化 SVG 與
          </text>
          <text
            x="24"
            y="180"
            className="fill-[var(--openpress-color-muted,#a1a1aa)] text-[9px]"
          >
            高階系統拓撲圖表
          </text>
        </g>

        {/* Arrow 2 -> 3 */}
        <path
          d="M492 130 H524"
          className="stroke-[var(--openpress-color-accent,#f59e0b)]"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <polygon
          points="524,126 532,130 524,134"
          className="fill-[var(--openpress-color-accent,#f59e0b)]"
        />

        {/* Column 3: Adapted OpenPress Artifacts */}
        <g transform="translate(536, 24)">
          <rect
            width="200"
            height="212"
            rx="8"
            className="fill-[var(--openpress-color-document,#09090b)] stroke-[var(--openpress-color-border,#27272a)]"
            strokeWidth="1"
          />
          <text
            x="16"
            y="32"
            className="fill-[var(--openpress-color-text,#fafafa)] text-[12px] font-semibold"
            style={{ fontFamily: "var(--openpress-font-sans, sans-serif)" }}
          >
            3. 原生交付 (Artifacts)
          </text>

          <rect
            x="16"
            y="48"
            width="168"
            height="64"
            rx="6"
            className="fill-[var(--openpress-color-surface,#18181b)] stroke-[var(--openpress-color-border,#3f3f46)]"
          />
          <text
            x="24"
            y="70"
            className="fill-[var(--openpress-color-text,#fafafa)] text-[10px] font-mono font-medium"
          >
            components/figures/
          </text>
          <text
            x="24"
            y="88"
            className="fill-[var(--openpress-color-muted,#a1a1aa)] text-[9px]"
          >
            &lt;NameFigure.tsx /&gt;
          </text>
          <text
            x="24"
            y="102"
            className="fill-[var(--openpress-color-muted,#a1a1aa)] text-[9px]"
          >
            語義 figure、ARIA、Tokens
          </text>

          <rect
            x="16"
            y="124"
            width="168"
            height="72"
            rx="6"
            className="fill-[var(--openpress-color-surface,#18181b)] stroke-[var(--openpress-color-border,#3f3f46)]"
          />
          <text
            x="24"
            y="146"
            className="fill-[var(--openpress-color-text,#fafafa)] text-[10px] font-medium"
          >
            media/figures/ &amp; MDX
          </text>
          <text
            x="24"
            y="164"
            className="fill-[var(--openpress-color-muted,#a1a1aa)] text-[9px] font-mono"
          >
            &lt;name&gt;.asset.json
          </text>
          <text
            x="24"
            y="180"
            className="fill-[var(--openpress-color-muted,#a1a1aa)] text-[9px]"
          >
            同源渲染 Web, PDF, DOCX
          </text>
        </g>
      </svg>
      {caption && (
        <figcaption className="!mt-[var(--openpress-space-2)] !text-center !text-[var(--openpress-color-muted,#a1a1aa)] !text-[clamp(7pt,1.2cqw,8pt)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
