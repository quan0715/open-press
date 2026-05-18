# QDoc CSS Ownership

QDoc keeps two CSS ownership domains.

## Workspace Runtime CSS

Maintained source:

```text
src/styles/qdoc.css
src/styles/qdoc/*.css
```

This layer belongs to the React workspace and public reader shell. It may style navigation, side panels, loading states, public PDF actions, local deployment controls, responsive drawers, and print-route overrides used by the React app.

`src/styles/qdoc.css` is only an import hub. Keep it short and put rules in the scoped files:

- `app-shell.css`: global app shell, scrollbars, loading and action overlays
- `workbench.css`: local editor/workbench shell, navbar, stage, and page controls
- `workbench-panels.css`: local side panels, bookmarks, thumbnails, and asset indexes
- `media-workspace.css`: media asset workspace, upload dropzone, and staged AI edit controls
- `reader-runtime.css`: React reader page wrappers and HTML page route sizing
- `public-viewer.css`: deployed/public reader shell and drawer controls
- `responsive.css`: workspace and public reader breakpoints
- `print-route.css`: print-media overrides for `?print=1`

Do not put report typography or document theme decisions here unless they are required to make the React shell measure or print correctly.

## Document Output CSS

Maintained source:

```text
document/theme/tokens.css
document/theme/base/*.css
document/theme/shell/*.css
document/theme/patterns/*.css
document/components/*/style.css
```

Generated output:

```text
public/qdoc/report.css
public/qdoc/components.css
public/qdoc/tokens.css
```

`public/qdoc/report.css`, `public/qdoc/components.css`, and `public/qdoc/tokens.css` are generated or copied during `syncQdocPublicAssets`. They are not maintained source files.

`tokens.css` is variables only: color, typography, spacing, chart colors, and shared numeric tokens. Do not place selectors here.

`base` is global document behavior: A4 page contract, `.reader-page`, `.page-frame`, `.page-body`, `.page-footer`, cover/back-cover, TOC, heading rhythm, paragraphs, lists, figures, tables, captions, and print safeguards.

`shell` is the exported reader controls around the report output. It must not carry document typography or content component styling.

`components` contains named document component and specimen styles. Shared chart frame rules live in `_chart-frame.css`; a chart figure opts into the frame with `class="chart-frame ..."`, so adding a new chart component does not require editing the frame selector list. Design-system swatches, typography specimens, image grids, and other class-based Markdown/HTML patterns also belong here.

All inline visual blocks use `<qdoc-component name="<package>" />`. Each visual is a self-contained package in `document/components/<name>/` that holds data (`data.json`), CSS (`style.css`), optionally a renderer (`component.mjs`), and docs (`README.md`). `engine/component-renderer.mjs` reads `data.json`, then either runs the workspace `component.mjs` or — if the package has no `component.mjs` and `data.chartType` is a built-in (`bar` / `line` / `donut`) — delegates to `src/qdoc/chartRenderer.js`.

`writeComponentsCss` assembles `document/theme/patterns/*.css` and `document/components/*/style.css` into `public/qdoc/components.css`. The built-in chart renderer emits `class="chart-frame qdoc-chart qdoc-chart--<chartType> <name>"`, so per-variant CSS in `document/components/<name>/style.css` can target those class names.

## Change Rules

- Change workspace behavior in `src/styles/qdoc/*.css`.
- Change design variables in `document/theme/tokens.css`.
- Change global document defaults in `document/theme/base/*.css`.
- Change named Markdown/HTML visual patterns in `document/theme/patterns/*.css`.
- Change renderer-owned `<qdoc-component>` CSS in `document/components/*/style.css`.
- Change exported reader chrome only in `document/theme/shell/*.css`.
- Change page geometry only in `document/theme/base/page-contract.css` and verify PDF output.
- Do not hand-edit `public/qdoc/report.css`; rerun `npm run qdoc:render`.
- Do not reintroduce another print CSS copy for a server-rendered HTML string.
