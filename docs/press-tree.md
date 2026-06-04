# Press Tree Maintenance

Press Tree is the source model for OpenPress fixed-format documents. It keeps
document structure explicit, testable, and portable across A4 reports, social
posts, slides, and future fixed page formats.

## Core Contract

The Press Tree kernel has two layers: structural primitives that shape pages
and source allocation, and headless object primitives that make rendered output
selectable, commentable, and source-addressable.

| Primitive | Owns | Maintenance rule |
| --- | --- | --- |
| `Press` | Document composition boundary and render context. | Keep it free of document-type branching. |
| `Frame` | One fixed page surface with a stable `frameKey`. | Frame roles are opaque strings; helpers and themes interpret them. |
| `MdxArea` | A measurable source slot inside a frame. | Allocation fills areas by `chainId` and area index. |
| `ObjectEntity` | A rendered object boundary for selection, comments, source mapping, and future editing. | Headless only; do not inject document styling. |
| `Text` | A text-shaped `ObjectEntity`. | Keep it a thin wrapper around object metadata. |

Everything else is a helper or starter/theme convention. Covers, back covers,
TOCs, section pages, social posts, and slides are all just `Frame` instances
with different roles, classes, and children.

## Source Registration

Each `press/<slug>/press.tsx` owns source registration for one Press. The
folder-convention contract uses a default export that renders one `<Press>` —
sources are an array prop on that `<Press>`, and `package.json`'s `"openpress"`
field holds operational settings such as deploy configuration.

```tsx
import { Frame, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, Toc } from "@open-press/core/manuscript";

export default function UserStoryPress() {
  return (
    <Press
      slug="userstory"
      title="User Story"
      page="a4"
      sources={[
        mdxSource({ id: "story", preset: "section-folders", root: "userstory/chapters" }),
      ]}
    >
      <Frame frameKey="cover" role="manuscript.cover" chrome={false}>{/* cover */}</Frame>
      <Toc source="story" />
      <Sections source="story" />
    </Press>
  );
}
```

The registered source tree is the authority for search, replace, validation,
comment targeting, inline edits, and export. Avoid filesystem discovery outside
each Press's `sources`; it makes agent behavior harder to reproduce.

Each `<Press>` lives under its own folder (`press/<slug>/`), so
`discoverSectionStyles` can scope per-section CSS to the right Press.
Canvas-style Press entries also live in a folder and render hand-authored
frames without MDX sources.

## Page Geometry

Page size lives on each `<Press>` as a JSX prop. One Press → one geometry.

```tsx
<Press slug="userstory" title="User Story" page="a4" sources={[...]}>...</Press>
<Press slug="social" title="Hello, social" page="social-square">...</Press>
<Press slug="slide" title="Hello, slide" page="slide-16-9">...</Press>
```

Built-in presets:

| Preset | Size | Use |
| --- | --- | --- |
| `a4` | `210mm x 297mm` | Reports, proposals, papers, books |
| `social-square` | `1080px x 1080px` | Social post cards |
| `slide-16-9` | `1920px x 1080px` | Presentation slides |

Custom fixed sizes are allowed when a workspace or starter-bearing skill needs a new canonical format — pass an object instead of a preset name:

```tsx
<Press
  slug="story"
  title="Story Card"
  page={{ id: "story-card", label: "Story Card", width: "1080px", height: "1350px" }}
  sources={[...]}
>
  …
</Press>
```

The exporter injects each Press's page geometry into measurement CSS and writes
the same values into that Press's `document.json` theme; runtime CSS variables
then drive the reader, workbench toolbar, print route, and generated HTML. Do
not duplicate canonical width and height values across starter CSS files.

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

## Object Boundary

`ObjectEntity` is the shared language between rendered HTML and OpenPress
collaboration tools. Authors use it directly, or through thin wrappers such as
`Text`, when an element should be selectable, commentable, or tied to a source
location:

