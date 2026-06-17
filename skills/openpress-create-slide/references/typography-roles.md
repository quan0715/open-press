# Typography Role System

Slides use a semantic role system. Roles define **what a text element is**, not how it looks. Visual values come from theme tokens; structure comes from `Frame` / `box` / layout CSS.

## Three-Layer Rule

```
@open-press/core/theme → portable token graph
theme/default.css      → active CSS variables and semantic classes
Text / Frame source    → structure and editable content
```

Layout CSS must not redefine font sizes or colors. It only overrides when a layout genuinely needs a structural deviation.

---

## Token Dependencies

When using the public Theme API, define typography tokens with `defineTheme` before writing many templates:

```ts
import { defineTheme } from "@open-press/core/theme";

export const deckTheme = defineTheme({
  colors: {
    ink: "#111217",
    muted: "#8a8881",
    accent: "#d7332f",
  },
  fonts: {
    serif: "Georgia, 'Times New Roman', serif",
    sans: "Inter, system-ui, sans-serif",
  },
  typography: {
    title: { font: "serif", size: 124, lineHeight: 1.02, weight: 400, color: "ink" },
    lead: { font: "sans", size: 48, lineHeight: 1.24, color: "ink" },
    body: { font: "sans", size: 40, lineHeight: 1.35, color: "ink" },
    caption: { font: "sans", size: 24, lineHeight: 1.3, color: "muted" },
  },
});
```

The emitted variables are `--op-theme-type-<role>-font-family`, `--op-theme-type-<role>-font-size`, `--op-theme-type-<role>-line-height`, `--op-theme-type-<role>-font-weight`, `--op-theme-type-<role>-letter-spacing`, and `--op-theme-type-<role>-color`.

---

## Role Definitions

| Class | Role | Typical use |
| --- | --- | --- |
| `.eyebrow` | Chapter / category label | Section tag above heading |
| `.h1` | Main title | Core message of the slide |
| `.h2` | Supporting title | Subtitle, secondary heading |
| `.h3` | Item heading | List item title, sub-section label |
| `.body` | Primary body text | Main explanatory content |
| `.body-sm` | Secondary body text | Supporting detail, list item description |
| `.caption` | Figure label | Text below image or diagram |
| `.note` | Supplementary text | Source citation, fine print |
| `.marker` | Numbered / sequence marker | Step numbers, agenda numbers (01, 02, 03) |

---

## Base CSS

```css
.eyebrow {
  font-size: var(--op-theme-type-caption-font-size);
  font-weight: 700;
  color: var(--op-theme-color-accent);
  letter-spacing: 0.08em;
  line-height: 1.2;
}

.h1 {
  font-family: var(--op-theme-type-title-font-family);
  font-size: var(--op-theme-type-title-font-size);
  font-weight: var(--op-theme-type-title-font-weight);
  color: var(--op-theme-type-title-color);
  line-height: var(--op-theme-type-title-line-height);
}

.h2 {
  font-family: var(--op-theme-type-lead-font-family);
  font-size: var(--op-theme-type-lead-font-size);
  color: var(--op-theme-type-lead-color);
  line-height: var(--op-theme-type-lead-line-height);
}

.h3 {
  font-size: var(--op-theme-type-body-font-size);
  font-weight: 700;
  color: var(--op-theme-color-ink);
  line-height: 1.25;
}

.body {
  font-family: var(--op-theme-type-body-font-family);
  font-size: var(--op-theme-type-body-font-size);
  color: var(--op-theme-type-body-color);
  line-height: var(--op-theme-type-body-line-height);
}

.body-sm {
  font-size: var(--op-theme-type-caption-font-size);
  color: var(--op-theme-color-muted);
  line-height: var(--op-theme-type-caption-line-height);
}

.caption {
  font-size: var(--op-theme-type-caption-font-size);
  color: var(--op-theme-type-caption-color);
  line-height: var(--op-theme-type-caption-line-height);
}

.note {
  font-size: 15px;
  font-weight: 400;
  color: var(--op-theme-color-muted);
  line-height: 1.4;
  opacity: 0.72;
}

.marker {
  font-size: var(--op-theme-type-lead-font-size);
  color: var(--op-theme-color-accent);
  line-height: 1;
}
```

---

## Inline Extension

Every role class supports these inline HTML elements without extra classes:

```css
/* applies to all role classes */
.h1 strong, .h2 strong, .h3 strong,
.body strong, .body-sm strong { font-weight: 700; }

.h1 em, .h2 em, .h3 em,
.body em, .body-sm em {
  color: var(--op-theme-color-accent);
  font-style: normal;
}
```

Usage in JSX:

```tsx
<h2 className="h1">
  打造 <strong>7 天</strong>無休的數位員工
</h2>

<p className="body">
  AI 客服不是讓機器<em>取代</em>真人，而是讓真人專注在<em>更有價值的事</em>。
</p>
```

`<mark>` is reserved but not defined by default. Add only when highlight-style emphasis is needed:

```css
.h1 mark { background: none; color: var(--op-theme-color-accent); }
```

---

## Layout Override Rules

Layout CSS may override a role only for layout-driven reasons:

```css
/* ✓ — overriding max-width is structural */
.agenda-layout .h1 { max-width: 560px; }

/* ✓ — overriding font-size with a token when layout demands a different scale */
.agenda-layout .h1 { font-size: var(--op-theme-type-lead-font-size); }

/* ✗ — never hardcode values */
.agenda-layout .h1 { font-size: 92px; color: #172d4d; }
```

---

## Extension Pattern

Add a modifier class when a role needs a visual variant:

```css
.h1--light  { color: #fff7e8; }          /* dark background variant */
.body--muted { color: var(--op-theme-color-muted); } /* de-emphasized body */
.marker--large { font-size: var(--op-theme-type-lead-font-size); } /* oversized marker */
```

Never create a new role class for something that is already a variant of an existing role.
