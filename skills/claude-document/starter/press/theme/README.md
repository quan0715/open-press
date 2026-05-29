# Theme

This folder is the source of the document visual system. Keep the layers narrow so agents can change the right file without guessing.

- `tokens.css`: design variables only. Colors, font families, type scale, spacing, chart colors, and shared numeric tokens live here.
- `fonts.css` + `fonts/`: portable font contract. Any non-system font used by tokens must be loaded in `fonts.css` and bundled under `theme/fonts/`, so export can copy it to `/openpress/fonts/`.
- `base/`: global document rules. Page contract, cover/back-cover, TOC, headings, paragraphs, lists, figures, tables, captions, and print safeguards live here.
- `page-surfaces/`: whole-page layouts routed by `kind`, including cover, TOC, optional chapter opener, and back cover.
- `patterns/`: named document patterns and specimens. Put chart frames, visual blocks, design-system swatches, image grids, and other class-based content patterns here.
- `shell/`: exported reader controls around the document. Do not put document typography or component styling here.

Component-local stylesheets live alongside their TSX in `document/components/<Component>/style.css` (auto-loaded by the engine). Generated files in `public/openpress/` and `dist-react/` are output only.

Current typography uses the portable sans / mono stack from `tokens.css`.
Only add a font file to `theme/fonts/` when a token actually references that family.
