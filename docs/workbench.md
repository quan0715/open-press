# Workbench Operation Manual

The open-press workbench is a local web app for reviewing the document, leaving comments, editing source inline, and managing project assets. It's bundled with every workspace created by `npm create @open-press`.

Start it inside your workspace:

```bash
npm run dev
```

Then open the local URL printed by Vite, usually `http://127.0.0.1:5173/workspace`.

## Layout

The workbench uses a canvas-first two-column shell:

- **Left panel** — document identity, search, bookmarks, thumbnails, and current page indicator.
- **Main stage** — the rendered document. Scroll vertically; oversized zoom levels allow horizontal scrolling. Arrow keys / Page Up / Page Down / Home / End paginate (text selection takes priority over pagination).

Zoom stays in a floating control at the lower-right edge of the canvas. Optional extension panels open from **Tools** as an overlay drawer and never reserve canvas width.

Use the toolbar **Bookmarks** control to collapse or restore the left panel without hiding the rest of the workbench. The preference is saved across reloads; new narrow-screen sessions start with the panel collapsed.

## Toolbar

Left to right:

| Control | Purpose |
| --- | --- |
| **Export** | Icon button that opens the export menu for PDF, Word DOCX with high-fidelity/editable options, or image outputs. Slide Presses also expose presentation mode here. In dev mode, local exports rebuild before opening. |
| **Page geometry** | Shows the configured page dimensions (e.g. A4 210×297mm). |
| **Page zoom** | Floating `−` / value / `+` control for fit-width, fit-page, presets, or a custom percentage. The setting is persisted independently for each Press. |
| **Search** (dev only) | Full-text search across registered MDX sources, jump to match. |
| **Inline edit status** (dev only) | Status pill that shows `編輯中` / `儲存中` / `已儲存` / `儲存失敗` while inline source editing is active. |
| **Inspector toggle** (dev only) | Turn on to leave comments on rendered blocks. |
| **Deploy** (dev only) | Open the deploy dialog (configure, dry-run, publish). |
| **More** | Opens low-frequency actions. **Document info** contains structure statistics, theme tokens, typography, and page geometry. |
| **Tools** (when provided) | Opens embedder-supplied extension panels in an overlay drawer. |
| **Bookmarks** | Collapses or restores the left navigation panel while keeping the toolbar and floating Zoom available. The setting persists across reloads. |

## Comments (inspector flow)

1. Toggle **註解** in the toolbar.
2. Click a rendered block, or hover between blocks and click the insertion bar.
3. Choose an intent — Add, Edit, Remove — and type a comment in the inline composer. `Cmd/Ctrl + Enter` to submit.
4. Saved comments leave numbered markers on the rendered document. Click a marker to edit or remove its comment.
5. The inspector menu lists every unresolved marker across the workspace; click an entry to jump to its block.
6. An AI agent (with the `openpress-apply-comments` skill loaded) reads markers, applies them as small source edits, and removes resolved markers.

Multiple comments on the same block stack — markers are numbered globally and the marker indicator shows the count for its block.

### Composer mentions

The comment composer supports lightweight tokens:

- `@` opens project references: `media`, `chapter`, `section`, `component`. Continue typing to filter (e.g. `@chapter/01`, `@1.1`).
- `↑` / `↓` navigates suggestions, `Enter` / `Tab` inserts, `Esc` closes.
- `/` opens agent skills (e.g. `/rewrite-section`, `/redraw-figure`, `/apply-comments`).

## Inline source editing (dev only)

Text blocks rendered from MDX become `contenteditable` in dev mode. Click into a block to edit, blur or `Cmd/Ctrl + Enter` to save. Saves go through `/__openpress/source-edit` and re-fetch the document so the workbench stays in sync.

For non-text blocks (figures, components, tables) the inspector exposes an "open source editor" surface that opens a dedicated `InlineSourceEditorLayer` panel for raw source edits.

Table cells are individually editable — the inspector marks each `<td>` as its own block, and the source-edit endpoint accepts a `cellIndex` so a single cell can be patched without rewriting the row.

## Workbench shell extension

Embedders can add custom panels via the `extraControlPanels` prop on `HtmlWorkbench`:

```tsx
import { HtmlWorkbench, type WorkbenchPanel } from "@open-press/core/workbench";

const myPanels: WorkbenchPanel[] = [
  { id: "history", render: () => <HistoryPanel /> },
];

<HtmlWorkbench {...props} extraControlPanels={myPanels} />
```

When at least one panel is supplied, the toolbar shows **Tools**. Panels render in supplied order inside a right-side overlay drawer; opening it does not resize the document canvas.
