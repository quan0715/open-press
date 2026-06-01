---
"@open-press/core": patch
---

Three improvements to large-document export:

- **Stop letting page overflow block PDF / image export.** `waitForPrintReady` used to declare ready only when every page fit perfectly, so a single overflowing row stalled the entire export until the deadline expired and the run reported a misleading "pagination timed out". Readiness is now driven by *layout stability* (page count and overflow signature stay unchanged for `OPENPRESS_PRINT_READY_STABLE_MS`, default 300 ms). Overflow no longer gates the export — it logs a single warning with the affected page numbers so authors can fix the source.
- Replace the hard 30s deadline with a progress-aware idle window + hard cap. `OPENPRESS_PRINT_READY_IDLE_MS` (default 30s) and `OPENPRESS_PRINT_READY_TIMEOUT_MS` (default 5 min) tune the no-progress / total-time guards; inspection ships the equivalent `OPENPRESS_INSPECTION_IDLE_MS` / `OPENPRESS_INSPECTION_TIMEOUT_MS`. Timeout errors now include the last observed page count and overflowing-page count, so genuine stalls are easy to tell apart from a slow-but-progressing render.
- `openpress image` accepts `--pages <selector>` to export a subset of pages: comma-separated singles, closed ranges (`3-7`), and open-ended ranges (`15-`, `-5`) are all supported. Filenames keep the original page index (e.g. `page-005.png`) so slices stay unambiguous.
