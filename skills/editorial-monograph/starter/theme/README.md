# Theme

This folder is the source of the document visual system. Keep the layers narrow so agents can change the right file without guessing.

- `tokens.css`: design variables only. Colors, font families, type scale, spacing, chart colors, and shared numeric tokens live here.
- `base/`: global document rules. Page contract, cover/back-cover, TOC, headings, paragraphs, lists, figures, tables, captions, and print safeguards live here.
- `components/`: named document components and specimens. Put chart frames, visual blocks, design-system swatches, image grids, and other class-based content patterns here.
- `shell/`: exported reader controls around the document. Do not put document typography or component styling here.

Use `document/components/<name>/style.css` for CSS that belongs to a `<qdoc-component>` renderer. Generated files in `public/qdoc/` and `dist-react/` are output only.
