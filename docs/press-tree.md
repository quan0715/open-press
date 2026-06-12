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
<Press slug="slide" title="Hello, slide" page="slide-16-9">...</Press>
<Press
  slug="social"
  title="Hello, social"
  page={{ id: "openpress-social-card", label: "OpenPress Social Card", width: "1080px", height: "1080px" }}
>
  ...
</Press>
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

Prefer a custom object for project-specific formats such as one-off social
cards, campaign images, or venue-specific print sizes. Add a framework preset
only when the geometry is generic enough to be reused across unrelated Press
workspaces.

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
- `starter/press/<slug>/components/**` and `starter/press/<slug>/chapters/**`
- `starter/press/<slug>/theme/**`
- `SKILL.md`

A starter-bearing skill should not modify engine code. If it needs new rendering behavior,
first add a small, tested core primitive or config model, then make the starter use
that public surface. OpenPress does not discover or fetch these starters; agents read
the skill and copy or adapt the starter into an OpenPress workspace.

### `theme/` directory layout

| Folder / file | Role | Required? |
| --- | --- | --- |
| `tokens.css` | Stable design variables — colors, font roles, type scale, spacing, chart/status tokens, and page geometry fallbacks. | Yes |
| `fonts.css` | `@font-face` rules for bundled webfonts. Keep remote `@import` out of production Press themes. | Yes (may be empty only when relying entirely on system fonts) |
| `fonts/` | Self-hosted `.woff2` / `.woff` / `.ttf` font files copied into public output. | Optional, recommended for PDF/offline reproducibility |
| `prose.css` | MDX prose rules that affect pagination: body density, heading rhythm, tables, code blocks, figures, captions. | Optional, recommended for page Presses |

The framework owns `page-contract.css`, the print route reset, generic `@page`,
reader page/frame invariants, and the measurement shell. Press folders own
their visual prose density through local `prose.css`, CSS variables in
`tokens.css`, and React/Tailwind component classes.

### Font role contract

Page themes should expose font roles instead of scattering raw family names
through `press.tsx`, prose selectors, and component CSS:

| Role | Recommended use |
| --- | --- |
| `body` | Body copy, tables, captions, notes, and page UI text. |
| `serif` | Book titles, chapter headings, formal editorial passages. |
| `mono` | Code, paths, data fields, and source-like labels. |
| `display` | Optional cover-scale identity text. |

Use Press-scoped variables for the actual visual system, then bridge them into
the `--openpress-*` variables consumed by framework/runtime surfaces:

```css
:root {
  --report-font-body: "Report Sans Latin", "PingFang TC", "Noto Sans TC", sans-serif;
  --report-font-serif: "Report Serif", "Noto Serif TC", serif;
  --report-font-mono: "SFMono-Regular", "Menlo", monospace;
  --report-font-display: var(--report-font-serif);

  --openpress-font-body: var(--report-font-body);
  --openpress-font-serif: var(--report-font-serif);
  --openpress-font-mono: var(--report-font-mono);
  --openpress-font-display: var(--report-font-display);
}
```

For Chinese/English documents, put the Latin brand face first when it is
self-hosted, then list local Traditional Chinese fallbacks. This keeps Latin
metrics reproducible while avoiding large CJK font bundles by default:

```css
--report-font-body: "Report Sans Latin", "PingFang TC", "Noto Sans TC", "Hiragino Sans", "Microsoft JhengHei", sans-serif;
--report-font-serif: "Noto Serif TC", "Songti TC", "Source Han Serif TC", "PMingLiU", serif;
```

When exact CJK glyphs must match across machines or CI-generated PDFs, bundle a
licensed CJK subset under `press/<slug>/theme/fonts/` and prepend that family in
the same role token. Do not depend on Google Fonts `@import` for final delivery;
network font CSS makes PDF and offline builds non-reproducible.

Self-hosted font example:

```css
@font-face {
  font-family: "Report Sans Latin";
  src: url("/openpress/fonts/report-sans-latin-400.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

`theme/fonts/` is copied to `/openpress/fonts/` during export. In multi-Press
workspaces, keep font file names unique enough to avoid collisions when several
Press folders contribute font assets.

### Multi-Press CSS Boundary

One workspace can host multiple Presses with incompatible formats, such as an
A4 report, a 16:9 slide deck, and a social card set. CSS must therefore be
scoped by ownership rather than dumped into one global theme:

- Framework CSS owns runtime invariants: reader page geometry, frame slot
  measurement, print-route reset, and generated viewer chrome.
- New work should not rely on `press/shared/theme` as a baseline. Create
  `press/shared/` only when multiple Presses intentionally share assets, facts,
  or components.
- A Press that needs a distinct visual system should define variables under a
  Press-scoped selector or component wrapper, then map Tailwind v4 `@theme`
  tokens to those variables. The utility name can stay stable while the value is
  contextual.
- Page chrome, cover/back-cover/TOC layout, slide layout, and prose variants
  belong in React components with Tailwind classes; avoid page-shell or prose
  CSS in workspace themes.
- Per-Press `theme/` is the default place for tokens and font loading. Shared
  theme is a compatibility/coordination escape hatch, not the default authoring
  model.

## Verification

For framework changes:

```bash
pnpm --filter @open-press/core test
pnpm --filter @open-press/core typecheck
pnpm --filter @open-press/cli build
```

For starter-bearing skill changes:

```bash
npm create @open-press /tmp/openpress-scratch -- --type slides --no-git
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
