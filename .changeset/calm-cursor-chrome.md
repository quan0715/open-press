---
"@open-press/core": patch
---

Drop the inspector / inline-edit outline chrome in the reader runtime so hovering and selecting blocks no longer paints outlines or runs transitions; the cursor (`crosshair` / `text` / `pointer`) is now the sole mode indicator, keeping the rendered page visually stable while tools are open.
