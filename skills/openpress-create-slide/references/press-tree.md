# Press Tree & Folder Contract

## Recommended Folder Layout

```txt
press/<slug>/press.tsx               ← canonical entry, only supported entry
press/<slug>/slides/<id>/slide.tsx   ← slide content + meta + notes
press/<slug>/layouts/SlideProtocol.tsx
press/<slug>/components/DeckSlide.tsx
press/<slug>/ui/text.tsx
press/<slug>/ui/card.tsx
press/<slug>/ui/badge.tsx
press/<slug>/ui/callout.tsx
press/<slug>/ui/kpi-card.tsx
press/<slug>/ui/image-frame.tsx
press/<slug>/ui/quote-block.tsx
press/<slug>/ui/timeline.tsx
press/<slug>/ui/compare-table.tsx
press/<slug>/media/
```

Do not create `slides/<id>/style.css`, `layouts/*.css`, `ui/*.css`, or `theme/*.css` by default. Slide styling should use the shared Tailwind `op-*` semantic layer. Local CSS is an escape hatch only after a user explicitly asks for custom CSS that cannot be represented with the protocol and semantic classes.

## Press Tree Default Shape

```tsx
import { Press, Slide } from "@open-press/core";

export default function SlidePress() {
  return (
    <Press slug="slide" title="Deck Title" type="slides" page="slide-16-9">
      <Slide id="cover" />
      <Slide id="agenda" />
      <Slide id="closing" />
    </Press>
  );
}
```

For Slides-type workspaces, `press.tsx` is an ordered index only. Do not put slide content, CSS imports, data arrays, or layout components in `press.tsx`.

## Component & Media Path Resolution

- Default lookup: folder-local `./components` and `./media`, plus `press/shared/*`
- Custom path: set `<Press componentsDir>` or `<Press mediaDir>` to a string or string array
- Paths starting with `./` resolve relative to the owning Press folder
- Bare paths resolve relative to `press/`

## Rules

- Do not generate one empty component per slide just to hide content
- Compose visible content inside `slides/<id>/slide.tsx`, using protocol layout components and their slots
- Extract a component only when it is a reusable `ui/*` primitive or a reusable `layouts/*` pattern
- Do not write `objectId` or `data-op-id`; the engine injects build-local locators
- Do not use inline style objects for slide layout or text styling; use `op-*` classes
