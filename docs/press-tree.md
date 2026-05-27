# Press Tree Maintenance

Press Tree is the source model for OpenPress fixed-format documents. It keeps
document structure explicit, testable, and portable across A4 reports, social
posts, slides, and future fixed page formats.

## Core Contract

The renderer only depends on three primitives:

| Primitive | Owns | Maintenance rule |
| --- | --- | --- |
| `Press` | Document composition boundary and render context. | Keep it free of document-type branching. |
| `Frame` | One fixed page surface with a stable `frameKey`. | Frame roles are opaque strings; helpers and themes interpret them. |
| `MdxArea` | A measurable source slot inside a frame. | Allocation fills areas by `chainId` and area index. |

Everything else is a helper or style pack convention. Covers, TOCs, section
pages, social posts, and slides are all just `Frame` instances.

## Source Registration

`document/index.tsx` owns source registration:

```tsx
import { Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";

export const sources = {
  story: mdxSource({ preset: "section-folders", root: "chapters" }),
};

export default function Document() {
  return <Press>{/* frames and helpers */}</Press>;
}
```

The registered source tree is the authority for search, replace, validation,
comment targeting, inline edits, and export. Avoid filesystem discovery outside
`sources`; it makes agent behavior harder to reproduce.

## Page Geometry

Page size is config data, not a one-off CSS decision.

```js
export default {
  page: "a4",
};
```

Built-in presets:

| Preset | Size | Use |
| --- | --- | --- |
| `a4` | `210mm x 297mm` | Reports, proposals, papers, books |
| `social-square` | `1080px x 1080px` | Social post cards |
| `slide-16-9` | `1920px x 1080px` | Presentation slides |

Custom fixed sizes are allowed when a pack needs a new canonical format:

```js
export default {
  page: {
    id: "story-card",
    label: "Story Card",
    width: "1080px",
    height: "1350px",
  },
};
```

The exporter injects page geometry into measurement CSS and writes the same
values into `document.theme`; runtime CSS variables then drive the reader,
workbench toolbar, print route, and generated HTML. Do not duplicate canonical
width and height values across starter CSS files.

## Allocation

The allocation kernel is region-based:

1. Render the Press tree once to discover frames and `MdxArea` slots.
2. Measure source blocks and area capacities in Chromium.
3. Allocate measured blocks into ordered regions.
4. If `overflow="extend"` needs more frames, feed hints back into the Press
   tree and repeat until stable.
5. Render final HTML with the stable allocation.

`engine/react/pagination/allocator.mjs` is the shared low-level algorithm.
`engine/react/pipeline/allocate.mjs` adapts measured Press Tree frames into
that algorithm. Keep new pagination behavior in the shared allocator first,
then adapt the pipeline if it needs Press-specific metadata.

Current keep-with-next behavior:

- headings (`h1` through `h6`) stay with the following block when possible;
- captions stay with the following block when possible;
- attached layout blocks, such as table captions emitted separately for source
  editing, are not paginated as standalone content.

## Helper Boundary

`@open-press/core/manuscript` is a helper layer for long-form section flow:

- `Toc`
- `TocArea`
- `Sections`
- `Chapters` alias

It is not the renderer. Slide and social starters can still use `Sections` as a
simple "one source section becomes one page" helper, but they should not push
slide-specific behavior into manuscript helpers.

## Style Pack Boundary

Style packs are runnable examples, not renderer branches. A pack may provide:

- `starter/document/index.tsx`
- `starter/document/openpress.config.mjs`
- `starter/document/theme/**`
- `starter/document/components/**`
- sample MDX source
- `SKILL.md`

A pack should not modify engine code. If a pack needs new rendering behavior,
first add a small, tested core primitive or config model, then make the pack use
that public surface.

### `theme/` directory layout

| Folder / file | Role | Required? |
| --- | --- | --- |
| `tokens.css` | CSS variables — colors, fonts, spacing, page geometry fallback. | Yes |
| `fonts.css` | `@font-face` rules for bundled webfonts (often empty). | Yes (may be empty) |
| `base/page-contract.css` | `@page` + page surface CSS that consumes the geometry tokens. | Yes |
| `base/typography.css` | Default type scale for `h1` … `p` inside `MdxArea`. | Yes |
| `base/print.css` | `@media print` rules for PDF export. | Yes (may be minimal) |
| `page-surfaces/{cover,toc,back-cover}.css` | Optional per-role styling. Stubs are kept so a pack can add a cover later without changing the layout file. | Optional |
| `shell/reader-controls.css` | Workbench / reader chrome overrides. Most packs leave this empty since the framework supplies controls. | Optional |
| `patterns/*.css` | Content-opt-in utility classes — figure grids, chart frames, table cell helpers, etc. Long-form A4 packs ship a small set; minimal packs (slides, social) skip the folder entirely. | Optional |

`patterns/` is the only folder that's content-typology-driven. A4 reports
typically need figure grids and chart-frame wrappers, so the long-form packs
ship `figure-grid.css`, `_chart-frame.css`, `table-utilities.css`. Slide and
social packs render one main block per page and don't need a utility library;
add `patterns/` only when actual MDX in the pack calls for it.

## Verification

For framework changes:

```bash
pnpm --filter @open-press/core test
pnpm --filter @open-press/core typecheck
pnpm --filter @open-press/cli build
```

For pack changes:

```bash
node packages/core/engine/cli.mjs validate skills/<pack>/starter
node packages/core/engine/cli.mjs export skills/<pack>/starter
```

CI also runs the `pack-smoke` matrix for every pack in
`packages/cli/style-packs.json`.

## Maintenance Checklist

Before changing Press Tree behavior, confirm:

- The change belongs in core, not a style pack.
- `document/index.tsx` stays the document-shape authority.
- Page geometry stays in config/theme metadata, not scattered CSS constants.
- Allocation changes have pure unit tests before full export tests.
- New packs are added to `packages/cli/style-packs.json`, skills docs, CLI docs,
  and CI smoke coverage.
