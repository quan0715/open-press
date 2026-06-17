import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "checklist",
  description: "Step 1 turns user intent into a concrete deck brief.",
  keypoints: [
    "Capture purpose, audience, narrative, constraints, and deliverables",
    "Use the brief as the agent's source of truth",
    "Do not let the agent invent missing intent"
  ],
} satisfies SlideMeta;

export const notes = "This step should be done before writing or rewriting slides.";

export default function StepBriefSlide() {
  return (
    <Slide id="step-brief" className="op-slide-page op-source-deck-slide op-template-checklist op-template-section">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Text as="p" label="Step brief label" box={{ x: 100, y: 80 }} className="op-source-deck-label">
          Step 1 · Brief
        </Text>
        <Text as="h1" label="Step brief title" box={{ x: 100, y: 320, w: 760 }} className="op-source-deck-title">
          Turn user intent into a deck brief.
        </Text>
        <Text as="p" label="Step brief prompt label" box={{ x: 100, y: 590 }} className="op-source-deck-label">
          Example prompt
        </Text>
        <Text as="blockquote" label="Step brief prompt" box={{ x: 100, y: 650, w: 760 }} className="op-source-deck-prompt-quote">
          Interview me for purpose, audience, narrative arc, constraints, source material, and final deliverables before editing slides.
        </Text>
        <Line label="Step brief divider" box={{ x: 960, y: 0, w: 3, h: 1080 }} className="op-source-deck-divider" />
        <Frame
          frameKey="brief-step-list"
          box={{ x: 1060, y: 330, w: 650 }}
          className="op-source-deck-checklist"
          layout={{ mode: "stack", direction: "vertical", gap: 32, width: "fill", height: "hug" }}
        >
          <Frame frameKey="brief-user-input" className="op-source-deck-check-row is-complete">
            <Text as="span" label="User input icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="User input text">User input: purpose, audience, structure, constraints.</Text>
          </Frame>
          <Frame frameKey="brief-agent-work" className="op-source-deck-check-row is-complete">
            <Text as="span" label="Agent work icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="Agent work text">Agent work: summarize a decision-ready deck brief.</Text>
          </Frame>
          <Frame frameKey="brief-deliverable" className="op-source-deck-check-row is-complete">
            <Text as="span" label="Deliverable icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="Deliverable text">Deliverable: one-page brief and acceptance criteria.</Text>
          </Frame>
          <Frame frameKey="brief-checkpoint" className="op-source-deck-check-row is-complete">
            <Text as="span" label="Checkpoint icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="Checkpoint text">Checkpoint: user confirms the brief before slide edits.</Text>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
