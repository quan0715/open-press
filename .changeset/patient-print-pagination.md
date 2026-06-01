---
"@open-press/core": patch
---

Replace the hard 30s deadline in `waitForPrintReady` / `waitForInspectionReady` with a progress-aware timeout: each readiness poll now also reports `pageCount` and overflowing-page count, and the idle window only fires after no signature change for `OPENPRESS_PRINT_READY_IDLE_MS` (default 30s). A separate hard cap `OPENPRESS_PRINT_READY_TIMEOUT_MS` (default 5 minutes) prevents infinite hangs. Same knobs ship for inspection as `OPENPRESS_INSPECTION_IDLE_MS` / `OPENPRESS_INSPECTION_TIMEOUT_MS`. Timeout errors now include the last observed page count and overflowing-page count so users can tell whether pagination stalled or simply needed more time.
