# Local Review

open-press local review is the human feedback loop before PDF or public deploy.

## Workflow

```bash
npm run openpress:export
npm run dev
```

Use the URL printed by Vite. It is usually:

```txt
http://127.0.0.1:5173/?dev=1
```

If `5173` is occupied, use the fallback port reported by the dev server.

## Workbench Layout

The workbench is a three-column shell — left navigation, center rendered document, right control panel. Both side panels default to closed and toggle from the toolbar.

- **Left panel** — document identity, bookmarks (chapter outline), current page indicator.
- **Center stage** — the rendered document. Use the toolbar zoom control for fit-width / fit-page / fixed % / one-page ↔ two-page spread.
- **Right panel** — control panel with two stacked sections:
  - **Pending comments** — every unresolved `@openpress-comment` marker. Click an entry to jump to its block.
  - **Project entry** — referenced media (click to preview) and registered components (click to preview rendered HTML). Project preview dialogs are view-only — comment via the inspector toggle.

Below 1184px width the panels become floating drawers; above that they sit in grid columns.

## Toolbar

- **PDF export** — opens the most recent PDF (local dev or deployed).
- **Page geometry** — current page dimensions.
- **Page zoom** — fit-width / fit-page / 25–200% / single ↔ spread.
- **Search** (dev) — full-text across registered MDX sources.
- **Inline edit status** (dev) — pill that shows `編輯中` / `儲存中` / `已儲存` / `儲存失敗`.
- **Inspector toggle** (dev) — turn on to leave comments on rendered blocks.
- **Deploy** (dev) — open the deploy dialog.

## Comments

- Toggle the inspector, click a block (or the insertion bar between blocks), pick Add / Edit / Remove, type in the inline composer, submit with `Cmd/Ctrl + Enter`.
- Saved comments leave numbered markers; click a marker to edit or delete its comment.
- Use the right-panel **Pending comments** list for cross-page navigation.
- Route resolution work to `openpress-apply-comments`.

## Inline Source Editing (dev)

Text blocks rendered from MDX are `contenteditable` in dev mode. Click into one to edit, blur or `Cmd/Ctrl + Enter` to save. The save endpoint refreshes the document so derived indexes (`blockMap`, `anchorPageMap`) stay in sync. Table cells edit independently — each `<td>` is its own block with a `cellIndex` round-trip.

## After Source Edits

```bash
npm run openpress:export
npm run openpress:validate
```

For renderer-sensitive visual, bookmark, or layout changes, also run:

```bash
npm run openpress:render
```

## Safety Rules

- A local preview is not deploy approval.
- Do not hand-edit generated output to fix preview issues.
- If preview is blank or stale, inspect export status, dev server output, and browser console before changing source content.
