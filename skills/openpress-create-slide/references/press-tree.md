# Press Tree & Folder Contract

## Recommended Folder Layout

```txt
press/<slug>/press.tsx               ← canonical entry, only supported entry
press/<slug>/deck.yml                ← Deck Blueprint YAML
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
press/<slug>/theme/slides.css
press/<slug>/media/
```

## Press Tree Default Shape

```tsx
import { Press, Text } from "@open-press/core";
import { TitledContentSlide } from "./layouts/titled-content-slide";
import { TitleSlide } from "./layouts/title-slide";
import { Timeline } from "./ui/timeline";
import "./theme/tokens.css";
import "./theme/slides.css";

export default function SlidePress() {
  return (
    <Press slug="slide" title="Deck Title" type="slides" page="slide-16-9">
      <TitleSlide id="cover">
        <TitleSlide.Title objectId="title">Deck Title</TitleSlide.Title>
        <TitleSlide.Description objectId="description">
          One-line audience promise.
        </TitleSlide.Description>
      </TitleSlide>

      <TitledContentSlide id="problem-context">
        <TitledContentSlide.Eyebrow objectId="eyebrow">Context</TitledContentSlide.Eyebrow>
        <TitledContentSlide.Title objectId="title">Problem Context</TitledContentSlide.Title>
        <TitledContentSlide.Content>
          <Text as="p" objectId="summary">Write visible slide content directly in JSX.</Text>
        </TitledContentSlide.Content>
      </TitledContentSlide>
    </Press>
  );
}
```

## Component & Media Path Resolution

- Default lookup: folder-local `./components` and `./media`, plus `press/shared/*`
- Custom path: set `<Press componentsDir>` or `<Press mediaDir>` to a string or string array
- Paths starting with `./` resolve relative to the owning Press folder
- Bare paths resolve relative to `press/`

## Rules

- Do not generate one empty component per slide just to hide content
- Compose visible content inline inside `Press`, using layout components and their slots
- Extract a component only when it is a reusable `ui/*` primitive or a reusable `layouts/*` pattern
