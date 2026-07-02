import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "timeline",
  description: "Roadmap timeline with dated colored work streams.",
  keypoints: ["Replace the timeline summary", "Replace milestone bars"],
} satisfies SlideMeta;

export const notes = "Use this for roadmap, rollout, or phased delivery slides.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page op-source-deck-slide op-template-timeline">
      <Frame
        frameKey="canvas"
        chrome={false}
        className="op-source-deck-canvas relative h-full w-full overflow-hidden"
      >
        <Text
          as="p"
          label="Timeline label"
          box={{ x: 100, y: 80 }}
          className="op-source-deck-label"
        >
          Timeline
        </Text>
        <Text
          as="p"
          label="Timeline body"
          box={{ x: 100, y: 170, w: 1120 }}
          className="op-source-deck-body"
        >
          Longer description of slide content. Typically used to provide extra context or nuance to slides.
        </Text>
        <Frame frameKey="timeline" box={{ x: 100, y: 390, w: 1720, h: 470 }} className="op-source-deck-timeline">
          <Text as="p" label="Timeline first month" box={{ x: 0, y: 0 }} className="op-source-deck-month">
            January
          </Text>
          <Text as="p" label="Timeline second month" box={{ x: 1140, y: 0 }} className="op-source-deck-month">
            August
          </Text>
          <Frame frameKey="bar-design-a" box={{ x: 0, y: 86, w: 620, h: 58 }} className="op-source-deck-bar op-source-deck-bar-blue">
            <Text as="p" label="v1 design label">v1 design</Text>
          </Frame>
          <Frame frameKey="bar-design-b" box={{ x: 642, y: 86, w: 620, h: 58 }} className="op-source-deck-bar op-source-deck-bar-blue">
            <Text as="p" label="v2 design label">v2 design</Text>
          </Frame>
          <Frame frameKey="bar-design-c" box={{ x: 1284, y: 86, w: 436, h: 58 }} className="op-source-deck-bar op-source-deck-bar-blue">
            <Text as="p" label="Brand asset design label">brand asset design</Text>
          </Frame>
          <Frame frameKey="bar-engineering" box={{ x: 275, y: 176, w: 360, h: 58 }} className="op-source-deck-bar op-source-deck-bar-gold">
            <Text as="p" label="Engineering exploration label">Engineering exploration</Text>
          </Frame>
          <Frame frameKey="bar-web" box={{ x: 655, y: 176, w: 360, h: 58 }} className="op-source-deck-bar op-source-deck-bar-gold">
            <Text as="p" label="Web implementation label">Web implementation</Text>
          </Frame>
          <Frame frameKey="bar-android" box={{ x: 1035, y: 176, w: 360, h: 58 }} className="op-source-deck-bar op-source-deck-bar-gold">
            <Text as="p" label="Android implementation label">Android implementation</Text>
          </Frame>
          <Frame frameKey="bar-ios" box={{ x: 1415, y: 176, w: 305, h: 58 }} className="op-source-deck-bar op-source-deck-bar-gold">
            <Text as="p" label="iOS implementation label">iOS implementation</Text>
          </Frame>
          <Frame frameKey="bar-research" box={{ x: 275, y: 266, w: 1095, h: 58 }} className="op-source-deck-bar op-source-deck-bar-red">
            <Text as="p" label="User testing and research label">User testing and research</Text>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
