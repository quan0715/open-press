---
"@open-press/core": patch
---

Two improvements to large-document export:

- Replace the hard 30s deadline in `waitForPrintReady` / `waitForInspectionReady` with a progress-aware timeout: each readiness poll now reports `pageCount` and overflowing-page count, and the idle window only fires after no signature change for `OPENPRESS_PRINT_READY_IDLE_MS` (default 30s). A separate hard cap `OPENPRESS_PRINT_READY_TIMEOUT_MS` (default 5 minutes) prevents infinite hangs. Inspection ships the equivalent `OPENPRESS_INSPECTION_IDLE_MS` / `OPENPRESS_INSPECTION_TIMEOUT_MS` knobs. Timeout errors now include the last observed page count and overflowing-page count so users can tell whether pagination stalled or simply needed more time.
- `openpress image` now accepts `--pages <selector>` to export a subset of pages: comma-separated singles, closed ranges (`3-7`), and open-ended ranges (`15-`, `-5`) are all supported. Filenames keep the original page index (e.g. `page-005.png`) so output is unambiguous when paired with other slices.
