---
"@open-press/core": patch
---

`openpress pdf` and `openpress image` now accept `--press <slug>` to target a specific Press in a multi-Press workspace. The slug is validated against the workspace manifest (`<outputDir>/openpress/workspace.json`) before launching Chrome — unknown slugs print the list of known slugs and exit instead of timing out on a blank document. Output is automatically suffixed with the slug (`document-slide.pdf`, `images-slide/page-001.png`) so multiple Presses can be exported side-by-side without overwriting each other. The previous default behavior (no `--press`) is unchanged: exports the first Press declared in `<Workspace>`. Also fixes a stray `[object Object]` page count in the success log left over from the readiness-result shape change in 1.1.5.
