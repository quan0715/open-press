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
import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";
import { Media, MediaCaption, MediaObject } from "@open-press/core";
```

`layouts/` and deck-local chrome components may exist in older or heavily customized workspaces, but they are no longer the default scaffolded slide style boundary.

## Template Slide Contract

A template slide is a complete `slide.tsx` source file registered in
`press/<slug>/slide-style/manifest.json`.

The CLI copies it into `press/<slug>/slides/<id>/slide.tsx`, substitutes
`__SLIDE_ID__` and `__SLIDE_COMPONENT__`, and leaves theme files untouched.
Templates should import core primitives directly from `@open-press/core`.

Template files should be complete slides built from `Slide` / nested `Frame`
layout props, `Text`, `MediaObject`, `Media`, and `MediaCaption`. `Slide` is the
slide-friendly page `Frame` wrapper and accepts `layout` directly; nested
`Frame` regions should own copy groups, cards, grids, and visual regions.

Use plain HTML elements only for tiny visual wrappers when no primitive fits.
Do not use generic HTML as the main template skeleton.

## Frame Boundary

| Region | Preferred primitive | Rule |
| --- | --- | --- |
| Slide page and canvas | `Slide` | Owns `id`, className, and page-level `layout` |
| Copy groups, cards, grids, visual regions | `Frame` | Give stable `frameKey` and useful `role` |
| Visible title, lead, caption, label | `Text` | Use semantic `op-*` typography classes |
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
  <Frame frameKey="copy" role="slide.region.copy" layout={{ mode: "stack", gap: 24 }}>
    <Text as="h1" className="op-display">Pricing model</Text>
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

`BaseCallout` is deprecated for new authoring guidance. It remains exported for
compatibility, but portable slide templates should use `Frame` regions and
`Text` instead. A future framework cleanup may either remove it from examples or
replace it with a stronger `Callout` primitive that participates in the same
object/frame semantics as other authoring primitives.

## Text Rule

Use `Text` from `@open-press/core` or local wrappers that accept and forward
`TextProps`.

Do not hand-write `objectId` or `data-op-id`. The engine injects build-local
locators.
