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

---

## Token Vocabulary Contract

`tokens.css` must define these semantic tokens. Values are deck-specific — only the names are required.

```css
:root {
  /* Surface */
  --surface:          /* default slide background */
  --surface-dark:     /* dark slide variant (cover, closing) */
  --surface-paper:    /* card / inset surface */

  /* Ink */
  --ink:              /* primary body text */
  --ink-heading:      /* heading / strong text (often darker than --ink) */
  --ink-muted:        /* secondary / caption text */

  /* Accent */
  --accent:           /* primary brand color — buttons, markers, eyebrows */
  --accent-soft:      /* tinted background for accent elements */

  /* Border */
  --line:             /* pure border color */
  --line-border:      /* standard 1px divider (rgba variant of --line) */

  /* Type scale */
  --text-sm:          /* metadata, small body (~19px) */
  --text-body:        /* standard body (~25px) */
  --text-lg:          /* large body / lead (~30px) */
  --head-xs:          /* small heading / list label (~38px) */
  --head-sm:          /* medium heading (~62px) */
  --head-md:          /* main title (~82px) */

  /* Font */
  --font-sans:
  --font-serif:       /* optional */

  /* Weight */
  --weight-light:     /* 300 */
  --weight-regular:   /* 400 */
  --weight-bold:      /* 500 or 700 */
}
```

**Always use tokens, never hardcode values in layout or UI files:**

```css
/* ✗ */
.some-layout strong { color: #172d4d; }
.some-layout { border-top: 1px solid rgba(80, 69, 48, 0.2); }

/* ✓ */
.some-layout strong { color: var(--ink-heading); }
.some-layout { border-top: 1px solid var(--line-border); }
```

This contract does not prescribe specific colors or sizes — those are the deck's creative decisions. It only requires the names to exist so agents can write layout CSS without hardcoding values.
