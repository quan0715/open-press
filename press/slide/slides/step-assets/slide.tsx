import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "panel",
  description: "Step 5 adds visuals, media, data, and citations without breaking the source contract.",
  keypoints: [
    "User provides source material",
    "Agent places assets into editable regions",
    "OpenPress copies and renders media"
  ],
} satisfies SlideMeta;

export const notes = "Explain that agents should not invent business numbers or unsupported claims.";

export default function StepAssetsSlide() {
  return (
    <Slide id="step-assets" className="op-slide-page op-source-deck-slide op-template-panel">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Text as="p" label="Assets before label" box={{ x: 100, y: 80 }} className="op-source-deck-status-label op-source-deck-status-before">
          Raw material
        </Text>
        <Frame frameKey="before-panel" box={{ x: 100, y: 170, w: 780, h: 620 }} className="op-source-deck-panel-fill p-[34px]">
          <Text as="p" label="Assets before heading" className="op-source-deck-label">
            User input
          </Text>
          <Text as="h2" label="Assets before title" className="mt-[28px] font-sans text-[42px] font-semibold leading-[1.05] text-[var(--op-slide-color-ink)]">
            Give the agent evidence, not vague inspiration.
          </Text>
          <Frame
            frameKey="asset-input-list"
            className="op-source-deck-checklist mt-[44px]"
            layout={{ mode: "stack", direction: "vertical", gap: 28, width: "fill", height: "hug" }}
          >
            <Frame frameKey="asset-screenshots" className="op-source-deck-check-row is-complete">
              <Text as="span" label="Screenshots icon" className="op-source-deck-check-icon">&#10003;</Text>
              <Text as="p" label="Screenshots text">Screenshots, product states, and UI references.</Text>
            </Frame>
            <Frame frameKey="asset-brand" className="op-source-deck-check-row is-complete">
              <Text as="span" label="Brand files icon" className="op-source-deck-check-icon">&#10003;</Text>
              <Text as="p" label="Brand files text">Logo files, brand colors, usage limits, and tone.</Text>
            </Frame>
            <Frame frameKey="asset-data" className="op-source-deck-check-row is-complete">
              <Text as="span" label="Data icon" className="op-source-deck-check-icon">&#10003;</Text>
              <Text as="p" label="Data text">Charts, tables, source links, and citation rules.</Text>
            </Frame>
            <Frame frameKey="asset-do-not-invent" className="op-source-deck-check-row is-complete">
              <Text as="span" label="Do not invent icon" className="op-source-deck-check-icon">&#10003;</Text>
              <Text as="p" label="Do not invent text">Anything the agent must not invent or imply.</Text>
            </Frame>
          </Frame>
        </Frame>
        <Text as="p" label="Assets after label" box={{ x: 1060, y: 80 }} className="op-source-deck-status-label op-source-deck-status-after">
          Slide source
        </Text>
        <Frame frameKey="after-panel" box={{ x: 1060, y: 170, w: 780, h: 620 }} className="op-source-deck-panel-fill p-[34px]">
          <Text as="p" label="Assets after heading" className="op-source-deck-label">
            Agent work
          </Text>
          <Frame frameKey="asset-prompt-card" className="mt-[34px] border-t-[3px] border-[var(--op-slide-color-success)] pt-[26px]">
            <Text as="p" label="Assets prompt label" className="op-source-deck-label text-[var(--op-slide-color-success)]">
              Example prompt
            </Text>
            <Text as="blockquote" label="Assets prompt" className="op-source-deck-prompt-quote mt-[20px]">
              Place approved media in the relevant slide folders, use MediaObject for captions, and keep citations visible or in notes.
            </Text>
          </Frame>
          <Frame
            frameKey="asset-output-list"
            className="op-source-deck-checklist mt-[44px]"
            layout={{ mode: "stack", direction: "vertical", gap: 26, width: "fill", height: "hug" }}
          >
            <Frame frameKey="asset-deliverable" className="op-source-deck-check-row is-complete">
              <Text as="span" label="Assets deliverable icon" className="op-source-deck-check-icon">&#10003;</Text>
              <Text as="p" label="Assets deliverable text">Deliverable: sourced visuals, captions, and citation trail.</Text>
            </Frame>
            <Frame frameKey="asset-openpress" className="op-source-deck-check-row is-complete">
              <Text as="span" label="Assets OpenPress icon" className="op-source-deck-check-icon">&#10003;</Text>
              <Text as="p" label="Assets OpenPress text">OpenPress copies media and renders the same source everywhere.</Text>
            </Frame>
            <Frame frameKey="asset-checkpoint" className="op-source-deck-check-row is-complete">
              <Text as="span" label="Assets checkpoint icon" className="op-source-deck-check-icon">&#10003;</Text>
              <Text as="p" label="Assets checkpoint text">Checkpoint: every visual has provenance or an explicit generated label.</Text>
            </Frame>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
