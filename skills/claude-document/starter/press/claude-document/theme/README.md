# Theme

This folder is the source of the document visual system. Keep the layers narrow so agents can change the right file without guessing.

- `tokens.css`: design variables only. Colors, font families, type scale, spacing, chart colors, and shared numeric tokens live here.
- `fonts.css` + `fonts/`: portable font contract. Any non-system font used by tokens must be loaded in `fonts.css` and bundled under `theme/fonts/`, so export can copy it to `/openpress/fonts/`.
- `base/`: global document rules. Page contract, headings, paragraphs, lists, figures, tables, captions, and print safeguards live here.
- `page-surfaces/`: legacy whole-page CSS for older starters. New cover, TOC, chapter opener, and back-cover layouts should be React components with Tailwind classes.

Do not add a `patterns/` folder by default. Prefer React components with Tailwind classes for chart frames, visual blocks, design-system swatches, and image grids. Use `document/components/<Component>/style.css` only for component-local CSS that cannot be expressed safely in Tailwind. Reader shell controls are owned by the OpenPress runtime. Generated files in `public/openpress/` and `dist-react/` are output only.

Current typography uses the portable sans / mono stack from `tokens.css`.
Only add a font file to `theme/fonts/` when a token actually references that family.
