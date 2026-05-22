# Workbench Operation Manual

The open-press workbench is a local web app for reviewing the document, leaving comments, and managing project assets. It's bundled with every workspace scaffolded by `npx @open-press/cli init`.

Start it inside your workspace:

```bash
npm run dev
```

Then open the local URL printed by Vite, usually `http://127.0.0.1:5173/?dev=1`.

The workbench has three views (switch via the left panel):

- **Document** — the reader-facing document.
- **Project** — media upload, component previews, visual specimens, project asset review.
- **Comments** — pending document comments that an agent can turn into edits.

Keep the right side focused on the rendered document; the left panel is operations.

## Comments

- In **Document** or **Project** view, turn on **註解** from the left panel.
- Click a rendered block, or hover between blocks and click the insertion bar, then choose an intent: Add, Edit, or Remove.
- Type a multi-line comment in the composer. Use `Cmd/Ctrl + Enter` to submit from the inline composer.
- Saved comments leave only a numbered marker on the document. Click the marker to edit or remove the comment.
- An AI agent (with the `openpress` skill loaded) reads the markers via `rg "@openpress-comment" document -n` and applies them as small source edits.

## Composer mentions

The comment composer supports lightweight command tokens:

- Type `@` to open project references. The first list shows available prefixes: `media`, `chapter`, `section`, and `component`.
- Choose a prefix to continue filtering, for example `@media/`, `@chapter/`, `@section/`, or `@component/`.
- Direct lookup also works, such as typing `@1.1` to find a section.
- Use `↑` / `↓` to move through suggestions.
- Press `Enter` or `Tab` to insert the selected suggestion.
- Press `Esc` to close the suggestion list.
- Type `/` to open available agent skills, such as `/rewrite-section` or `/redraw-figure`.

## Project assets

- Use **Project** view to upload images into `document/media/`.
- Click a media or component entry to preview it in a dialog.
- From the dialog, rename or delete an asset with confirmation. Rename updates file references; delete is blocked if the document still references that asset.
- Use the dialog comment composer to ask an agent to insert an asset into a specific `@chapter` or `@section`, or to adjust a component.
