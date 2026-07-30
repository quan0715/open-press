# Slide Icons

Use an icon package already declared by the workspace. Prefer, in order:

1. `lucide-react` for the default OpenPress stroke style.
2. `@phosphor-icons/react` when multiple visual weights are required.
3. `@tabler/icons-react` when an icon is unavailable in the first two.

Do not add a dependency solely for slide authoring. If no suitable package is installed, ask before installing one.

Hand-draw SVG only for structural diagrams, custom connectors, or brand-specific shapes. Put reusable custom SVG in `ui/<name>.tsx`, not in `press.tsx`.

## Sizing For 1920 × 1080

| Context | Size | Stroke/weight |
| --- | --- | --- |
| Hero or chapter | 48–80 px | thin / 1 |
| Card or list | 24–32 px | regular / 1.5 |
| Inline text | 16–20 px | regular / 2 |
| Action | 20–24 px | regular / 1.5 |

Use one icon family per deck unless the visual system explicitly requires otherwise.
