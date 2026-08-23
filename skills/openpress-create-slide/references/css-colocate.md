# Slide CSS placement

Use the smallest source location that truthfully owns a style.

| Style | Source location |
| --- | --- |
| Framework primitives | `packages/core/src/openpress/workbench/styles/` |
| Deck-wide tokens and typography | `press/<slug>/theme/default.css` |
| Reused local UI | beside the component or in the active deck theme |
| A single composition | the slide source or a sibling stylesheet |

Do not place authored Press styles in generated output. Do not create a second theme source and copy between it and the active theme.

## Practical rules

- Define color, type, spacing, and elevation tokens in the active theme before repeating raw values.
- Prefer meaningful local class names such as `.evidence-grid` or `.section-kicker` over broad generic selectors.
- Keep visual primitives content-free. The slide source should retain its own words, data, imagery, and message hierarchy.
- When a style is shared by two slides, move only the shared rule; do not turn both slide bodies into indirect configuration.
- Check contrast, long text, and small-screen Workbench rendering after a CSS change.
