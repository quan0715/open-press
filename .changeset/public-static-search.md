---
"@open-press/core": minor
---

The public reader's toolbar now ships a search button that works on deployed (static) pages, not just dev. The React render pipeline emits a workspace-wide `<outputDir>/openpress/search-corpus.json` containing every content source file's raw text; the public viewer lazy-loads it on first query and runs the same literal-match logic the dev `/__openpress/search` endpoint uses, all in the browser. `SearchControl` becomes pluggable via a new `searcher` prop — the workbench keeps the live HTTP searcher (unchanged), the public viewer passes a static-corpus searcher. The corpus is small (raw MDX text only, no AST), shipped uncompressed for cache-friendliness, and cached for the lifetime of the page after the first search.
