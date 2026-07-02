import { Press, Slide } from "@open-press/core";
import { defineSlideTheme } from "@open-press/core/theme";

const slideTheme = defineSlideTheme({
  name: "OpenPress Source Deck",
  description: "Slide theme for the OpenPress agent workflow dogfood deck.",
  colors: {
    bg: "#fcf7e9",
    surface: "#fcf7e9",
    surfaceMuted: "#fefbf4",
    ink: "#16161d",
    muted: "#88888c",
    line: "#88888c",
    accent: "#d42a20",
    quote: "#0e638e",
    success: "#0e8e51",
    warning: "#fac22b",
    danger: "#d42a20",
    marker: "#d42a20",
  },
  fonts: {
    sans: '"Source Sans Pro", "PingFang TC", "Noto Sans TC", "Hiragino Sans", "Microsoft JhengHei", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    body: '"Source Sans Pro", "PingFang TC", "Noto Sans TC", "Hiragino Sans", "Microsoft JhengHei", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    serif: '"Source Serif Pro", "Noto Serif TC", "Songti TC", "Source Han Serif TC", "PMingLiU", serif',
    mono: '"SFMono-Regular", "Menlo", "Consolas", monospace',
  },
  typography: {
    display: { font: "serif", size: "138px", lineHeight: 1.05, weight: 400, color: "ink", sample: "Build presentations with OpenPress + Agent." },
    title: { font: "serif", size: "72px", lineHeight: 1.12, weight: 400, color: "ink", sample: "Frame is the page and the region" },
    section: { font: "serif", size: "72px", lineHeight: 1.16, weight: 400, color: "ink", sample: "Agent workflow" },
    lead: { font: "sans", size: "33px", lineHeight: 1.55, weight: 400, color: "muted", sample: "OpenPress keeps the source editable." },
    body: { font: "sans", size: "36px", lineHeight: 1.48, weight: 400, color: "muted", sample: "The deck is a sequence of source-backed slides." },
    caption: { font: "sans", size: "14px", lineHeight: 1.3, weight: 400, color: "muted", sample: "Source backed" },
    eyebrow: { font: "sans", size: "27px", lineHeight: 1, weight: 800, color: "muted", transform: "uppercase", sample: "OPENPRESS DOGFOOD" },
    marker: { font: "mono", size: "48px", lineHeight: 1, weight: 800, color: "marker", sample: "01" },
    quote: { font: "serif", size: "47px", lineHeight: 1.48, weight: 400, color: "quote", sample: "The user owns intent." },
    mono: { font: "mono", size: "18px", lineHeight: 1.4, weight: 500, color: "muted", sample: "press/slide/press.tsx" },
  },
  extend: {
    typography: {
      label: { font: "sans", size: "27px", lineHeight: 1, weight: 800, color: "muted", transform: "uppercase", sample: "OPENPRESS DOGFOOD" },
      statement: { font: "serif", size: "72px", lineHeight: 1.12, weight: 400, color: "accent", sample: "Agent output remains source." },
      agendaThesis: { font: "serif", size: "64px", lineHeight: 1.17, weight: 400, color: "ink", sample: "A source-first presentation model" },
      agendaItem: { font: "sans", size: "39px", lineHeight: 1.22, weight: 400, color: "ink", sample: "Brief, scaffold, outline, draft" },
      quoteSmall: { font: "serif", size: "35px", lineHeight: 1.42, weight: 400, color: "quote", sample: "Review the source, not only the screenshot." },
      metric: { font: "sans", size: "104px", lineHeight: 0.94, weight: 800, color: "ink", sample: "source" },
      metricLabel: { font: "sans", size: "24px", lineHeight: 1.3, weight: 400, color: "muted", sample: "Editable slide source" },
      checklist: { font: "sans", size: "30px", lineHeight: 1.25, weight: 400, color: "ink", sample: "Validated build output" },
      source: { font: "sans", size: "11px", lineHeight: 1.35, weight: 400, color: "muted", sample: "press/slide/slides" },
    },
  },
});

export default function SlidePress() {
  return (
    <Press
      slug="slide"
      title="Hello OpenPress Slide"
      type="slides"
      page="slide-16-9"
      theme={slideTheme}
      componentsDir="./components"
      mediaDir="./media"
    >
      <Slide id="cover" />
      <Slide id="user-brief" />
      <Slide id="why-openpress-agents" />
      <Slide id="openpress-model" />
      <Slide id="agent-boundary" />
      <Slide id="workflow-map" />
      <Slide id="step-brief" />
      <Slide id="step-scaffold" />
      <Slide id="step-outline" />
      <Slide id="step-draft" />
      <Slide id="step-assets" />
      <Slide id="step-illustration" />
      <Slide id="step-review" />
      <Slide id="step-validate" />
      <Slide id="prompt-pack" />
      <Slide id="delivery" />
    </Press>
  );
}
