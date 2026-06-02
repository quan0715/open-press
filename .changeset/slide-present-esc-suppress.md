---
"@open-press/core": patch
---

Two fixes for the slide presenter Esc / fullscreen flow.

- **Esc no longer navigates out of the slide presenter.** Pressing Esc in fullscreen previously called the browser's fullscreen-exit (correct) *and* delivered the same keystroke to our keydown handler, which fell through to `onExitPresentation` and dropped the user out of the presenter entirely. The chrome HUD already exposes an explicit close button, so Esc is now reserved purely for exiting fullscreen — the windowed presenter stays mounted with its re-enter-fullscreen and close buttons visible.
- **`OpenPressRuntime` re-evaluates location-derived modes on client-side navigation.** `workspaceMode`, `printMode`, and `activeRuntimeMode` were memoized with `[]` deps, so a SPA navigation from `/<slug>/present` to `/<slug>/preview` (the exit-presentation flow) kept the stale `workspaceMode=false` from mount and rendered the legacy `PublicViewer` (with its leftover floating bookmark button) instead of the workbench. A new route-version hook patches `history.pushState` / `replaceState` and listens for `popstate` / `hashchange` to bump a counter the memos depend on.
