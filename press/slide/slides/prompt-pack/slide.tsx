import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "stacked-quotes",
  description: "Provides reusable prompt patterns for briefing, outlining, drafting, and reviewing.",
  keypoints: [
    "Prompts should name source files",
    "Prompts should state constraints",
    "Prompts should request deliverables and checks"
  ],
} satisfies SlideMeta;

export const notes = "Use this as a practical copy-paste slide for agent users.";

export default function PromptPackSlide() {
  return (
    <Slide id="prompt-pack" className="op-slide-page op-source-deck-slide op-template-stacked-quotes op-template-section">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Text as="p" label="Prompt pack label" box={{ x: 100, y: 80 }} className="op-source-deck-label">
          Prompt pack
        </Text>
        <Text as="h1" label="Prompt pack title" box={{ x: 100, y: 330, w: 760 }} className="op-source-deck-title">
          Prompt the agent with source, constraints, and output.
        </Text>
        <Text as="p" label="Prompt pack body" box={{ x: 100, y: 650, w: 760 }} className="op-source-deck-body">
          Good prompts tell the Agent what to change, what not to invent, where to edit, and how to prove the result.
        </Text>
        <Line label="Prompt pack divider" box={{ x: 960, y: 0, w: 3, h: 1080 }} className="op-source-deck-divider" />
        <Frame
          frameKey="prompt-stack"
          box={{ x: 1060, y: 215, w: 720 }}
          className="op-source-deck-quote-stack"
          layout={{ mode: "stack", direction: "vertical", gap: 58, width: "fill", height: "hug" }}
        >
          <Frame frameKey="prompt-outline" className="op-source-deck-stacked-quote op-source-deck-quote-blue">
            <Text as="span" label="Outline quote mark" className="op-source-deck-quote-mark">&ldquo;</Text>
            <Text as="p" label="Outline prompt" className="op-source-deck-quote">
              Create a 15-slide OpenPress outline with slide IDs, template choices, user input required, and expected deliverables.
            </Text>
            <Text as="p" label="Outline attribution" className="op-source-deck-attribution">
              Outline prompt
            </Text>
          </Frame>
          <Frame frameKey="prompt-review" className="op-source-deck-stacked-quote op-source-deck-quote-red">
            <Text as="span" label="Review quote mark" className="op-source-deck-quote-mark">&ldquo;</Text>
            <Text as="p" label="Review prompt" className="op-source-deck-quote">
              Review `/slide` against the brief. Report exact source files to edit, missing evidence, layout drift, and verification commands.
            </Text>
            <Text as="p" label="Review attribution" className="op-source-deck-attribution">
              Review prompt
            </Text>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
