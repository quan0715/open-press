import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "agenda",
  description: "Split agenda with a serif thesis and ordered list.",
  keypoints: ["Replace the agenda thesis", "Replace the four agenda items"],
} satisfies SlideMeta;

export const notes = "Use this when the deck needs an agenda or chapter index.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page op-source-deck-slide op-template-agenda">
      <Frame
        frameKey="canvas"
        chrome={false}
        className="op-source-deck-canvas relative h-full w-full overflow-hidden"
      >
        <Text
          as="p"
          label="label"
          box={{ x: 100, y: 80 }}
          className="op-source-deck-label"
        >
          Agenda
        </Text>
        <Text
          as="h1"
          label="thesis"
          box={{ x: 100, y: 437, w: 750 }}
          className="op-source-deck-thesis"
        >
          Equal circles are those whose diameters are equal.
        </Text>
        <Line
          label="divider"
          box={{ x: 960, y: 0, w: 3, h: 1080 }}
          className="op-source-deck-divider"
        />
        <Frame
          frameKey="agenda-list"
          box={{ x: 1092, y: 363, w: 750 }}
          className="op-source-deck-two-col op-source-deck-right-pane op-source-deck-list"
          layout={{ mode: "stack", direction: "vertical", gap: 63, width: "fill", height: "hug" }}
        >
          <Text as="p" label="agenda-item-1">1. Refresher on problem statement</Text>
          <Text as="p" label="agenda-item-2">2. Update on metrics</Text>
          <Text as="p" label="agenda-item-3">3. Review design proposal</Text>
          <Text as="p" label="agenda-item-4">4. Align on GTM</Text>
        </Frame>
      </Frame>
    </Slide>
  );
}
