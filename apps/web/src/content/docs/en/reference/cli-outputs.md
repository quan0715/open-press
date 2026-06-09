---
title: "Output targets"
eyebrow: "CLI · Tier 2"
description: "Produce a specific deliverable other than the standard HTML bundle: per-page PNG images, PDF, and deploy artifacts."
---
<p>
    Tier 2 commands wrap a heavier dependency (Chromium for PDF / image, an adapter SDK for deploy)
    around the same engine output. They're explicit commands rather than flags on <code>build</code>
    because each has its own runtime cost — running them implicitly inside <code>build</code> would
    surprise users who only want the HTML bundle.
  </p>

  <ApiEntry
    name="openpress:pdf"
    kind="command"
    importFrom="npm run openpress:pdf"
    summary="Generate a PDF locally via Chromium. Output filename comes from config.pdf.filename. Builds first if dist-react/ is missing or stale; pass --no-build to reuse the existing build."
  >
    <PropsTable
      title="Flags"
      rows={[
        { name: "--output", type: "string", description: "Override the output path. Defaults to <code>config.pdf.filename</code> next to the workspace root." },
        { name: "--no-build", type: "flag", description: "Reuse the existing <code>dist-react/</code> output instead of re-building. Useful when iterating on Chromium print CSS." },
        { name: "--host", type: "string", default: '"127.0.0.1"', description: "Static server host used while Chromium prints." },
        { name: "--port", type: "string", default: '"5185"', description: "Static server port." },
        { name: "--dry-run", type: "flag", description: "Print the command sequence without actually rendering or invoking Chromium." },
      ]}
    />

    ### Example: One-shot PDF

```bash
npm run openpress:pdf
# → ./<config.pdf.filename>.pdf
```
  </ApiEntry>

  <ApiEntry
    name="openpress:image"
    kind="command"
    importFrom="npm run openpress:image"
    summary="Generate one PNG per page via Chromium. Output defaults to dist-react/images/page-001.png, page-002.png, and so on. Builds first unless --no-build is passed."
  >
    <PropsTable
      title="Flags"
      rows={[
        { name: "--output", type: "string", description: "Override the output directory. Defaults to <code>dist-react/images</code>." },
        { name: "--no-build", type: "flag", description: "Reuse the existing <code>dist-react/</code> output instead of re-building." },
        { name: "--host", type: "string", default: '"127.0.0.1"', description: "Static server host used while Chromium captures pages." },
        { name: "--port", type: "string", default: '"5186"', description: "Static server port." },
        { name: "--dry-run", type: "flag", description: "Print the command sequence without rendering or invoking Chromium." },
      ]}
    />

    ### Example: Per-page PNGs

```bash
npm run openpress:image
# → dist-react/images/page-001.png
```
  </ApiEntry>

  <ApiEntry
    name="openpress:deploy"
    kind="command"
    importFrom="npm run openpress:deploy"
    summary="Run the configured deploy adapter. Builds the workspace, generates the PDF stage artifact alongside, writes deploy metadata to deploy.json, and hands off to the adapter. Always requires --confirm — there is no silent deploy."
  >
    <PropsTable
      title="Flags"
      rows={[
        {
          name: "--confirm",
          type: "flag",
          description:
            "Required for a real deploy. Skips the interactive prompt; CI should set this only after a separate gate (e.g. PR approval).",
        },
        { name: "--dry-run", type: "flag", description: "Run preflight only; print the command sequence (build → PDF → adapter); do not publish." },
      ]}
    />

    ### Example: Dry run from local

```bash
npm run openpress:deploy:dry-run
# → reports adapter, target, and what would change
```

    ### Example: Real deploy (CI)

```bash
npm run openpress:deploy -- --confirm
# → 1. build
# → 2. PDF into the deploy stage
# → 3. write deploy.json
# → 4. adapter publishes
```

    <p>
      The active adapter is selected by <code>package.json "openpress.deploy.adapter"</code>. Each
      adapter has its own required config — see <a href="/docs/concepts/workspace-config#operational-packagejson-openpress">Workspace config</a> for the full schema.
    </p>
  </ApiEntry>

  <h2>Adapters</h2>

  <ApiEntry
    name='"cloudflare-pages"'
    kind="config"
    importFrom={`// package.json
"openpress": {
  "deploy": { "adapter": "cloudflare-pages", "projectName": "...", "source": ".deploy" }
}`}
    summary="Calls npx wrangler pages deploy. Required: projectName. Optional: commitDirty. Wrangler must be authenticated on the deploying machine."
  />

  <p>
    Other hosts can consume the generated build output directly. OpenPress keeps deployment
    adapters explicit; if a host-specific adapter is not implemented, agents should report that
    boundary instead of inventing a hidden publish path.
  </p>
