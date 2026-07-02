import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "checklist",
  description: "Step 7 validates, renders, and exports final presentation output.",
  keypoints: [
    "Typecheck and build",
    "Confirm generated document order",
    "Export final deliverables"
  ],
} satisfies SlideMeta;

export const notes = "This slide anchors the final quality gate before delivery.";

export default function StepValidateSlide() {
  return (
    <Slide id="step-validate" className="op-slide-page op-source-deck-slide op-template-checklist op-template-section">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Text as="p" label="Validate label" box={{ x: 100, y: 80 }} className="op-source-deck-label">
          Step 7 · Validate
        </Text>
        <Text as="h1" label="Validate title" box={{ x: 100, y: 350, w: 760 }} className="op-source-deck-title">
          Ship only after the pipeline passes.
        </Text>
        <Text as="p" label="Validate prompt label" box={{ x: 100, y: 610 }} className="op-source-deck-label">
          Example prompt
        </Text>
        <Text as="blockquote" label="Validate prompt" box={{ x: 100, y: 670, w: 760 }} className="op-source-deck-prompt-quote">
          Run the OpenPress verification commands, summarize warnings, and confirm the final page order and deliverables.
        </Text>
        <Line label="Validate divider" box={{ x: 960, y: 0, w: 3, h: 1080 }} className="op-source-deck-divider" />
        <Frame
          frameKey="validate-checklist"
          box={{ x: 1060, y: 320, w: 620 }}
          className="op-source-deck-checklist"
          layout={{ mode: "stack", direction: "vertical", gap: 30, width: "fill", height: "hug" }}
        >
          <Frame frameKey="validate-typecheck" className="op-source-deck-check-row is-complete">
            <Text as="span" label="Typecheck icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="Typecheck text">Typecheck framework and workspace source.</Text>
          </Frame>
          <Frame frameKey="validate-build" className="op-source-deck-check-row is-complete">
            <Text as="span" label="Build icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="Build text">Build regenerates document JSON and public output.</Text>
          </Frame>
          <Frame frameKey="validate-export" className="op-source-deck-check-row is-complete">
            <Text as="span" label="Export icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="Export text">Export image/PDF only after render is accepted.</Text>
          </Frame>
          <Frame frameKey="validate-delivery" className="op-source-deck-check-row is-complete">
            <Text as="span" label="Validate deliverable icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="Validate deliverable text">Deliverable: source diff, preview link, export files.</Text>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
