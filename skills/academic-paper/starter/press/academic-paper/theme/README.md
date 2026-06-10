# Theme

This folder is the source of the document visual system. Keep the layers narrow so agents can change the right file without guessing.

- `tokens.css`: design variables only. Colors, font families, type scale, spacing, chart colors, and shared numeric tokens live here.
- `base/`: global document rules. Page contract, headings, paragraphs, lists, figures, tables, captions, and print safeguards live here.
- `page-surfaces/`: legacy whole-page CSS for older starters. New cover, TOC, chapter opener, and back-cover layouts should be React components with Tailwind classes.

Do not add a `patterns/` folder by default. Prefer React components with Tailwind classes for chart frames, visual blocks, design swatches, and image grids. Use `document/components/ComponentName/style.css` only for component-local CSS that cannot be expressed safely in Tailwind. Reader shell controls are owned by the OpenPress runtime. Generated files in `public/openpress/` and `dist-react/` are output only.
