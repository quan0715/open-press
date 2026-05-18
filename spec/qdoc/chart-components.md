# QDoc Chart Components

Charts are a specific shape of QDoc component: a self-contained package under `document/components/<name>/` whose `data.json` declares one of the engine's built-in `chartType` values (`bar`, `line`, `donut`). They use the same `<qdoc-component>` tag and the same resolution rules as any other component.

## Authoring

Markdown content uses one tag for every component, including built-in chart types:

```html
<qdoc-component name="exam-feedback" />
<qdoc-component name="cost-donut" />
<qdoc-component name="revenue-line-chart" />
```

Engine resolution (`engine/component-renderer.mjs`):

1. Read `document/components/<name>/data.json` (or `data.<data-variant>.json` if `data="<variant>"` is passed).
2. If `document/components/<name>/component.mjs` exists, call its `render({ attrs, data, helpers })`.
3. Else if `data.chartType` is a built-in (`bar` / `line` / `donut`), delegate to `src/qdoc/chartRenderer.js` `renderChartFigure`, using the component name as the CSS class hook (or `variant=` attribute if passed).
4. Else error.

The React workbench Data Library uses the same shared renderer for previews — no separate React-only chart code path.

## Package layout

A built-in chart variant is a directory with two required files:

```
document/components/cost-donut/
  data.json     # required; must include "chartType": "donut"
  style.css     # variant CSS hooks (class="chart-frame qdoc-chart qdoc-chart--donut cost-donut")
  README.md     # purpose, markdown usage, data field reference
```

If the same data shape is reused at multiple places with different content, add `data.<variant>.json` files in the same directory and reference them via `data=`:

```
document/components/cost-donut/
  data.json
  data.alt-period.json
  style.css
  README.md
```

```html
<qdoc-component name="cost-donut" />                       <!-- uses data.json -->
<qdoc-component name="cost-donut" data="alt-period" />     <!-- uses data.alt-period.json -->
```

## Data

`data.json` is a plain JSON file. For built-in charts it must include `chartType`, plus optionally `title`, `caption`, `variant`, `items`, baseline labels, and accessibility labels. It must not contain colors, fonts, spacing, SVG coordinates, or CSS class names beyond the renderer `variant` metadata.

## Style

Two layers:

- **Generic chart frame** (shared by every chart) lives in `document/theme/patterns/_chart-frame.css`.
- **Per-variant style** lives in `document/components/<name>/style.css`. The class hook in HTML is `qdoc-chart--<chartType>` combined with the component name (or explicit `variant=` if passed). Example: `document/components/exam-feedback/style.css` styles `qdoc-chart--bar.exam-feedback`.

The engine emits the underlying HTML with `class="chart-frame qdoc-chart qdoc-chart--<chartType> <name-or-variant>"`. The class names are an implementation detail of the built-in chart renderer; CSS selectors continue to target them.

## PDF And RWD Contract

Charts render to deterministic HTML/SVG, not canvas or animated runtime chart libraries. The output must fit the existing `.chart-frame` contract:

- fixed SVG `viewBox` for vector charts
- `width: 100%` and `height: auto`
- colors and typography through CSS variables or component CSS
- no async layout work after pagination
- no data-driven inline colors
