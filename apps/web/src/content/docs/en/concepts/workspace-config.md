---
title: "Workspace config"
eyebrow: "Where settings live"
description: "Document metadata lives on <Press> props; operational settings live in package.json. Paths follow convention with sensible defaults."
---
props; operational settings live in package.json. Paths follow convention with sensible defaults."
>
  <div class="callout">
    <strong>Workspace contract.</strong> <code>&lt;Press&gt;</code> props own document metadata,
    <code>package.json</code> owns operational settings, and the engine owns path conventions.
    A workspace is discovered from <code>press/*/press.tsx</code>.
  </div>

  <h2>The three layers</h2>

  <PropsTable
    rows={[
      {
        name: "Document metadata",
        type: "<Press> props",
        description: "<code>title</code>, <code>page</code>, <code>sources</code>, <code>theme</code>, <code>componentsDir</code>, <code>mediaDir</code>, <code>slug</code>. Display copy beyond title (subtitle / organization / author) lives in your Cover JSX, not in Press props. See <a href=\"/docs/reference/components-press\">&lt;Press&gt;</a>.",
      },
      {
        name: "Operational",
        type: "package.json \"openpress\"",
        description: "Deploy adapter + adapter-specific config. The CLI reads this synchronously without running React, so it's the only place build-time settings can live.",
      },
      {
        name: "Paths",
        type: "Convention",
        description: 'Hardcoded engine defaults: <code>press/</code>, <code>press/*/press.tsx</code>, folder-local <code>components/</code>, <code>theme/</code>, <code>media/</code>, optional <code>press/shared/</code>, <code>public/openpress/</code>, and <code>dist-react/</code>. Add explicit roots with <code>&lt;Press componentsDir&gt;</code> and <code>&lt;Press mediaDir&gt;</code>.',
      },
    ]}
  />

  <h2>Document metadata — &lt;Press&gt; props</h2>

  <p>
    See the <a href="/docs/reference/components-press">&lt;Press&gt; page</a> for the full prop reference.
    A <code>press/&lt;slug&gt;/press.tsx</code> file default-exports one <code>&lt;Press&gt;</code>.
  </p>

  <PropsTable
    title="<Press> ownership"
    rows={[
      { name: "title", type: "<Press title>", description: "Required metadata used for reader labels, browser title, and export metadata." },
      { name: "slug", type: "<Press slug>", description: "Required URL and artifact segment. It must match the containing folder name." },
      { name: "page", type: "<Press page>", description: "One page geometry per Press. Mixed-size projects use multiple Press folders." },
      { name: "sources", type: "<Press sources>", description: "Array of source registrations, usually <code>mdxSource({ id, preset, root })</code>." },
      { name: "theme / componentsDir / mediaDir", type: "<Press> path props", description: "<code>componentsDir</code> and <code>mediaDir</code> may be a string or string array. Defaults include folder-local roots and <code>press/shared/</code>." },
      { name: "captionNumbering", type: "<Press captionNumbering>", description: "Optional figure/table numbering labels and separator." },
    ]}
  />

  <h2>Operational — package.json "openpress"</h2>

  <ApiEntry
    name='package.json "openpress"'
    kind="config"
    importFrom={`{
  "name": "my-paper",
  "openpress": {
    "deploy": { "adapter": "...", ... }
  }
}`}
    summary="Operational config that the CLI reads sync at startup — before any React render. Deploy adapter selection lives here because openpress:deploy must know the adapter before invoking it. Most users only need to fill in the deploy block once."
  >
    <PropsTable
      title="Top-level keys"
      rows={[
        { name: "deploy", type: "DeployConfig", description: "Deploy adapter config. Required when running <code>openpress:deploy</code>; optional otherwise (CI / local dev work without it)." },
      ]}
    />

    <h3>Deploy</h3>

    <p>
      Adapter-discriminated union. Each adapter has its own required keys layered on top of the
      shared keys below.
    </p>

    <PropsTable
      title="Shared keys"
      rows={[
        { name: "adapter", type: "string", required: true, description: 'Built-in: <code>"cloudflare-pages"</code>. Other hosts can consume the generated build output directly or register their own adapter keys.' },
        { name: "source", type: "string", default: '".deploy"', description: "Staging directory (relative to workspace root) where the deploy artifact is assembled before adapter hand-off." },
        { name: "requiresConfirmation", type: "boolean", default: "true", description: "Require <code>--confirm</code> on the command line. Disable only when the adapter has its own confirmation step." },
        { name: "commitDirty", type: "boolean", default: "false", description: "Allow deploying with uncommitted changes. Leave false in CI." },
      ]}
    />

    <h3>cloudflare-pages adapter</h3>

    <PropsTable
      rows={[
        { name: "projectName", type: "string", required: true, description: 'Cloudflare Pages project. Passed as <code>--project-name=</code> to wrangler.' },
      ]}
    />

    ### Example: Cloudflare Pages — full package.json

```json
{
  "name": "open-source-economics",
  "version": "0.1.0",
  "scripts": { "build": "open-press build", "dev": "open-press dev" },
  "openpress": {
    "deploy": {
      "adapter": "cloudflare-pages",
      "source": ".deploy",
      "projectName": "open-source-economics",
      "requiresConfirmation": true
    }
  }
}
```
  </ApiEntry>

  <h2>Paths — convention only</h2>

  <p>
    The engine hardcodes path conventions. There is intentionally no way to override these from a
    config file in v1.0 — the conventions are part of the product surface, not a tuning knob.
  </p>

  <PropsTable
    rows={[
      { name: "Content root", type: "press/", description: "Folder-convention projects use <code>press/*/press.tsx</code>." },
      { name: "Theme", type: "press/<slug>/theme/", description: 'Folder-local theme rules are loaded automatically. Use <code>press/shared/theme/</code> only for shared baseline rules.' },
      { name: "Components", type: "press/<slug>/components/", description: 'Defaults include folder-local and shared roots. Add more with <code>&lt;Press componentsDir="..."&gt;</code>.' },
      { name: "Media", type: "press/<slug>/media/", description: 'Defaults include folder-local and shared roots. Add more with <code>&lt;Press mediaDir="..."&gt;</code>.' },
      { name: "Build output (engine)", type: "public/openpress/", description: "Engine writes <code>document.json</code> and synced assets here. Not configurable." },
      { name: "Build output (Vite)", type: "dist-react/", description: "Production deploy bundle. Not configurable." },
      { name: "Deploy stage", type: ".deploy/", description: "Configurable via <code>package.json openpress.deploy.source</code>; default <code>.deploy/</code>." },
    ]}
  />
