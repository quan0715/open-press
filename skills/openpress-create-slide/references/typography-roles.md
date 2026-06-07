# Typography Role System

Slides use a nine-class semantic role system. Roles define **what a text element is**, not how it looks. Visual values come from tokens; structure comes from layout CSS.

## Three-Layer Rule

```
tokens.css     → values (sizes, colors, weights)
base roles     → semantic meaning (what this text IS)
layout CSS     → structure only (grid, position, gap)
```

Layout CSS must not redefine font sizes or colors. It only overrides when a layout genuinely needs a structural deviation.

---

## Token Dependencies

These tokens must exist in `tokens.css` before any role class is used:

| Purpose | Required tokens |
| --- | --- |
| Color | `--ink`, `--ink-heading`, `--ink-muted`, `--accent` |
| Type scale | `--head-md`, `--head-sm`, `--head-xs`, `--text-lg`, `--text-body`, `--text-sm` |
| Weight | `--weight-light`, `--weight-regular`, `--weight-bold` |

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
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--accent);
  letter-spacing: 0.08em;
  line-height: 1.2;
}

.h1 {
  font-size: var(--head-md);
  font-weight: var(--weight-light);
  color: var(--ink-heading);
  line-height: 1.08;
}

.h2 {
  font-size: var(--head-sm);
  font-weight: var(--weight-light);
  color: var(--ink-heading);
  line-height: 1.16;
}

.h3 {
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  color: var(--ink-heading);
  line-height: 1.25;
}

.body {
  font-size: var(--text-body);
  font-weight: var(--weight-light);
  color: var(--ink);
  line-height: 1.55;
}

.body-sm {
  font-size: var(--text-sm);
  font-weight: var(--weight-light);
  color: var(--ink-muted);
  line-height: 1.5;
}

.caption {
  font-size: var(--text-sm);
  font-weight: var(--weight-regular);
  color: var(--ink-muted);
  line-height: 1.4;
}

.note {
  font-size: 15px;
  font-weight: var(--weight-regular);
  color: var(--ink-muted);
  line-height: 1.4;
  opacity: 0.72;
}

.marker {
  font-size: var(--head-xs);
  font-weight: var(--weight-light);
  color: var(--accent);
  line-height: 1;
}
```

---

## Inline Extension

Every role class supports these inline HTML elements without extra classes:

```css
/* applies to all role classes */
.h1 strong, .h2 strong, .h3 strong,
.body strong, .body-sm strong { font-weight: var(--weight-bold); }

.h1 em, .h2 em, .h3 em,
.body em, .body-sm em {
  color: var(--accent);
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
.h1 mark { background: none; color: var(--accent); }
```

---

## Layout Override Rules

Layout CSS may override a role only for layout-driven reasons:

```css
/* ✓ — overriding max-width is structural */
.agenda-layout .h1 { max-width: 560px; }

/* ✓ — overriding font-size when layout demands a different scale */
.agenda-layout .h1 { font-size: var(--head-lg); }

/* ✗ — never hardcode values */
.agenda-layout .h1 { font-size: 92px; color: #172d4d; }
```

---

## Extension Pattern

Add a modifier class when a role needs a visual variant:

```css
.h1--light  { color: #fff7e8; }          /* dark background variant */
.body--muted { color: var(--ink-muted); } /* de-emphasized body */
.marker--large { font-size: var(--head-sm); } /* oversized marker */
```

Never create a new role class for something that is already a variant of an existing role.
