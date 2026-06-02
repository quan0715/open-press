---
"@open-press/core": minor
---

The public reader (deployed-page) now renders through the same `<WorkbenchShell>` as the workbench, replacing the bespoke FAB + right-drawer layout. The public toolbar holds the PDF link, page-geometry label, and zoom / single-vs-spread controls; the left panel holds the document identity, chapter bookmarks, and current-page summary. The right panel is omitted in public mode (comments + project entry remain workbench-only) — `WorkbenchShell` gains a `withRightPanel` opt-out and a `publicViewer` marker prop so the outer `<main>` keeps its `data-openpress-public-viewer` attribute for CSS / integration targeting. Search is intentionally not wired here; the live `/__openpress/search` endpoint only exists in dev. A follow-up patch will add a build-time static index so search can ship to deployed pages.
