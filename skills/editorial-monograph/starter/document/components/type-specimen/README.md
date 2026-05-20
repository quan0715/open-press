# type-specimen

A two-column specimen block: token name + spec on the left, a sample rendered in the actual typography on the right. Used inside the design system document so a reader can directly verify each typography token. Lives under `document/components/` because it depends on the document theme's font tokens.

Markdown usage:

```md
<qdoc-component name="type-specimen" />
```

Each row takes:

- `name` — token identifier (e.g. `cover-title`).
- `spec` — concise spec line (e.g. `34pt / 300 / 1.0 / 0.01em`).
- `sampleVariant` — one of `metric`, `cover-title`, `chapter-title`, `section-title`, `body`, `caption`. Maps to a `.type-specimen__sample--<variant>` style hook.
- `sample` — the text rendered with that style.

Add a new variant by extending the enum in `schema.json`, the `ALLOWED_VARIANTS` set in `component.mjs`, and the corresponding rule in `style.css`.
