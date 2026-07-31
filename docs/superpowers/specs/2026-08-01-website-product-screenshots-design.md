# Website Product Screenshots Design

**Date:** 2026-08-01

**Status:** Approved for implementation

**Target:** OpenPress multilingual homepage

## Objective

Add direct product evidence to the official website without replacing the
existing brand-led hero. The homepage will show two real OpenPress Workbench
screens: the document interaction editor and the Agent proposal / Change
Preview experience.

The section should make one workflow legible: an Agent proposes a source
change, and a person inspects the rendered document before applying it.

## Placement And Narrative

Insert one product showcase section in `HomeRefresh.astro` after the existing
“How it works” section and before the Press Tree explanation. This puts real
use between the product promise and the technical architecture.

The section uses one full-width screenshot stage with two text tabs:

1. **Document editor** — default panel. Shows the real Workbench reader with
   document navigation, inline editing affordances, and zoom controls.
2. **Agent proposal** — shows the real Change Preview interface with rendered
   context, proposal review, feedback, and apply controls.

Only one screenshot is visible at a time. A short localized sentence below the
stage explains the active panel, followed by a plain “Open full image” link.

## Visual Direction

Keep the existing OpenPress palette, typography, hairlines, and spacing. The
section is quiet and product-led:

- no fake browser window, device mockup, gradient halo, or nested feature cards;
- the tab row should feel like a Workbench-owned utility strip;
- selected state uses accent-colored text and a thin underline, not a filled
  pill;
- the screenshot fills the stage and keeps its native dark Workbench chrome;
- one subtle opacity and short vertical transition marks tab changes;
- surrounding copy stays restrained so the product UI is the visual focus.

The section is full-width inside the existing `op-page` container. Desktop and
tablet use the same wide stage. Mobile stacks the heading, tabs, image, and
caption without introducing horizontal page overflow.

## Screenshot Assets

Capture both images from the current local dogfood Workbench, not from a mock
or generated composition. Use the same viewport, document, theme, and crop so
switching tabs does not move the page.

Assets:

- `apps/web/public/product/workbench-document-editor.webp`
- `apps/web/public/product/workbench-agent-proposal.webp`

Both assets use a 16:10 frame at 1600 × 1000 pixels. Export WebP at a quality
that keeps UI text readable while avoiding unnecessarily large homepage
payloads. The capture must not include private paths, terminal content,
credentials, personal notifications, or unrelated browser chrome.

The document editor capture should show a representative rendered page and
the controls that make the Workbench interactive. The Agent proposal capture
should show a meaningful proposed edit and its review controls, not an empty or
loading state.

## Localization

The same English product screenshots are shared by the `zh-tw`, `en`, and `ja`
homepages. Localize only the section eyebrow, heading, introduction, tab labels,
panel descriptions, image alt text, and full-image link.

This keeps visual evidence stable across languages and avoids maintaining
three screenshot sets.

## Interaction And Accessibility

Implement the selector as an ARIA tab interface:

- `role="tablist"`, `role="tab"`, and `role="tabpanel"` relationships;
- `aria-selected`, `aria-controls`, and roving `tabindex` state;
- click, Enter/Space, Left/Right Arrow, Home, and End navigation;
- focus remains visible using the existing focus treatment;
- inactive panels use the `hidden` attribute;
- image dimensions are declared to prevent layout shift;
- each image receives localized, descriptive alt text;
- motion is disabled when `prefers-reduced-motion: reduce` is active.

The default server-rendered state is Document editor. Without JavaScript, that
panel and its full-resolution link remain available.

## Component Boundary

Create a focused homepage component, `ProductWorkbenchSection.astro`. It owns:

- localized section copy;
- tab and panel markup;
- the two asset references;
- the small progressive-enhancement script for tab behavior.

`HomeRefresh.astro` only imports and places the component. No Workbench runtime
code, product state, or screenshot-generation logic is bundled into the public
site.

## Validation

Implementation is complete when:

- both screenshots are real, readable, consistently cropped, and free of
  private information;
- all three localized homepages build;
- the tab interface works by mouse and keyboard;
- the default panel remains usable without JavaScript;
- 1440 px and 390 px viewport checks show no clipping or horizontal overflow;
- reduced-motion mode removes the transition;
- `pnpm --filter web typecheck` and `pnpm --filter web build` pass;
- a final local homepage screenshot confirms the section fits the existing
  visual system.

## Out Of Scope

- replacing the current hero artwork;
- localizing the screenshots themselves;
- recording video or animated GIF demos;
- redesigning other homepage sections;
- changing Workbench behavior solely for the marketing capture.
