import { Frame, Media, MediaCaption, MediaObject, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "panel",
  description: "Optional step for using an image-generation-capable agent to create and insert an illustration.",
  keypoints: [
    "User approves the visual intent",
    "Agent generates or edits the image asset",
    "OpenPress renders the inserted media object"
  ],
} satisfies SlideMeta;

export const notes = "Use generated illustrations only when the user approves style, subject, and usage constraints.";

export default function StepIllustrationSlide() {
  return (
    <Slide id="step-illustration" className="op-slide-page op-source-deck-slide op-template-panel">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Text as="p" label="Illustration before label" box={{ x: 100, y: 80 }} className="op-source-deck-status-label op-source-deck-status-before">
          Optional visual
        </Text>
        <Frame frameKey="illustration-preview-panel" box={{ x: 100, y: 170, w: 780, h: 620 }} className="op-source-deck-panel-fill overflow-hidden p-[34px]">
          <Text as="p" label="Illustration preview heading" className="op-source-deck-label">
            Generated illustration
          </Text>
          <MediaObject
            label="Generated illustration media"
            box={{ x: 34, y: 92, w: 712, h: 396 }}
            className="m-0 overflow-hidden border border-[color-mix(in_srgb,var(--op-slide-color-line)_35%,transparent)] bg-[var(--op-slide-color-surface-muted)]"
          >
            <Media
              src="openpress-hero-art.png"
              alt="Editorial illustration of the OpenPress authoring loop"
              className="h-full w-full object-cover"
              fit="cover"
            />
          </MediaObject>
          <MediaCaption className="absolute left-[34px] top-[512px] w-[650px] font-sans text-[18px] leading-[1.35] text-[var(--op-slide-color-muted)]">
            Generated or selected asset, saved under `press/slide/media/` and inserted as an editable media object.
          </MediaCaption>
        </Frame>
        <Text as="p" label="Illustration after label" box={{ x: 1060, y: 80 }} className="op-source-deck-status-label op-source-deck-status-after">
          Source contract
        </Text>
        <Frame frameKey="illustration-source-panel" box={{ x: 1060, y: 170, w: 780, h: 620 }} className="op-source-deck-panel-fill p-[34px]">
          <Text as="p" label="Illustration source heading" className="op-source-deck-label">
            Agent with image generation
          </Text>
          <Frame frameKey="illustration-prompt-card" className="mt-[34px] border-t-[3px] border-[var(--op-slide-color-success)] pt-[26px]">
            <Text as="p" label="Illustration prompt label" className="op-source-deck-label text-[var(--op-slide-color-success)]">
              Example prompt
            </Text>
            <Text as="blockquote" label="Illustration prompt" className="op-source-deck-prompt-quote mt-[20px]">
              Create a 16:9 editorial illustration for the deck workflow, save it as `press/slide/media/agent-workflow.png`, then insert it with MediaObject and a caption.
            </Text>
          </Frame>
          <Frame
            frameKey="illustration-checklist"
            className="op-source-deck-checklist mt-[44px]"
            layout={{ mode: "stack", direction: "vertical", gap: 26, width: "fill", height: "hug" }}
          >
            <Frame frameKey="illustration-user-intent" className="op-source-deck-check-row is-complete">
              <Text as="span" label="Illustration user icon" className="op-source-deck-check-icon">&#10003;</Text>
              <Text as="p" label="Illustration user text">User approves subject, style, constraints, and usage rights.</Text>
            </Frame>
            <Frame frameKey="illustration-agent-work" className="op-source-deck-check-row is-complete">
              <Text as="span" label="Illustration agent icon" className="op-source-deck-check-icon">&#10003;</Text>
              <Text as="p" label="Illustration agent text">Agent generates the image and commits the asset with source edits.</Text>
            </Frame>
            <Frame frameKey="illustration-deliverable" className="op-source-deck-check-row is-complete">
              <Text as="span" label="Illustration deliverable icon" className="op-source-deck-check-icon">&#10003;</Text>
              <Text as="p" label="Illustration deliverable text">Deliverable: image file, inserted media object, caption, and notes.</Text>
            </Frame>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
