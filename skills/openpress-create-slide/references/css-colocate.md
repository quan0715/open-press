# CSS Co-location Rules

## File Responsibility Split

Never write all CSS into a single file.

| File | What goes here | Hard limit |
| --- | --- | --- |
| `theme/tokens.css` | CSS custom properties only: colors, fonts, spacing scale, radius | ~60 lines |
| `theme/slides.css` | Slide shell chrome only: `.op-slide`, surface, footer, global canvas rules | ~80 lines |
| `layouts/<name>.css` | Grid and slot rules for that layout only | per-layout |
| `ui/<name>.css` | Styles for that UI primitive only | per-component |
| `components/DeckSlide.css` | DeckSlide wrapper styles that cannot live in `slides.css` | optional |

## Import Pattern

Each component imports its own CSS at the top of its TSX file.

```tsx
// layouts/agenda-slide.tsx
import "./agenda-slide.css";

export function AgendaSlide(...) { ... }
```

```tsx
// ui/timeline.tsx
import "./timeline.css";

export function Timeline(...) { ... }
```

The deck entry (`press.tsx`) only imports `theme/tokens.css` and `theme/slides.css`. It does not import layout or UI CSS — those travel with their component files.

## Rule

If a style block is specific to one layout or one UI primitive, it belongs in that component's own CSS file. Do not accumulate layout rules inside `slides.css`.
