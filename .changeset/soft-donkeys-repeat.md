---
"@open-press/create": patch
"@open-press/cli": patch
"@open-press/core": patch
---

Serve the local `status` and `deploy` endpoints from one shared factory instead of a private copy per host. The Vite dev middleware and the static preview server had drifted: editing `openpress/settings.json` marked the deployment dirty in `dev` but not in `preview`. Both now report the same state.
