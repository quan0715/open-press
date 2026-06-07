# Icon Libraries for Slides

Prefer open-source React icon packages over hand-drawn SVG. Hand-draw SVG only for structural diagrams, flow arrows, or architecture lines that no icon library covers.

## Recommended Libraries

### lucide-react (default)
```bash
npm install lucide-react
```
- 1500+ icons, consistent 24 px grid, stroke-based
- Already used in OpenPress workbench — safe to use in slides without style conflict
- Best for: UI actions, status indicators, general content icons

```tsx
import { ArrowRight, CheckCircle, Users } from "lucide-react";

<CheckCircle size={32} strokeWidth={1.5} />
```

### @phosphor-icons/react (when weight variety matters)
```bash
npm install @phosphor-icons/react
```
- 9000+ icons, 6 weights: `thin` / `light` / `regular` / `bold` / `fill` / `duotone`
- Useful when a slide needs visually heavier or lighter icons to match density
- Best for: decks with mixed weight intentionality, cover icons, chapter markers

```tsx
import { Storefront, Robot } from "@phosphor-icons/react";

<Storefront size={48} weight="thin" />
<Robot size={48} weight="bold" />
```

### @tabler/icons-react (large set, stroke-consistent)
```bash
npm install @tabler/icons-react
```
- 5000+ icons, all stroke-based, very consistent line weight
- Best for: technical slides, dashboards, when you need niche icons not in lucide

```tsx
import { IconBrandLine, IconDatabase } from "@tabler/icons-react";

<IconBrandLine size={32} stroke={1.5} />
```

## What NOT to Use

- **`react-icons`** — aggregates many sets with inconsistent styles; mixing sets breaks slide visual coherence
- **Inline `<svg>`** for general UI icons — hard to maintain and usually looks heavier than library icons at the same size

## When to Hand-Draw SVG

- Flow diagrams with custom arrows or connection lines
- Architecture diagrams with spatial layout
- Brand-specific shapes not in any library

Keep hand-drawn SVG in `ui/<name>.tsx`, not inline in `press.tsx`.

## Size & Weight Guidelines for Slides (1920×1080 canvas)

| Context | Size | strokeWidth / weight |
| --- | --- | --- |
| Large feature icon (hero, chapter) | 48–80 px | `thin` or `1` |
| Card or list icon | 24–32 px | `regular` or `1.5` |
| Inline text icon | 16–20 px | `regular` or `2` |
| CTA or action button icon | 20–24 px | `regular` or `1.5` |
