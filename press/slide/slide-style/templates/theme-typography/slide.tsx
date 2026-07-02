import { Frame, Slide, type SlideMeta } from "@open-press/core";
import { defineSlideTheme, ThemeTypographyGraph } from "@open-press/core/theme";

export const meta = {
  layout: "theme-typography",
  description: "Theme audit page showing source typography tokens as a type graph.",
  keypoints: ["Replace or extend type tokens", "Keep type roles semantic"],
} satisfies SlideMeta;

export const notes = "Use this as the typography audit page for a slide style.";

const theme = defineSlideTheme({
  name: "Source Deck",
  colors: {
    bg: { label: "Background", value: "#fcf7e9" },
    ink: { label: "Ink", value: "#16161d" },
    muted: { label: "Muted", value: "#88888c" },
    line: { label: "Line", value: "#88888c" },
    accent: { label: "Accent", value: "#d42a20" },
  },
  fonts: {
    body: '"Source Sans Pro", "PingFang TC", "Noto Sans TC", "Hiragino Sans", "Microsoft JhengHei", ui-sans-serif, system-ui, sans-serif',
    serif: '"Source Serif Pro", "Noto Serif TC", "Songti TC", "Source Han Serif TC", "PMingLiU", serif',
    mono: '"SFMono-Regular", "Menlo", "Consolas", monospace',
  },
  typography: {
    display: { font: "serif", size: 138, lineHeight: 1.05, weight: 400, color: "ink", sample: "A new authoring loop" },
    title: { font: "serif", size: 72, lineHeight: 1.12, weight: 400, color: "ink", sample: "Frame is the page and the region" },
    body: { font: "body", size: 36, lineHeight: 1.48, weight: 400, color: "ink", sample: "Content remains editable after generation." },
    caption: { font: "body", size: 14, lineHeight: 1.3, weight: 700, tracking: "0.16em", color: "muted", transform: "uppercase", sample: "26 June 2024" },
    mono: { font: "mono", size: 18, lineHeight: 1.4, weight: 500, color: "muted", sample: "<Frame frameKey=\"hero\" />" },
  },
});

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page op-source-deck-slide op-template-theme-typography">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Frame frameKey="theme-typography-board" box={{ x: 92, y: 82, w: 1736, h: 916 }}>
          <ThemeTypographyGraph
            theme={theme}
            style={{
              boxSizing: "border-box",
              height: "100%",
              alignContent: "start",
              gap: 34,
              padding: 48,
              border: "2px solid color-mix(in srgb, var(--op-slide-color-line) 46%, transparent)",
              outline: "1px solid color-mix(in srgb, var(--op-slide-color-bg) 72%, transparent)",
              outlineOffset: "-10px",
              background: "var(--op-slide-color-bg)",
            }}
          />
        </Frame>
      </Frame>
    </Slide>
  );
}
