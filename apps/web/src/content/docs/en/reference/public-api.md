---
title: "Public API"
eyebrow: "Contract"
description: "The exact module exports, config schema, CSS variable contract, comment marker format, and dev endpoints that are stable for 1.0. Everything outside this list is internal."
---
<h2>Stability promise</h2>

  <p>
    Once OpenPress 1.0 ships, the surfaces on this page are covered by semver: a breaking change to any
    listed export, config field, CSS variable, marker format, or dev endpoint requires a major version
    bump. Internal symbols and modules outside this list (anything reachable only via deep import) can
    change in any minor release without a CHANGELOG note about your downstream code breaking.
  </p>

  <p>
    If something you're depending on isn't in this document and you'd like it to be, open an issue. Most
    promotions to public API are cheap — we mainly want them named.
  </p>

  <h2><code>@open-press/core</code></h2>

  <p>Top-level barrel of the React runtime and the Press Tree primitives.</p>

  <table>
    <thead>
      <tr><th>Export</th><th>Kind</th><th>Purpose</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>Press</code></td>
        <td>component</td>
        <td>Document composition boundary. Export exactly one from each <code>press/&lt;slug&gt;/press.tsx</code>; put every page frame and document helper underneath it.</td>
      </tr>
      <tr>
        <td><code>PressContext</code></td>
        <td>React context</td>
        <td>Low-level context for custom helper components. Normal workspaces and agents should use <code>Press</code>, <code>Frame</code>, <code>MdxArea</code>, and manuscript helpers instead.</td>
      </tr>
      <tr>
        <td><code>PRESS_MARKER</code></td>
        <td>symbol</td>
        <td>Low-level identifier for wrapper tooling. Not needed when authoring documents.</td>
      </tr>
      <tr>
        <td><code>Frame</code></td>
        <td>component</td>
        <td>Fixed page surface or nested region boundary. Required props: <code>frameKey</code>. Optional: <code>role</code>, <code>chrome</code>, <code>className</code>. All other props pass through to the underlying <code>&lt;section&gt;</code>. Page size is configured at the document level with <code>&lt;Press page&gt;</code>.</td>
      </tr>
      <tr>
        <td><code>FRAME_MARKER</code></td>
        <td>symbol</td>
        <td>Identifier the renderer uses to detect <code>Frame</code> instances. Stable.</td>
      </tr>
      <tr>
        <td><code>FrameContext</code></td>
        <td>React context</td>
        <td>Exposes the active frame's <code>frameKey</code> and the <code>consumeArea(chainId)</code> hook that <code>MdxArea</code> calls. Public so custom frame helpers can build on it.</td>
      </tr>
      <tr>
        <td><code>MdxArea</code></td>
        <td>component</td>
        <td>A measurable content slot inside a frame. Required props: <code>chainId</code>. Optional: <code>overflow</code> (<code>"extend"</code> | <code>"truncate"</code>), <code>className</code>.</td>
      </tr>
      <tr>
        <td><code>Text</code></td>
        <td>component</td>
        <td>Styleless editable text object. Required props: <code>objectId</code>, <code>label</code>. Literal children are auto-mapped to TSX source ranges during React SSR export; expression children need an explicit <code>source</code> if they should be inline-editable.</td>
      </tr>
      <tr>
        <td><code>ObjectEntity</code></td>
        <td>component</td>
        <td>Low-level rendered object boundary for comment / edit / inspector metadata. Most authors should use <code>Text</code>, <code>Frame</code>, <code>MdxArea</code>, media helpers, or custom components that wrap this intentionally.</td>
      </tr>
      <tr>
        <td><code>useSource</code></td>
        <td>hook</td>
        <td>Returns the resolved source registration for a given <code>sourceId</code>. Used by manuscript helpers and custom frame components.</td>
      </tr>
      <tr>
        <td><code>BaseFigure</code>, <code>BaseCallout</code></td>
        <td>component</td>
        <td>Minimal figure / callout primitives. Workspace themes and starter skills build branded variants on top of these.</td>
      </tr>
      <tr>
        <td><code>MediaFigure</code>, <code>ImageFigure</code></td>
        <td>component</td>
        <td>Figure that accepts <code>src</code> / <code>alt</code> / <code>caption</code>. Resolves <code>media/...</code> relative paths to <code>/openpress/media/...</code> automatically. <code>ImageFigure</code> is an alias of <code>MediaFigure</code>.</td>
      </tr>
    </tbody>
  </table>

  <h3>Types</h3>

  <p>
    Re-exported from the same barrel. Types are part of the public contract — if a field name changes, it's
    a breaking change.
  </p>

  <ul>
    <li><code>FrameProps</code>, <code>MdxAreaProps</code>, <code>MdxAreaOverflow</code></li>
    <li><code>PressProps</code>, <code>WorkspaceProps</code>, <code>PageGeometry</code>, <code>PressSource</code></li>
    <li><code>ObjectEntityProps</code>, <code>ObjectEntityElement</code>, <code>TextProps</code></li>
    <li><code>BaseFigureProps</code>, <code>BaseCalloutProps</code>, <code>BaseCalloutKind</code></li>
    <li><code>MediaFigureProps</code></li>
  </ul>

  <h2><code>@open-press/core/mdx</code></h2>

  <table>
    <thead>
      <tr><th>Export</th><th>Kind</th><th>Purpose</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>mdxSource(options)</code></td>
        <td>function</td>
        <td>Registers an MDX source tree. <code>options.preset</code> selects a discovery preset (<code>"section-folders"</code> for the standard chapters layout). <code>options.root</code> is the folder relative to <code>press/</code>.</td>
      </tr>
    </tbody>
  </table>

  <h2><code>@open-press/core/manuscript</code></h2>

  <p>Helpers for long-form, section-flow documents. Optional — skipping this module is fine for slide / social starters.</p>

  <table>
    <thead>
      <tr><th>Export</th><th>Kind</th><th>Purpose</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>Sections</code></td>
        <td>component</td>
        <td>Iterates a registered source, emits one or more frames per section. Required: <code>source</code>. Optional: <code>page</code> (custom per-page component) — defaults to <code>DefaultSectionPage</code>. Optional: <code>opener</code>.</td>
      </tr>
      <tr>
        <td><code>Chapters</code></td>
        <td>alias</td>
        <td>Identical to <code>Sections</code>. Provided for readability when source vocabulary uses "chapter".</td>
      </tr>
      <tr>
        <td><code>DefaultSectionPage</code></td>
        <td>component</td>
        <td>The default page component <code>Sections</code> uses when no <code>page</code> prop is supplied.</td>
      </tr>
      <tr>
        <td><code>Toc</code>, <code>TocArea</code></td>
        <td>component</td>
        <td>TOC frame + TOC content slot. <code>TocArea</code> measures and paginates the generated <code>toc:&lt;sourceId&gt;</code> chain.</td>
      </tr>
    </tbody>
  </table>

  <h3>Types</h3>

  <ul>
    <li><code>SectionsProps</code>, <code>SectionsPageProps</code>, <code>SectionsOpenerProps</code></li>
    <li><code>ChaptersProps</code></li>
    <li><code>TocProps</code>, <code>TocAreaProps</code>, <code>TocPageProps</code></li>
  </ul>

  <h2><code>@open-press/core/numbering</code></h2>

  <p>Caption / figure / table numbering formatters. Build-time helpers used by the renderer; public so custom theming can format labels consistently.</p>

  <ul>
    <li><code>formatCaptionLabel(kind, index, options?)</code> — produces the localized label string (<code>Figure 1</code> / <code>圖 1</code> / etc.).</li>
    <li><code>defaultCaptionLocale</code> — the default locale config; reference value for <code>&lt;Press captionNumbering&gt;</code>.</li>
  </ul>

  <h2><code>@open-press/create</code> and <code>@open-press/cli</code></h2>

  <p>
    <code>@open-press/create</code> bootstraps a new folder-convention workspace. In this v1
    create surface, <code>--type slides</code> is supported and page-based scaffolding is deferred.
    <code>@open-press/cli</code> provides <code>open-press create</code> for adding another slides
    Press inside an existing workspace.
  </p>

  <pre><code>npm create @open-press &lt;target&gt; -- --type slides --title "…"
