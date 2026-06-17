import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "section",
  description: "Explains why agents need a source-backed slide framework instead of a blank design canvas.",
  keypoints: [
    "Agents need stable files",
    "Templates reduce layout drift",
    "Validation makes output reviewable"
  ],
} satisfies SlideMeta;

export const notes = "Position OpenPress as the framework that makes agent work inspectable and repeatable.";

export default function WhyOpenPressAgentsSlide() {
  return (
    <Slide id="why-openpress-agents" className="op-slide-page op-source-deck-slide op-template-section">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Text as="p" label="Why label" box={{ x: 100, y: 80 }} className="op-source-deck-label">
          Why a framework
        </Text>
        <Text as="h1" label="Why title" box={{ x: 100, y: 300, w: 820 }} className="op-source-deck-title">
          Agents should edit source, not improvise a deck.
        </Text>
        <Text as="p" label="Why body" box={{ x: 100, y: 640, w: 820 }} className="op-source-deck-body">
          OpenPress gives an Agent a stable file structure, reusable templates, previewable output, and validation checkpoints.
        </Text>
        <Line label="Why divider" box={{ x: 960, y: 0, w: 3, h: 1080 }} className="op-source-deck-divider" />
        <Frame frameKey="why-right-pane" className="op-source-deck-two-col op-source-deck-right-pane" box={{ x: 960, y: 0, w: 960, h: 1080 }}>
          <Frame frameKey="why-panel" box={{ x: 100, y: 330, w: 660, h: 320 }} className="op-source-deck-panel-fill p-[36px]">
            <Text as="p" label="Why panel label" className="op-source-deck-label">
              Working contract
            </Text>
            <Text as="p" label="Why panel body" className="op-source-deck-body mt-[46px] text-[var(--op-slide-color-ink)]">
              User intent becomes slide source. Source becomes validated HTML, preview, image, PDF, and deployable output.
            </Text>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
