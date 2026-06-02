---
"@open-press/core": patch
---

Internal cleanup of legacy `devMode` naming left over from the removed `?dev=1` URL toggle. The workbench internals now consistently use `workspaceMode` (the path-based detector in `runtimeMode.ts`) for the prop name across `HtmlWorkbench`, `WorkbenchShell`, and `useInspectorComments`. The dead `data-dev-mode` DOM attribute (set on `<main class="openpress-workbench">` but never queried by CSS or any selector) and the unused `devMode` prop on `<PublicPage>` are removed. No public API change — `HtmlWorkbench` and friends are documented as workbench internals — and the `openpress-dev-*` legacy CSS class names are retained because they remain load-bearing in `public-viewer.css` / `responsive.css`.
