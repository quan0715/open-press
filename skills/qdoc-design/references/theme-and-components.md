# Theme And Component Boundaries

## Theme Layers

Use theme layers by responsibility:

| Layer | Owns |
| --- | --- |
| `document/theme/tokens.css` | variables only: colors, fonts, type scale, spacing, chart colors, shared numeric tokens |
| `document/theme/fonts.css` and `fonts/` | font-face sources copied to `/qdoc/fonts.css` and `/qdoc/fonts/` |
| `document/theme/base/` | global page contract, typography, figures, tables, captions, TOC, print safeguards |
| `document/theme/page-surfaces/` | whole-page layouts such as cover, TOC, back cover, divider pages |
| `document/theme/patterns/` | reusable document-wide class patterns |
| `document/theme/shell/` | exported reader controls around the document |
| `document/components/<name>/style.css` | instance-scoped component CSS |

Do not put page-surface or component-specific CSS in `base/typography.css`.

## Component Extraction

Prefer `<qdoc-component name="<name>" />` when a visual block has structured sub-elements that map to data, repeats with different content, or would otherwise become a large inline HTML island.

Component package shape:

```txt
document/components/<name>/
  component.mjs   # optional renderer
  schema.json     # optional data schema
  style.css       # component-scoped CSS
  README.md       # purpose and usage
  data.json       # default instance data
  data.<variant>.json
```

Built-in chart packages omit `component.mjs` and declare `chartType: "bar" | "line" | "donut"` in data.

Keep image grids inline when pagination owns their page-break behavior. Do not extract foundational page surfaces such as cover/back-cover unless the design system does it as a coordinated change.

## Design System Source

`document/design-system/*.md` is a public-readable Design System Document. It should show realistic examples of the same theme used by the real document:

- typography hierarchy and scale;
- cover, TOC, chapter, and back-cover direction;
- paragraphs, lists, quotes, callouts;
- image, image-grid, chart, table, caption, and dense-content stress cases.

Do not create a second hidden design brief unless the user explicitly asks for a sandbox.

## Localization Defaults

QDoc engine does not embed a complete language system. Audit these per document:

- frontmatter `title:` on cover, TOC, and back cover;
- `theme/tokens.css` font stacks;
- `theme/base/typography.css` chapter and section numbering rules.

Workbench UI strings in `src/qdoc/` are application UI and belong to framework work, not document styling.
