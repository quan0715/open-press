import { Frame, Slide, type SlideMeta } from "@open-press/core";
import { defineTheme, ThemeColorSwatches } from "@open-press/core/theme";

export const meta = {
  layout: "theme-colors",
  description: "Theme audit page showing source color tokens as swatches.",
  keypoints: ["Replace or extend theme colors", "Keep color tokens semantic"],
} satisfies SlideMeta;

export const notes = "Use this as the color audit page for a slide style.";

const theme = defineTheme({
  name: "Source Deck",
  colors: {
    bg: { label: "Background", value: "#fcf7e9" },
    ink: { label: "Ink", value: "#16161d" },
    muted: { label: "Muted", value: "#88888c" },
    line: { label: "Line", value: "#88888c" },
    accent: { label: "Accent", value: "#d42a20" },
    quote: { label: "Quote", value: "#0e638e" },
    warning: { label: "Warning", value: "#fac22b" },
    success: { label: "Success", value: "#0e8e51" },
  },
  fonts: {
    body: '"Source Sans Pro", ui-sans-serif, system-ui, sans-serif',
    mono: '"SFMono-Regular", "Menlo", "Consolas", monospace',
  },
});

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page op-source-deck-slide op-template-theme-colors">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Frame frameKey="theme-colors-board" box={{ x: 92, y: 82, w: 1736, h: 916 }}>
          <ThemeColorSwatches
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
