# Press Tree & Folder Contract

## Recommended Folder Layout

```txt
press/<slug>/press.tsx               ← canonical entry, only supported entry
press/<slug>/slides/<id>/slide.tsx   ← slide content + meta + notes
press/<slug>/slides/<id>/style.css   ← optional slide-local CSS
press/<slug>/ui/text.tsx
press/<slug>/ui/card.tsx
press/<slug>/ui/badge.tsx
press/<slug>/ui/callout.tsx
press/<slug>/ui/kpi-card.tsx
press/<slug>/ui/image-frame.tsx
press/<slug>/ui/quote-block.tsx
press/<slug>/ui/timeline.tsx
press/<slug>/ui/compare-table.tsx
press/<slug>/layouts/title-slide.tsx
press/<slug>/layouts/agenda-slide.tsx
press/<slug>/layouts/chapter-opener-slide.tsx
press/<slug>/layouts/titled-content-slide.tsx
press/<slug>/layouts/two-column-slide.tsx
press/<slug>/layouts/metric-slide.tsx
press/<slug>/layouts/comparison-slide.tsx
press/<slug>/layouts/quote-slide.tsx
press/<slug>/layouts/image-caption-slide.tsx
press/<slug>/layouts/conclusion-slide.tsx
press/<slug>/theme/tokens.css
press/<slug>/theme/reset.css
press/<slug>/media/
```

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
- Compose visible content inside `slides/<id>/slide.tsx`, using layout components and their slots
- Extract a component only when it is a reusable `ui/*` primitive or a reusable `layouts/*` pattern
- Do not write `objectId` or `data-op-id`; the engine injects build-local locators