open-press create appendix --type slides</code></pre>

  <p>
    Opinionated starters live in skills. Install a skill with
    <code>npx skills add &lt;owner/repo&gt;</code>, then let the agent read that skill and copy or
    adapt its starter/example files into <code>press/</code>.
  </p>

  <p>
    Once inside the scaffolded workspace, the engine binary takes over via npm scripts
    (<code>dev</code> / <code>build</code> / <code>preview</code> / <code>typecheck</code>) and the
    <code>openpress:</code>-prefixed targets (<code>pdf</code>, <code>image</code>, <code>deploy</code>). See
    <a href="/docs/cli">CLI overview</a>.
  </p>

  <h2>Workspace config (<code>package.json "openpress"</code>)</h2>

  <p>
    Operational settings live in the workspace's <code>package.json</code> under the
    <code>"openpress"</code> field — the only place the engine reads sync, before any React
    render. Everything else (title / page / sources / theme) lives on
    <code>&lt;Press&gt;</code> props in <code>press/*/press.tsx</code>. Full schema at
    <a href="/docs/concepts/workspace-config">Workspace config</a>.
  </p>

  <pre><code>{`{
  "openpress": {
    "pdf":    { "filename": "..." },
    "deploy": { "adapter": "cloudflare-pages", "projectName": "...", "source": ".deploy" }
  }
}`}</code></pre>

  <h2>Press Tree entries (<code>press/*/press.tsx</code>)</h2>

  <p>
    Default-export a function component returning one <code>&lt;Press&gt;</code>. The engine
    discovers every folder entry and builds the internal Workspace. It reads metadata
    (title, page, sources, slug, captionNumbering, theme, componentsDir, mediaDir) from
    <code>&lt;Press&gt;</code> props on the JSX tree at export time. There are no named exports —
    the entry is the JSX, period. Full schema at <a href="/docs/reference/components-press">Press</a>.
  </p>

  <h2>CSS variables</h2>

  <p>
    Workspace themes and starter skills read and override these. Renames are breaking.
  </p>

  <table>
    <thead>
      <tr><th>Variable</th><th>Source</th><th>Notes</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><code>--openpress-page-width</code> / <code>--openpress-page-height</code></td>
        <td>Engine (from <code>&lt;Press page&gt;</code>)</td>
        <td>CSS length. Page geometry pushed into measurement + runtime.</td>
      </tr>
      <tr>
        <td><code>--openpress-page-aspect-ratio</code> / <code>--openpress-page-height-ratio</code></td>
        <td>Engine</td>
        <td>Derived ratios for fluid scaling (zoom control, fit-page mode).</td>
      </tr>
      <tr>
        <td><code>--openpress-page-viewport-scale</code></td>
        <td>Runtime (workbench)</td>
        <td>Current page-zoom multiplier. Set by the page-zoom control.</td>
      </tr>
      <tr>
        <td><code>--openpress-page-padding-top</code> / <code>-x</code> / <code>-bottom</code></td>
        <td>Workspace theme <code>tokens.css</code></td>
        <td>Per-workspace page padding. Consumed by <code>theme/base/page-contract.css</code>.</td>
      </tr>
      <tr>
        <td><code>--openpress-page-body-gap</code></td>
        <td>Workspace theme <code>tokens.css</code></td>
        <td>Vertical gap between blocks inside <code>MdxArea</code>.</td>
      </tr>
    </tbody>
  </table>

  <p>
    A workspace theme or starter skill may define additional color / typography tokens in its own
    <code>tokens.css</code>. Those names are local conventions, not framework contract — the framework only cares about the
    page-geometry / page-padding / page-body-gap names above.
  </p>

  <h2>Comment markers (<code>@openpress-comment</code>)</h2>

  <p>
    The inspector writes inline comments into source MDX/TSX files as a stable, parseable marker. Format:
  </p>

  <pre><code>&#123;/* @openpress-comment id=&lt;short-id&gt; ts=&lt;iso-timestamp&gt; hint=&lt;url-encoded&gt; note=&lt;url-encoded&gt; */&#125;</code></pre>

  <p>Field semantics:</p>

  <ul>
    <li><code>id</code> — short hex id for cross-referencing. Required.</li>
    <li><code>ts</code> — ISO 8601 timestamp of when the marker was inserted. Required.</li>
    <li><code>hint</code> — URL-encoded inspector metadata (placement, target object id). Optional.</li>
    <li><code>note</code> — URL-encoded note text. Required.</li>
  </ul>

  <p>
    Discovery via <code>rg "@openpress-comment" press -n</code>. The
    <code>openpress-apply-comments</code> skill is the canonical owner of the apply / clear / verify flow.
  </p>

  <h2>Dev endpoints</h2>

  <p>
    Available only in dev mode (<code>npm run dev</code>). Wired into the package-owned Vite middleware.
    Path prefix: <code>/__openpress</code>.
  </p>

  <table>
    <thead>
      <tr><th>Path</th><th>Method</th><th>Purpose</th></tr>
    </thead>
    <tbody>
      <tr><td><code>/openpress/workspace.json</code></td><td>GET</td><td>Workspace manifest listing every discovered Press.</td></tr>
      <tr><td><code>/openpress/&lt;slug&gt;/document.json</code></td><td>GET</td><td>The full rendered document for a Press — fetched by <code>OpenPressApp</code> on mount and after inline edits.</td></tr>
      <tr><td><code>/__openpress/status</code></td><td>GET</td><td>Deployment status snapshot.</td></tr>
      <tr><td><code>/__openpress/comment</code></td><td>POST / GET / PATCH / DELETE</td><td>Submit, list, update, or clear comment markers. Used by the inspector.</td></tr>
      <tr><td><code>/__openpress/search</code></td><td>GET</td><td>Full-text search across registered MDX sources.</td></tr>
      <tr><td><code>/__openpress/source-edit</code></td><td>GET / POST</td><td>Read raw source text or apply an inline source edit (text block, table cell, caption).</td></tr>
      <tr><td><code>/__openpress/project-asset</code></td><td>POST</td><td>Project preview actions.</td></tr>
      <tr><td><code>/__openpress/deploy</code></td><td>POST</td><td>Run the configured deploy adapter. Requires confirmation.</td></tr>
      <tr><td><code>/__openpress/local-pdf-export</code></td><td>POST</td><td>Generate a local PDF.</td></tr>
      <tr><td><code>/__openpress/local-pdf-file</code></td><td>GET</td><td>Serve the most recent local PDF.</td></tr>
    </tbody>
  </table>

  <h2>Internal — do not depend on</h2>

  <p>The following are reachable but explicitly <strong>not</strong> stable for 1.0:</p>

  <ul>
    <li>
      Deep imports under <code>@open-press/core/openpress/*</code> or any path not listed in the package
      <code>exports</code> map. Use the barrels (<code>/app</code>, <code>/document-model</code>,
      <code>/reader</code>, <code>/shared</code>, <code>/workbench</code>) or the top-level entry.
    </li>
    <li>
      <code>engine/react/pagination.mjs</code> exports pagination helpers around the region allocator.
      The region allocator
      (<code>allocateBlocksToRegions</code>, <code>pagesFromRegions</code>) is the long-term API.
    </li>
    <li>
      <code>document-model/objectEntityModel</code> — id encoding (<code>mdx-block:...</code>,
      <code>mdx-area:...</code>, <code>page:...</code>) is observable in HTML but the exact format may be
      refined for cell / nested entities.
    </li>
    <li>
      Workbench internals (<code>HtmlWorkbench</code> internal hooks, <code>InlineInspectorLayer</code>
      props, panel registry shape). The shell composes these but they aren't intended for external
      consumption.
    </li>
    <li>
      Engine CLI internals — use the <code>npm run openpress:*</code> scripts rather than reaching into
      <code>engine/commands/*</code>.
    </li>
  </ul>

  <div class="callout">
    <strong>Promoting an internal to public.</strong> If you've shipped against an internal symbol and want
    it covered by semver, the path is short: open an issue with the use case, we audit the surface, and
    it lands in this page in the next release.
  </div>
