# Tailwind And Theme Styling Rules

Slide styling is Tailwind-first and theme-token-aware. New slide decks, templates, UI primitives, and generated slide stubs should use `op-*` semantic classes, `@open-press/core/theme` tokens when a portable style package is needed, and approved Tailwind layout utilities instead of authoring slide-local CSS files.

## Source Of Truth

The framework provides the shared slide style layer:

- Tailwind v4 Vite plugin is enabled by OpenPress.
- `tailwindcss/theme.css` and `tailwindcss/utilities.css` are imported.
- Preflight is intentionally not imported, so existing reader/workbench CSS is not globally reset.
- Slide tokens and component classes live in `packages/core/src/styles/openpress/slide-design-system.css`.

Downstream slide source uses those classes through JSX.

Portable deck style is owned by:

- `press/<slug>/slide-style/theme/default.css` for a template package's source theme.
- `press/<slug>/theme/default.css` for the active Press theme.
- Optional theme token helpers from `@open-press/core/theme` (`defineTheme`, `themeToCssText`) when the style needs reusable colors/fonts/typography.

## File Responsibility Split

| File / Layer | What goes here | Rule |
| --- | --- | --- |
| `packages/core/src/styles/openpress/slide-design-system.css` | Shared `@theme` tokens and stable `op-*` component classes | Framework-owned |
| `slide-style/manifest.json` | Registered template names and source paths | Source of truth for CLI and Workbench template add |
| `slide-style/templates/*/slide.tsx` | Portable complete slide templates | Core objects + semantic classes; no local CSS import |
| `slide-style/theme/default.css` | Portable template package theme | Colors, fonts, typography variables and repeated `op-*` classes |
| `theme/default.css` | Active per-Press theme | Copied/synced from slide-style theme, then deck-specific overrides |
| `ui/*.tsx` | Small primitives using `op-*` classes | No local CSS import |
| `slides/<id>/slide.tsx` | Explicit slide content using copied template source and core objects | No slide-local CSS by default |
| `theme/*.css`, `layouts/*.css`, `ui/*.css`, `slides/<id>/style.css` | Custom CSS exception | Avoid unless a user explicitly asks for CSS that cannot be represented with template composition and semantic classes |

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

If a needed style repeats across templates or slides, add or reuse an `op-*` semantic class in the active theme. If it is one-off, prefer changing the layout composition before adding CSS.

## Theme API Pattern

When style must be portable, define the token vocabulary first:

```ts
import { defineTheme, themeToCssText } from "@open-press/core/theme";

const deckTheme = defineTheme({
  name: "Source Deck",
  colors: {
    bg: "#f8f2e6",
    ink: "#111217",
    accent: "#d7332f",
    muted: "#8a8881",
  },
  fonts: {
    serif: "Georgia, 'Times New Roman', serif",
    sans: "Inter, system-ui, sans-serif",
  },
  typography: {
    title: { font: "serif", size: 124, lineHeight: 1.02, color: "ink" },
    body: { font: "sans", size: 40, lineHeight: 1.35, color: "ink" },
  },
});

const css = themeToCssText(deckTheme, ".op-source-deck-slide");
```

Use the generated CSS variables in theme CSS:

```css
.op-source-deck-title {
  font-family: var(--op-theme-type-title-font-family);
  font-size: var(--op-theme-type-title-font-size);
  line-height: var(--op-theme-type-title-line-height);
  color: var(--op-theme-type-title-color);
}
```

Do not put theme values in every `slide.tsx`. Keep JSX structural; keep typography and colors in theme CSS.

## Deck-Level Visual Customisation

To change the visual style of an entire deck without touching JSX, override the
theme-backed values in the portable `slide-style` theme or the active Press
theme. Keep Tailwind v4 `@theme` names stable and generic; do not hardcode
deck-specific values into a shared global `@theme` block in a multi-Press
workspace.

```css
/* press/<slug>/theme/default.css or slide-style/theme/default.css */
.op-source-deck-slide {
  --op-theme-color-bg: #f8f2e6;
  --op-theme-color-ink: #111217;
  --op-theme-color-accent: #d7332f;
  --op-theme-color-muted: #8a8881;
  --op-theme-type-title-font-family: Georgia, "Times New Roman", serif;
  --op-theme-type-title-font-size: 124px;
  --op-theme-type-title-line-height: 1.02;
  --op-theme-type-body-font-family: Inter, system-ui, sans-serif;
}
```

This is the right level for branding a deck. Do not add raw CSS classes to
slide content files, and do not put slide-only values in a shared theme that
also feeds A4 pages or social formats.
