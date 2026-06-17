import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "cover",
  description: "Title slide for using OpenPress with an Agent to create presentations.",
  keypoints: [
    "OpenPress provides the presentation framework",
    "The Agent edits the source",
    "The user owns intent"
  ],
} satisfies SlideMeta;

export const notes = "Open with the operating model: the user defines intent, the agent edits source, and OpenPress keeps the deck structured and renderable.";

export default function CoverSlide() {
  return (
    <Slide id="cover" className="op-slide-page op-source-deck-slide op-template-cover">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Text as="p" label="Cover date" box={{ x: 100, y: 80 }} className="op-source-deck-date">
          OPENPRESS DOGFOOD
        </Text>
        <Text as="h1" label="Cover title" box={{ x: 100, y: 330, w: 1350 }} className="op-source-deck-title">
          Build presentations with OpenPress + Agent.
        </Text>
        <Line label="Cover red rule" box={{ x: 100, y: 820, w: 270, h: 4 }} className="op-source-deck-red-rule" />
      </Frame>
    </Slide>
  );
}
