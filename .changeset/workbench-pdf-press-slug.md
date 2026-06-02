---
"@open-press/core": patch
---

Fix workbench PDF export in multi-Press workspaces. Clicking the PDF button while viewing a non-default Press (e.g. \`/slide/preview\`) used to POST to \`/__openpress/local-pdf-export\` without any slug, so the CLI defaulted to exporting the first Press by navigating to \`/?print=1\` — which renders the gallery, not a print document — and the readiness probe timed out at "observed 0 page(s), 0 overflowing". The workbench now threads the active Press slug from \`OpenPressApp\` → \`OpenPressRuntime\` → \`HtmlWorkbench\` → \`useDeploymentWorkbench\`, the local-pdf-export endpoint accepts a JSON body with a \`press\` field, passes it to the CLI as \`--press <slug>\`, and the file-serving endpoint accepts the slug as a query string so the slug-suffixed PDF (\`document-<slug>.pdf\`) is what gets streamed back to the workbench.
