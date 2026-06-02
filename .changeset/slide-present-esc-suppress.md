---
"@open-press/core": patch
---

Pressing Esc while a slide presentation was in browser-fullscreen used to do two things at once: the browser exited fullscreen (correct), and the same Esc keystroke then reached our keydown handler with `document.fullscreenElement` already `null`, so the handler fell through to `onExitPresentation` and yanked the user out of the slide presenter back to the workspace — leaving a stale "legacy directory" view that only a page reload could resolve. `SlidePresentationPage` now records a timestamp whenever `fullscreenchange` reports an exit and ignores Esc keystrokes that arrive within 500ms of that exit. The first Esc just brings the presenter back into windowed (chrome) mode; a subsequent Esc still exits the presenter as before.
