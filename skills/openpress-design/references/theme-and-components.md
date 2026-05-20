# Theme And Component Boundaries

## Theme Layers

Use theme layers by responsibility:

| Layer | Owns |
| --- | --- |
| `document/theme/tokens.css` | variables only: colors, fonts, type scale, spacing, chart colors, shared numeric tokens |
| `document/theme/fonts.css` and `fonts/` | font-face sources copied to `/qdoc/fonts.css` and `/qdoc/fonts/` |
| `document/theme/base/` | global page contract, typography, figures, tables, captions, TOC, print safeguards |
| `document/theme/page-surfaces/` | whole-page layouts such as cover, TOC, optional chapter openers, back cover, divider pages |
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

Keep image grids inline when pagination owns their page-break behavior. Do not extract foundational page surfaces such as cover/back-cover/chapter-opener unless the design system does it as a coordinated change.

## Page Surface Chrome

The renderer owns page chrome policy. Theme CSS should style the contract, not invent per-document footer hacks:

| Page kind | Theme surface | Footer |
| --- | --- | --- |
| `cover` | `page-surfaces/cover.css` | off |
| `toc` | `page-surfaces/toc.css` | off |
| `chapter-opener` | `page-surfaces/chapter-opener.css` when the pack supports book-like dividers | off |
| `chapter` | `base/typography.css` and patterns/components | on |
| `back-cover` | `page-surfaces/back-cover.css` | off |

Use `.reader-page.no-footer .page-frame` for layout rows when a surface has no footer. Do not leave empty footer text or hide meaningful generated page numbers with one-off selectors.

## Design Document Source

`document/design.md` is a single public-readable design brief. It should describe the same theme the document actually uses:

- typography hierarchy and scale;
- cover, TOC, optional chapter-opener, chapter, and back-cover direction;
- paragraphs, lists, quotes, callouts;
- image, image-grid, chart, table, caption, and dense-content stress cases.

Do not create a second hidden design brief unless the user explicitly asks for a sandbox.

## Localization Defaults

open-press engine does not embed a complete language system. Audit these per document:

- frontmatter `title:` on cover, TOC, and back cover;
- `theme/tokens.css` font stacks;
- `theme/base/typography.css` chapter and section numbering rules.

Workbench UI strings in `src/qdoc/` are application UI and belong to framework work, not document styling.
