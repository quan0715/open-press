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

## Workbench Views

- **Document**: reader-facing document.
- **Design System**: visual rules and specimens.
- **Project**: source inventory, components, media, and status.

After source edits:

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
