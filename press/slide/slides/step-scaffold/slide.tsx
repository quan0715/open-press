import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "panel",
  description: "Step 2 chooses OpenPress slide style and template constraints before drafting.",
  keypoints: [
    "Select a slide style",
    "Use registered templates",
    "Do not create ad hoc wrappers"
  ],
} satisfies SlideMeta;

export const notes = "Use this slide to show how the brief becomes a constrained authoring environment.";

export default function StepScaffoldSlide() {
  return (
    <Slide id="step-scaffold" className="op-slide-page op-source-deck-slide op-template-panel">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Text as="p" label="Scaffold before label" box={{ x: 100, y: 80 }} className="op-source-deck-status-label op-source-deck-status-before">
          Without scaffold
        </Text>
        <Frame frameKey="before-panel" box={{ x: 100, y: 170, w: 780, h: 620 }} className="op-source-deck-panel-fill p-[34px]">
          <Text as="p" label="Scaffold before heading" className="op-source-deck-label">
            Blank canvas
          </Text>
          <Text as="p" label="Scaffold before body" className="op-source-deck-body mt-[70px] text-[var(--op-slide-color-ink)]">
            The agent may invent inconsistent layouts, CSS, or slide structure because no source contract is visible.
          </Text>
        </Frame>
        <Text as="p" label="Scaffold after label" box={{ x: 1060, y: 80 }} className="op-source-deck-status-label op-source-deck-status-after">
          With OpenPress
        </Text>
        <Frame frameKey="after-panel" box={{ x: 1060, y: 170, w: 780, h: 620 }} className="op-source-deck-panel-fill p-[34px]">
          <Text as="p" label="Scaffold after heading" className="op-source-deck-label">
            Template contract
          </Text>
          <Text as="p" label="Scaffold prompt label" className="op-source-deck-label mt-[58px] text-[var(--op-slide-color-success)]">
            Example prompt
          </Text>
          <Text as="blockquote" label="Scaffold prompt" className="op-source-deck-prompt-quote mt-[20px]">
            Use the existing slide-style templates only. Do not add new wrappers. Pick layouts that match each slide purpose.
          </Text>
          <Text as="p" label="Scaffold deliverable" className="op-source-deck-body mt-[42px] text-[var(--op-slide-color-muted)]">
            Deliverable: selected style, template map, and deck source boundary.
          </Text>
        </Frame>
      </Frame>
    </Slide>
  );
}
