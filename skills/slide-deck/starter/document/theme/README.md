# Theme

This theme is intentionally small. Page size is controlled by
`document/openpress.config.mjs`, not by repeated CSS constants.

## Where to change what

| You want to change | Edit |
| --- | --- |
| Page width / height / aspect ratio | `openpress.config.mjs` → `page: "slide-16-9"` or a custom preset |
| Slide margins (top / sides / bottom) | `theme/tokens.css` → `--openpress-page-padding-{top,x,bottom}` |
| Vertical gap between blocks inside a slide | `theme/tokens.css` → `--openpress-page-body-gap` |
| Colors, fonts, accent | `theme/tokens.css` |
| Slide-level CSS structure (grid template, footer, etc.) | `theme/base/page-contract.css` |
| Typography scale for `h2` / `p` / etc. | `theme/base/typography.css` |

The `theme/page-surfaces/` directory holds optional surface-specific styles
(cover, TOC, back-cover). They are intentionally stubs in this starter — a
deck that adds an opening title slide can put its rules in
`page-surfaces/cover.css` without touching the base layout.
