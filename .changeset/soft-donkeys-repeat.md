---
"@open-press/create": patch
"@open-press/cli": patch
"@open-press/core": patch
---

Consolidate local serving on Vite for both development and preview. Export, inspection, deployment status, and built-site preview now share the same endpoint implementation with HTTP-based startup readiness, while document export runs in an isolated process so long-running development sessions remain stable.
