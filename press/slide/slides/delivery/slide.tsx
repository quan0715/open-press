import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "section",
  description: "Closes with the expected final deliverables and the operating rule.",
  keypoints: [
    "Deliver source and rendered output",
    "Keep user intent explicit",
    "Do not ship unverified slides"
  ],
} satisfies SlideMeta;

export const notes = "Close by restating the responsibility split: user intent, agent source edits, OpenPress verification.";

export default function DeliverySlide() {
  return (
    <Slide id="delivery" className="op-slide-page op-source-deck-slide op-template-section">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Text as="p" label="Delivery label" box={{ x: 100, y: 80 }} className="op-source-deck-label">
          Delivery
        </Text>
        <Text as="h1" label="Delivery title" box={{ x: 100, y: 310, w: 1120 }} className="op-source-deck-title">
          The final deck is source plus verified output.
        </Text>
        <Line label="Delivery divider" box={{ x: 100, y: 610, w: 260, h: 4 }} className="op-source-deck-red-rule" />
        <Frame
          frameKey="delivery-list"
          box={{ x: 100, y: 690, w: 1420 }}
          className="op-source-deck-list"
          layout={{ mode: "stack", direction: "vertical", gap: 22, width: "fill", height: "hug" }}
        >
          <Text as="p" label="Delivery source">1. Source: `press/slide/press.tsx`, slide folders, metadata, notes, assets.</Text>
          <Text as="p" label="Delivery preview">2. Preview: workspace/public viewer reviewed against the user brief.</Text>
          <Text as="p" label="Delivery export">3. Export: image/PDF/deployable output after typecheck and build pass.</Text>
        </Frame>
      </Frame>
    </Slide>
  );
}
