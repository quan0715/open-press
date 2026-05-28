# Theme

This theme is intentionally small. Page size is controlled by
`document/openpress.config.mjs`, not by copying width and height values across
CSS files.

## Where to change what

| You want to change | Edit |
| --- | --- |
| Card width / height / aspect ratio | `openpress.config.mjs` → `page: "social-square"` or a custom preset |
| Card padding (top / sides / bottom) | `theme/tokens.css` → `--openpress-page-padding-{top,x,bottom}` |
| Vertical gap between blocks inside a card | `theme/tokens.css` → `--openpress-page-body-gap` |
| Colors, fonts, accent | `theme/tokens.css` |
| Card-level CSS structure | `theme/base/page-contract.css` |
| Typography scale for `h2` / `p` / etc. | `theme/base/typography.css` |

The `theme/page-surfaces/` directory holds optional surface-specific styles
(cover, TOC, back-cover). They are intentionally stubs in this starter —
add cover/back-cover variants there without touching the base layout.
