# Theme And Component Boundaries

## Theme Layers

Use theme layers by responsibility:

| Layer | Owns |
| --- | --- |
| `document/theme/tokens.css` | variables only: colors, fonts, type scale, spacing, chart colors, shared numeric tokens |
| `document/theme/fonts.css` and `fonts/` | font-face sources copied to `/openpress/fonts.css` and `/openpress/fonts/` |
| `document/theme/base/` | global page contract, typography, figures, tables, captions, TOC, print safeguards |
| `document/theme/page-surfaces/` | whole-page layouts such as cover, TOC, optional chapter openers, back cover, divider pages |
| `document/theme/patterns/` | reusable document-wide class patterns |
| `document/theme/shell/` | exported reader controls around the document |
| `document/components/<name>/style.css` | instance-scoped component CSS |

Do not put page-surface or component-specific CSS in `base/typography.css`.

## Component Extraction

Prefer React components when a visual block has structured sub-elements, repeats with different props, or would otherwise become a large inline HTML island.

Component shape:

```txt
document/components/ComponentName.tsx
document/components/ComponentName/
  index.tsx       # default-exported React component
  style.css       # optional component-scoped CSS
```

Use PascalCase component names so MDX can call them directly:

```mdx
<ProcessDiagram title="Deploy flow" steps={["Validate", "Render", "Deploy"]} />
```

Props live in TypeScript types or interfaces next to the component. Do not add sidecar renderer, schema, data, or custom element bridge files.

Keep image grids inline when pagination owns their page-break behavior. Do not extract foundational page surfaces such as cover/back-cover/chapter-opener unless the design system does it as a coordinated React page-surface change.

## Page Surface Chrome

The Press tree and workspace page components own page chrome policy. Theme CSS styles the contract; it should not invent footer/header behavior that is absent from `document/index.tsx` or `document/components/`.

| Page kind | Theme surface | Footer |
| --- | --- | --- |
| `cover` | `page-surfaces/cover.css` | off |
| `toc` | `page-surfaces/toc.css` | off |
| `chapter-opener` | `page-surfaces/chapter-opener.css` when the pack supports book-like dividers | off |
| `content` | `base/typography.css` and patterns/components | on |
| `back-cover` | `page-surfaces/back-cover.css` | off |

Do not leave empty footer text or hide meaningful page numbers with one-off selectors. If a surface needs different chrome, implement that in the page/frame component first, then style the resulting class or data attribute.

## Design Document Source

`document/design.md` is a single public-readable design brief. It should describe the same theme the document actually uses:

- typography hierarchy and scale;
- cover, TOC, optional chapter-opener, chapter, and back-cover direction;
- paragraphs, lists, quotes, callouts;
- image, image-grid, chart, table, caption, and dense-content stress cases.

Caption wording and numbering belong to `openpress-writing` and the renderer. Design may style `figcaption`, `caption`, and `[data-openpress-caption]`, but should not require authors to maintain figure/table numbers or duplicate caption text inside visuals.

Do not create a second hidden design brief unless the user explicitly asks for a sandbox.

## Localization Defaults

open-press engine does not embed a complete language system. Audit these per document:

- `data-page-title` / visible title copy on cover, TOC, and back cover frames;
- `theme/tokens.css` font stacks;
- `theme/base/typography.css` chapter and section numbering rules.

Workbench UI strings in `src/openpress/` are application UI and belong to framework work, not document styling.
