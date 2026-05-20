# token-swatch-grid

A three-column grid of color swatches referenced by `design.md`. Each card shows a color sample, the token name, the hex value, and one line of usage guidance.

Markdown usage:

```md
<qdoc-component name="token-swatch-grid" />
```

Each swatch takes:

- `name` — token identifier (`document`, `ink`, `chart-gold`…).
- `hex` — hex value, displayed as the value line.
- `summary` — one line describing where the color is used.
- `swatchVar` — CSS value for the swatch sample. Must be `var(--token)` or a hex literal. The renderer rejects anything else to avoid CSS injection.
- `swatchBorderVar` (optional) — only needed when the sample is white or near-document; matches `swatchVar` constraints.
- `dark` — set `true` for dark backgrounds; adds the `token-swatch--dark` modifier.
