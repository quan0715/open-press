# Tailwind Styling Rules

Slide styling is Tailwind-first. New slide decks, layouts, UI primitives, and generated slide stubs should use `op-*` semantic classes and approved Tailwind layout utilities instead of authoring new CSS files.

## Source Of Truth

The framework provides the shared slide style layer:

- Tailwind v4 Vite plugin is enabled by OpenPress.
- `tailwindcss/theme.css` and `tailwindcss/utilities.css` are imported.
- Preflight is intentionally not imported, so existing reader/workbench CSS is not globally reset.
- Slide tokens and component classes live in `packages/core/src/styles/openpress/slide-design-system.css`.

Downstream slide source uses those classes through JSX.

## File Responsibility Split

| File / Layer | What goes here | Rule |
| --- | --- | --- |
| `packages/core/src/styles/openpress/slide-design-system.css` | Shared `@theme` tokens and stable `op-*` component classes | Framework-owned |
| `components/DeckSlide.tsx` | Deck chrome JSX using `op-slide-*` classes | No local CSS import |
| `layouts/*.tsx` | Compound layout slots using `op-slide-*`, `op-*`, and allowed layout utilities | No local CSS import |
| `ui/*.tsx` | Small primitives using `op-*` classes | No local CSS import |
| `slides/<id>/slide.tsx` | Explicit slide content using protocol components | No slide-local CSS by default |
| `theme/*.css`, `layouts/*.css`, `ui/*.css`, `slides/<id>/style.css` | Legacy / escape hatch only | Avoid unless a user explicitly asks for custom CSS |

## Allowed Class Families

Use:

- Semantic components: `op-title`, `op-body`, `op-card`, `op-card-muted`, `op-panel`, `op-callout`, `op-chip`.
- Slide structures: `op-slide-page`, `op-slide-shell`, `op-slide-title-layout`, `op-slide-card-grid`, `op-slide-process-map`, `op-slide-blank-layout`.
- Semantic colors: `bg-bg`, `bg-surface`, `text-text`, `text-accent`, `border-border`.
- OpenPress spacing: `p-op-md`, `gap-op-lg`, `mt-op-sm`, `px-op-xl`.
- Simple layout utilities: `grid`, `flex`, `items-center`, `justify-between`, `grid-cols-2`, `min-w-0`.

Avoid in slide content:

- Arbitrary values: `text-[37px]`, `bg-[#123456]`, `mt-[19px]`.
- Raw Tailwind palette: `bg-blue-500`, `text-gray-900`.
- Web text scale: `text-xs`, `text-base`, `text-2xl`.
- Free positioning: `absolute`, `fixed`, `top-*`, `inset-*`.
- Transform / z-index / animation utilities: `scale-*`, `z-*`, `animate-*`.
- Inline style objects.

Template implementation files may use tightly-scoped arbitrary values only when they are hidden behind semantic `op-slide-*` classes in the shared style layer.

## Import Pattern

Do not import CSS from slide, layout, or UI TSX files.

```tsx
// Good
export function CardGridSlide(...) {
  return <section className="op-slide-card-grid-layout">...</section>;
}
```

```tsx
// Avoid
import "./card-grid-slide.css";
```

## Token Vocabulary Contract

Use the existing Tailwind token names instead of inventing deck-local CSS variables.

| Token Family | Examples |
| --- | --- |
| Surface | `bg-bg`, `bg-surface`, `bg-surface-muted`, `bg-surface-inverse` |
| Text | `text-text`, `text-text-muted`, `text-text-subtle`, `text-text-inverse` |
| Accent | `text-accent`, `bg-accent`, `bg-accent-muted` |
| Border | `border-border`, `border-border-strong` |
| Type | `op-display`, `op-title`, `op-section`, `op-lead`, `op-body`, `op-caption` |
| Spacing | `op-2xs`, `op-xs`, `op-sm`, `op-md`, `op-lg`, `op-xl`, `op-2xl` |

If a needed style repeats across layouts, add or reuse an `op-*` semantic class. If it is one-off, prefer changing the layout composition before adding CSS.

## Deck-level Visual Customisation

To change the visual style of an entire deck without touching JSX, override the
variable-backed values in the owning Press theme or page wrapper. Keep Tailwind
v4 `@theme` names stable and generic; do not hardcode deck-specific values into
a shared global `@theme` block in a multi-Press workspace.

```css
/* press/<slug>/theme/tokens.css  ← owning Press theme, NOT a slide CSS file */
.op-slide-page {
  /* Colors */
  --color-accent: #e53935;
  --color-bg: #0f0f0f;
  --color-surface: #1a1a1a;
  --color-text: #f5f5f5;
  --color-text-muted: rgba(245 245 245 / 0.7);
  --color-border: rgba(255 255 255 / 0.12);

  /* Typography */
  --font-heading: "Inter", sans-serif;
  --font-body: "Inter", sans-serif;
}
```

This is the right level for branding a deck. Do not add raw CSS classes to
slide content files, and do not put slide-only values in a shared theme that
also feeds A4 pages or social formats.
