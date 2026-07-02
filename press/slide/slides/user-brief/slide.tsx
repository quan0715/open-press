import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "checklist",
  description: "Makes the user brief a first-class input before any agent edits slides.",
  keypoints: [
    "User owns intent",
    "Agent needs purpose, audience, narrative, and constraints",
    "A clear brief prevents generic slides"
  ],
} satisfies SlideMeta;

export const notes = "This slide establishes the deck's core principle: agents can draft, but they cannot invent the user's purpose or accountability.";

export default function UserBriefSlide() {
  return (
    <Slide id="user-brief" className="op-slide-page op-source-deck-slide op-template-checklist op-template-section">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Text as="p" label="Brief label" box={{ x: 100, y: 80 }} className="op-source-deck-label">
          User input
        </Text>
        <Text as="h1" label="Brief title" box={{ x: 100, y: 330, w: 760 }} className="op-source-deck-title">
          Start by saying what this deck is for.
        </Text>
        <Text as="p" label="Brief body" box={{ x: 100, y: 640, w: 760 }} className="op-source-deck-body">
          The user must define the purpose, audience, narrative structure, constraints, source material, tone, deadline, and expected deliverables.
        </Text>
        <Line label="Brief divider" box={{ x: 960, y: 0, w: 3, h: 1080 }} className="op-source-deck-divider" />
        <Frame
          frameKey="brief-checklist"
          box={{ x: 1060, y: 300, w: 640 }}
          className="op-source-deck-checklist"
          layout={{ mode: "stack", direction: "vertical", gap: 30, width: "fill", height: "hug" }}
        >
          <Frame frameKey="brief-purpose" className="op-source-deck-check-row is-complete">
            <Text as="span" label="Purpose icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="Purpose text">Purpose and desired outcome</Text>
          </Frame>
          <Frame frameKey="brief-audience" className="op-source-deck-check-row is-complete">
            <Text as="span" label="Audience icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="Audience text">Audience, stakes, and prior knowledge</Text>
          </Frame>
          <Frame frameKey="brief-narrative" className="op-source-deck-check-row is-complete">
            <Text as="span" label="Narrative icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="Narrative text">Narrative arc and slide count</Text>
          </Frame>
          <Frame frameKey="brief-constraints" className="op-source-deck-check-row is-complete">
            <Text as="span" label="Constraints icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="Constraints text">Tone, assets, data, and deadline</Text>
          </Frame>
          <Frame frameKey="brief-deliverables" className="op-source-deck-check-row is-complete">
            <Text as="span" label="Deliverables icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="Deliverables text">Expected files: source, preview, export</Text>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
