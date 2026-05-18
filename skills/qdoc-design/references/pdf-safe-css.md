# PDF-Safe CSS Notes

Use this reference when editing QDoc CSS that affects fixed pages, PDF output, or renderer stability.

## Prefer

- fixed page geometry;
- container-relative type scales;
- explicit image dimensions or max dimensions;
- `break-inside: avoid` only for blocks that must stay together;
- table and figure captions outside the media object;
- CSS variables for theme values.

## Avoid

- viewport-width type for fixed-format content;
- uncontrolled `position: absolute` near footer/header;
- large nested cards;
- transform-based layout where measurement matters;
- SVG text for document copy unless the visual must be one fixed asset;
- mobile RWD changes that alter canonical PDF layout.

## PDF Export

PDF output is an export artifact. Do not embed the browser's built-in PDF viewer as the primary QDoc reading surface; it introduces a second toolbar, second page model, and inconsistent navigation. The deployed reader should remain QDoc-owned DOM.

## Design Skill Boundary

PDF-safe does not mean visually conservative. It means the chosen design must survive measurement, pagination, and rendering.
