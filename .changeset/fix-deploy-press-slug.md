---
"@open-press/core": patch
---

Fix multi-press deploy: the dev server's deploy endpoint now reads the `press` slug from the request body and passes `--press <slug>` to the CLI. Previously the slug was ignored, causing the PDF export step to load the gallery (0 pages observed) and time out instead of exporting the correct press.
