# Workbench Operation Manual

The open-press workbench is a local web app for reviewing the document, leaving comments, editing source inline, and managing project assets. It's bundled with every workspace created by `npm create @open-press`.

Start it inside your workspace:

```bash
npm run dev
```

Then open the local URL printed by Vite, usually `http://127.0.0.1:5173/workspace`.

## Layout

The workbench is a three-column shell:

- **Left panel** — document identity, bookmarks, current page indicator. Toggle via the `[` button in the toolbar.
- **Main stage** — the rendered document (single page or spread). Scroll vertically; arrow keys / Page Up / Page Down / Home / End paginate (text selection takes priority over pagination).
- **Right panel** — control panel with two stacked panels: **Pending comments** at the top, **Project entry** (media + components) below. Toggle via the `]` button.

Both panels default to closed; open them as needed. Below `1184px` width they become floating drawers with a backdrop instead of grid columns.

## Toolbar

Left to right:

| Control | Purpose |
| --- | --- |
| **PDF export** | Opens the most recent PDF locally (dev mode) or the deployed PDF (public). |
| **Page geometry** | Shows the configured page dimensions (e.g. A4 210×297mm). |
| **Page zoom** | Dropdown for fit-width / fit-page / fixed percentages (25%–200%) and one-page ↔ two-page spread. |
| **Search** (dev only) | Full-text search across registered MDX sources, jump to match. |
| **Inline edit status** (dev only) | Status pill that shows `編輯中` / `儲存中` / `已儲存` / `儲存失敗` while inline source editing is active. |
| **Inspector toggle** (dev only) | Turn on to leave comments on rendered blocks. |
| **Deploy** (dev only) | Open the deploy dialog (configure, dry-run, publish). |

## Comments (inspector flow)

1. Toggle **註解** in the toolbar.
2. Click a rendered block, or hover between blocks and click the insertion bar.
3. Choose an intent — Add, Edit, Remove — and type a comment in the inline composer. `Cmd/Ctrl + Enter` to submit.
4. Saved comments leave numbered markers on the rendered document. Click a marker to edit or remove its comment.
5. The right-side **Pending comments** panel lists every unresolved marker across the workspace; click an entry to jump to its block.
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

## Project entry (right panel)

- **Media** — every image referenced from `document/media/`. Click a thumbnail to preview the image full-size in a dialog. The preview is view-only — to insert / re-style media, leave a comment via the inspector or ask the agent directly.
- **Components** — registered React components used in the document. Click one to preview the rendered component HTML.

## Workbench shell extension

Embedders can add custom panels via the `extraControlPanels` prop on `HtmlWorkbench`:

```tsx
import { HtmlWorkbench, type WorkbenchPanel } from "@open-press/core/workbench";

const myPanels: WorkbenchPanel[] = [
  { id: "history", render: () => <HistoryPanel /> },
];

<HtmlWorkbench {...props} extraControlPanels={myPanels} />
```

Panels render after the built-in `pending-comments` and `project-entry` panels in supplied order.