```tsx
import { Frame, Press, Text } from "@open-press/core";

function Cover() {
  return (
    <Frame frameKey="cover" role="document.cover" chrome={false}>
      <Text
        objectId="title"
        label="Cover title"
        as="p"
        source={{ path: "press/userstory/press.tsx", kind: "tsx-text", objectId: "title", scope: "Cover" }}
      >
        OpenPress Storybook
      </Text>
    </Frame>
  );
}
```

`ObjectEntity` props are data, not presentation:

- `objectId` is unique within its parent object.
- `kind` describes what the rendered object is (`text`, `media`,
  `component`, etc.).
- `label` is the user-facing name shown in workbench surfaces.
- `source` points back to MDX or TSX when comments and small edits need a
  write-back target.
- `metadata` stores optional scalar hints for tools.

Nested `Frame` components are regions, not extra pages. The outermost `Frame`
creates the page surface; child frames inherit the page id and become regular
object boundaries.

## Starter Skill Boundary

Starter-bearing skills are runnable examples, not renderer branches. A skill may provide:

- `starter/press/<slug>/press.tsx` (with one `<Press>` tree)
- `starter/package.openpress.json` snippet (the values agents merge into the workspace `package.json`'s `"openpress"` field)
- `starter/press/shared/theme/**`
- `starter/press/<slug>/components/**` and `starter/press/<slug>/chapters/**`
- `SKILL.md`

A starter-bearing skill should not modify engine code. If it needs new rendering behavior,
first add a small, tested core primitive or config model, then make the starter use
that public surface. OpenPress does not discover or fetch these starters; agents read
the skill and copy or adapt the starter into a workspace after `open-press init`.

### `theme/` directory layout

| Folder / file | Role | Required? |
| --- | --- | --- |
| `tokens.css` | CSS variables — colors, fonts, spacing, page geometry defaults. | Yes |
| `fonts.css` | `@font-face` rules for bundled webfonts (often empty). | Yes (may be empty) |
| `base/page-contract.css` | `@page` + page surface CSS that consumes the geometry tokens. | Yes |
| `base/typography.css` | Default type scale for `h1` … `p` inside `MdxArea`. | Yes |
| `base/print.css` | `@media print` rules for PDF export. | Yes (may be minimal) |
| `page-surfaces/{cover,toc,back-cover}.css` | Optional per-role styling. Stubs are kept so a starter can add a cover later without changing the layout file. | Optional |
| `shell/reader-controls.css` | Workbench / reader chrome overrides. Most starters leave this empty since the framework supplies controls. | Optional |
| `patterns/*.css` | Content-opt-in utility classes — figure grids, chart frames, table cell helpers, etc. Long-form A4 starters ship a small set; minimal starters (slides, social) skip the folder entirely. | Optional |

`patterns/` is the only folder that's content-typology-driven. A4 reports
typically need figure grids and chart-frame wrappers, so the long-form starters
ship `figure-grid.css`, `_chart-frame.css`, `table-utilities.css`. Slide and
social starters render one main block per page and don't need a utility library;
add `patterns/` only when actual MDX in the starter calls for it.

## Verification

For framework changes:

```bash
pnpm --filter @open-press/core test
pnpm --filter @open-press/core typecheck
pnpm --filter @open-press/cli build
```

For starter-bearing skill changes:

```bash
npx @open-press/cli init /tmp/openpress-scratch --no-git
cp -R skills/<skill>/starter/press /tmp/openpress-scratch/press
cd /tmp/openpress-scratch && npm run build
```

Each skill owns any deeper starter smoke test it needs. The framework CI keeps
starter-bearing skills visible, but the CLI does not maintain a starter registry.

## Maintenance Checklist

Before changing Press Tree behavior, confirm:

- The change belongs in core, not a starter-bearing skill.
- `press/<slug>/press.tsx` stays the document-shape authority for that Press.
- Page geometry stays on `<Press page>` (preset name or custom `{ id, label, width, height }`), not scattered CSS constants.
- Allocation changes have pure unit tests before full export tests.
- New starter-bearing skills update their own `SKILL.md`, starter files, docs
  references, and validation notes.
