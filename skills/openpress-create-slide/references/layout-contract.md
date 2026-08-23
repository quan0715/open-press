# Slide layout contract

Every slide is an authored TSX source at `press/<slug>/slides/<id>/slide.tsx`. The Press register lists IDs; it does not provide slide bodies.

```tsx
import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "statement",
  description: "One clear takeaway",
} satisfies SlideMeta;

export default function StatementSlide() {
  return (
    <Slide
      id="statement"
      className="op-slide-page bg-bg text-text"
      layout={{ mode: "stack", padding: 96, width: "fill", height: "fill" }}
    >
      <Frame frameKey="copy" className="m-auto max-w-[1400px]">
        <Text as="h1" className="op-display">One clear takeaway</Text>
      </Frame>
    </Slide>
  );
}
```

## Non-negotiable boundaries

- One `<Slide>` root per source file, with a stable literal `id` matching its folder.
- Use `<Frame>` for meaningful layout regions and a literal `meta` export for the reader.
- Compose the slide directly in its own file. `meta.layout` describes the composition; it is never a lookup key.
- Put repeated, content-free primitives in the same Press only after two real uses. Keep their APIs narrow and semantic.
- Keep imported media relative to the slide or Press so the source remains portable inside that Press.

## New slide workflow

`open-press slide add <id> --press <slug>` creates a blank source and updates `press.tsx`. Replace the placeholder with the actual slide composition. Do not add a registry, manifest, or source-selection layer to choose slide bodies.

## Canvas discipline

The canvas is 1920 × 1080. Use the available width deliberately, leave a meaningful safe margin, and avoid stacking enough copy to require small type. If a slide needs more than one dense paragraph, divide the message or move support material into speaker notes.
