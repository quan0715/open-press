---
"@open-press/core": patch
---

Two narrow-viewport / non-A4 export fixes.

- **Drawer panels no longer flicker closed when toggled below the breakpoint.** `usePanelState`'s resize listener was re-subscribed on every state change, so the moment a user opened a left/right drawer in a narrow viewport (e.g. a portrait PDF preview tab) the effect re-ran, called `handleResize` synchronously, saw "open + below breakpoint", and immediately closed the panel the user had just opened. The handler now reads the current state through a ref so the listener stays subscribed across toggles and only the actual resize event drives the auto-close behavior.
- **PDF / image export now sizes the headless viewport to the document's page geometry instead of pinning it to 1200×1698.** Slide presses (16:9, 1920×1080) and other non-A4 documents were being rendered at a viewport narrower than the page, so right-side content was clipped in the rendered DOM and shipped clipped to the PDF. After navigating to the print URL the engine now reads `--openpress-page-width` / `--openpress-page-height` (resolving any CSS unit through a hidden helper element), and calls `Emulation.setDeviceMetricsOverride` to widen the viewport before pagination kicks in. Existing A4 documents stay unchanged.
