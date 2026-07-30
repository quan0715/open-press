# Layout & Component Contract

Slide authoring is template-first, frame-first, and Tailwind-semantic.

## Import Paths

New slide workspaces scaffold portable style source under:

```txt
press/<slug>/slide-style/manifest.json
press/<slug>/slide-style/templates/<template>/slide.tsx
press/<slug>/slide-style/theme/default.css
```

Copied slide files live at:

```txt
press/<slug>/slides/<id>/slide.tsx
```

Templates and copied slides should import core primitives directly:

```tsx
import { Frame, Line, Media, MediaCaption, MediaObject, Slide, Text, type SlideMeta } from "@open-press/core";
```

Do not add `layouts/` or deck-local chrome wrappers for new slide work. Put reusable structure in registered templates built from core primitives.

## Template Slide Contract

A template slide is a complete `slide.tsx` source file registered in
`press/<slug>/slide-style/manifest.json`.

```json
{
  "id": "source-deck-style",
  "name": "Source Deck Style",
  "defaultTemplate": "cover",
  "templates": {
    "cover": {
      "source": "templates/cover/slide.tsx",
      "description": "Large title with a restrained rule"
    }
  }
}
```

The CLI copies it into `press/<slug>/slides/<id>/slide.tsx`, substitutes
`__SLIDE_ID__` and `__SLIDE_COMPONENT__`, and leaves theme files untouched.
Templates should import core primitives directly from `@open-press/core`.

Template files should be complete slides built from `Slide` / nested `Frame`
layout props, `Text`, `Line`, `MediaObject`, `Media`, and `MediaCaption`. `Slide` is the
slide-friendly page `Frame` wrapper and accepts `layout` directly; nested
`Frame` regions should own copy groups, cards, grids, and visual regions.

Use plain HTML elements only for tiny visual wrappers when no primitive fits.
Do not use generic HTML as the main template skeleton.

## Frame Boundary

| Region | Preferred primitive | Rule |
| --- | --- | --- |
| Slide page and canvas | `Slide` | Owns `id`, className, and page-level `layout` |
| Copy groups, cards, grids, visual regions | `Frame` | Give each region a stable, semantic `frameKey` |
| Visible title, lead, caption, label | `Text` | Use stable `label` and semantic `op-*` typography classes |
| Divider, rule, axis, timeline mark | `Line` | Use stable `label`; style color/weight through theme CSS |
| Image or media with caption | `MediaObject`, `Media`, `MediaCaption` | Keep asset references portable |
| One-off visual wrapper | Plain HTML | Allowed only when a core primitive does not fit |

## Layout Props

Use `layout` on `Slide` and nested `Frame` regions for stable composition:

```tsx
<Slide
  id="pricing"
  className="op-slide-page bg-bg text-text"
  layout={{ mode: "grid", columns: "minmax(0,1fr) 520px", gap: 64, padding: 96, width: "fill", height: "fill" }}
>
  <Frame frameKey="copy" layout={{ mode: "stack", gap: 24 }}>
    <Text as="h1" label="title" className="op-display">Pricing model</Text>
  </Frame>
</Slide>
```

Avoid props-heavy layout APIs such as `items`, `metrics`, `steps`, `blocks`,
`logo`, `footerLabel`, `showFolio`, `pageNumber`, or `totalPages`. Use explicit
JSX children so inspector and source editing can target real authoring nodes.

## UI Primitive Set

Reusable slide UI primitives, if a workspace needs them, belong in workspace
source such as `press/<slug>/ui/` or `press/<slug>/components/`. They do not
wrap the page-level `Slide`.

| Primitive | Typical use |
| --- | --- |
| `Card` | Repeated card surfaces |
| `Badge` | Labels and chips |
| `Callout` | Strong highlighted note, preferably implemented with `Frame` |
| `KpiCard` | Metric plus label |
| `ImageFrame` | Decorated image container |
| `QuoteBlock` | Pull quote |
| `Timeline` | Sequence or process |
| `CompareTable` | Small comparison table |

Callout-like regions should be implemented with `Frame` regions and `Text`
instead of a framework-provided callout wrapper.

## Text Rule

Use `Text` from `@open-press/core` or local wrappers that accept and forward
`TextProps`.

Do hand-write stable local `label` values for `Text`, `Line`, and
`MediaObject` in templates and copied slide source. Do not write generated
locator values. The engine derives build-local locators from the
object tree.

## Template Add CLI

Use the public CLI for slide creation:

```bash
open-press slide add <id> --press <slug> --template <template>
open-press slide add <id> --press <slug> # uses manifest defaultTemplate when available
```

Do not manually create a slide folder when the desired template is registered;
the CLI updates both `slides/<id>/slide.tsx` and the marker-only `press.tsx`.
