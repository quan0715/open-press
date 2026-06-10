# Theme

This folder is the source of the document visual system. Keep the layers narrow so agents can change the right file without guessing.

- `tokens.css`: design variables only. Colors, font families, type scale, spacing, chart colors, and shared numeric tokens live here.
- `base/`: global document rules. Page contract, headings, paragraphs, lists, figures, tables, captions, and print safeguards live here.

Page surfaces, reader shell, and visual patterns now live in React/Tailwind by default. Prefer React components with Tailwind classes for cover/back-cover, TOC, chart frames, image grids, and design specimens. Add component-local CSS only for browser fixes or media rules that cannot be expressed safely in Tailwind. Generated files in `public/openpress/` and `dist-react/` are output only.
