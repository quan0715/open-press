import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "pros-cons",
  description: "Defines the boundary between user intent, agent work, and OpenPress responsibilities.",
  keypoints: [
    "User owns purpose and decisions",
    "Agent edits slide source",
    "OpenPress validates and renders"
  ],
} satisfies SlideMeta;

export const notes = "Use this as the central operating boundary for Agent-assisted slide work.";

export default function AgentBoundarySlide() {
  return (
    <Slide id="agent-boundary" className="op-slide-page op-source-deck-slide op-template-pros-cons">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Frame frameKey="user-agent" box={{ x: 100, y: 80, w: 760, h: 900 }} className="op-source-deck-list-pane">
          <Text as="p" label="User and agent label" box={{ x: 0, y: 0 }} className="op-source-deck-status-label op-source-deck-status-pros">
            User + Agent
          </Text>
          <Frame
            frameKey="user-agent-list"
            box={{ x: 0, y: 320, w: 640 }}
            className="op-source-deck-number-list"
            layout={{ mode: "stack", direction: "vertical", gap: 36, width: "fill", height: "hug" }}
          >
            <Text as="p" label="Boundary item one">1. User states intent, audience, narrative, and constraints.</Text>
            <Text as="p" label="Boundary item two">2. Agent translates the brief into slide source.</Text>
            <Text as="p" label="Boundary item three">3. Agent asks before inventing claims, numbers, or public commitments.</Text>
            <Text as="p" label="Boundary item four">4. User reviews meaning and accepts the deck.</Text>
          </Frame>
        </Frame>
        <Line label="Boundary divider" box={{ x: 960, y: 0, w: 3, h: 1080 }} className="op-source-deck-divider" />
        <Frame frameKey="openpress" box={{ x: 1060, y: 80, w: 760, h: 900 }} className="op-source-deck-list-pane">
          <Text as="p" label="OpenPress label" box={{ x: 0, y: 0 }} className="op-source-deck-status-label op-source-deck-status-before">
            OpenPress
          </Text>
          <Frame
            frameKey="openpress-list"
            box={{ x: 0, y: 320, w: 640 }}
            className="op-source-deck-number-list"
            layout={{ mode: "stack", direction: "vertical", gap: 36, width: "fill", height: "hug" }}
          >
            <Text as="p" label="OpenPress item one">1. Holds the file and template contract.</Text>
            <Text as="p" label="OpenPress item two">2. Detects missing, orphaned, and duplicate slides.</Text>
            <Text as="p" label="OpenPress item three">3. Produces workspace preview and public viewer output.</Text>
            <Text as="p" label="OpenPress item four">4. Exports images, PDF, and deployable assets.</Text>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
