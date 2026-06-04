# Patterns

Reusable utility classes that MDX content opts into via `className`. Unlike
`base/` (page-level structure) or `tokens.css` (CSS variables), these only
apply when a `<figure class="chart-frame">`, `<div class="figure-grid">`,
or similar marker shows up in source.

| File | Class(es) | When to use |
| --- | --- | --- |
| `_chart-frame.css` | `.chart-frame` | A figure wrapper with a uniform border, padding, and `break-inside: avoid` — let figure components focus on their internal SVG/HTML structure. |
| `figure-grid.css` | `.figure-grid` (also `table.figure-grid`) | Multi-figure layouts (`grid-template-columns: repeat(2, ...)`). Use when an MDX page wants 2–3 figures laid out together. |
| `table-utilities.css` | `.cell-check`, `.cell-partial`, `.cell-dash`, `.status-text` | Semantic table cell helpers (`✓`, `△`, `—`) for comparison tables. |

Add a new file here when several MDX pages need the same content-decorating
pattern. If only one figure component needs it, put the CSS inside the
component instead.

`patterns/` is optional — minimal packs (single-page social cards, slide
decks) skip the folder entirely. See `docs/press-tree.md` for the full
`theme/` directory contract.
