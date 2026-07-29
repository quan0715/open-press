# Workbench Operation Manual

The open-press workbench is a local web app for reviewing the document, leaving comments, editing source inline, and managing project assets. It's bundled with every workspace created by `npm create @open-press`.

Start it inside your workspace:

```bash
npm run dev
```

Then open the local URL printed by Vite, usually `http://127.0.0.1:5173/workspace`.

## Layout

The workbench uses a canvas-first two-column shell:

- **Left panel** — search, bookmarks or thumbnails, and the current page indicator. Document metadata lives in **Document Info** instead of being repeated here.
- **Main stage** — the rendered document. Scroll vertically; oversized zoom levels allow horizontal scrolling. Arrow keys / Page Up / Page Down / Home / End paginate (text selection takes priority over pagination).

Zoom stays in a floating control at the lower-right edge of the canvas. Optional extension panels open from **More → Extension tools** as an overlay drawer and never reserve canvas width.

Use the toolbar **Bookmarks** control to collapse or restore the left panel without hiding the rest of the workbench. The preference is saved across reloads; new narrow-screen sessions start with the panel collapsed.

On desktop, drag the left panel's right edge to resize it between 240px and 480px. Arrow keys adjust a focused resize handle, Shift + Arrow uses a larger step, and double-click restores the responsive default. The browser remembers one width for the whole Workspace. Compact screens keep that desktop value stored but use their responsive panel width.

## Workspace settings

Open **More → Workspace Settings**, or visit `/workspace/settings`, to configure the Workspace interface:

- **Mode** — System, Dark, or Light. System follows operating-system changes.
- **Accent** — Amber, Blue, Emerald, Violet, or Rose.

These preferences apply to OpenPress controls, selected states, and focus rings across the gallery and workbench. They never modify a Press theme, public reader, PDF, Word file, or slide output.

## Toolbar

The left navigation group is ordered **Home → Bookmarks → Press tabs**. A single-Press workspace omits Home and begins with Bookmarks.

The right action group keeps only frequent actions visible:

| Control | Purpose |
| --- | --- |
| **Comments** | Opens inspector/comment controls when available. |
| **Export** | Icon button that opens the export menu for PDF, Word DOCX with high-fidelity/editable options, or image outputs. Slide Presses also expose presentation mode here. In dev mode, local exports rebuild before opening. |
| **Page zoom** | Floating `−` / value / `+` control for fit-width, fit-page, presets, or a custom percentage. The setting is persisted independently for each Press. |
| **More** | Opens Workspace Settings plus applicable MDX source, Deployment, and extension-tool actions. |
| **Document Info** | Always the far-right action. Opens structure statistics, theme tokens, typography, and page geometry. |
| **Bookmarks** | Sits beside Home and collapses or restores the left navigation panel while keeping the toolbar and floating Zoom available. |

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

When at least one panel is supplied, **More** includes **Extension tools**. Panels render in supplied order inside a right-side overlay drawer; opening it does not resize the document canvas.
