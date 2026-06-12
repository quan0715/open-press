# userstory/theme

Userstory-specific theme tokens, prose rules, and font loading live here.
Dogfood Presses do not depend on `press/shared`; each Press owns the variables
and font assets it needs.

## Files

- `fonts.css` loads self-hosted Latin webfont files from `theme/fonts/`.
- `tokens.css` defines UserStory-owned design tokens, then maps them into the
  `--openpress-*` compatibility variables consumed by existing components.
- `prose.css` owns pagination-sensitive MDX rules such as body text size, table
  density, code block wrapping, and figure spacing.

## Font roles

OpenPress page themes should define font roles rather than scattering font
family names through JSX or prose CSS:

| Role | Use |
| --- | --- |
| `body` | Body copy, tables, captions, notes, UI text inside the page. |
| `serif` | Book title, chapter headings, and formal editorial passages. |
| `mono` | Code, paths, data fields, and source-like labels. |
| `display` | Optional cover-scale identity text. |

This Press self-hosts `UserStory Sans Latin` for English/Latin glyphs and uses
local Traditional Chinese fallback fonts by default. If a downstream workspace
needs identical Chinese glyphs across machines, bundle licensed CJK subset files
under `theme/fonts/` and prepend that family in `--userstory-font-body` or
`--userstory-font-serif`.
