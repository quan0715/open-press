---
title: "Lifecycle"
eyebrow: "CLI · Tier 1"
description: "The five standard commands every workspace uses — create / dev / build / preview / typecheck. Same shape as Vite or Astro, no openpress: prefix."
---
<p>
    Tier 1 covers the everyday workspace loop: create one, develop in it, ship it, verify it.
    Each command below has a matching <code>npm run</code> script in the scaffolded
    <code>package.json</code>, so this is the surface most authors and CI scripts use.
  </p>

  <ApiEntry
    name="create"
    kind="command"
    importFrom="npm create @open-press <target> -- --type slides [flags]"
    summary="Create a new OpenPress workspace at <target>. Writes package metadata, installs the framework skill bundle, runs npm install + git init by default, and creates a minimal folder-per-slide Press."
  >
    <PropsTable
      title="Positional + content flags"
      rows={[
        {
          name: "<target>",
          type: "string",
          required: true,
          description: "Target directory — created if missing. Must be empty (a lone <code>.git/</code>, <code>.gitignore</code>, <code>.gitkeep</code>, or <code>.DS_Store</code> is fine — common when scaffolding into a fresh repo).",
        },
        { name: "--type slides", type: "string", required: true, description: "Create a slides Press. Page-based scaffolding is deferred in this v1 create surface." },
        { name: "--title", type: "string", description: "Document title — written into <code>&lt;Press title&gt;</code> in <code>press/&lt;target&gt;/press.tsx</code>. Subtitle, organization, author, etc. are not CLI flags — render them directly in JSX." },
      ]}
    />

    <PropsTable
      title="Behavior flags"
      rows={[
        {
          name: "--no-install",
          type: "flag",
          description:
            "Skip the automatic <code>npm install</code>. Use when you're working offline, managing deps with pnpm/bun yourself, or scripting from a parent monorepo.",
        },
        {
          name: "--no-git",
          type: "flag",
          description:
            "Skip <code>git init</code> + the initial commit. Use when scaffolding inside an existing repo, or when your tooling manages git state separately.",
        },
      ]}
    />

    ### Example: Create with title

```bash
npm create @open-press my-deck -- \\
  --type slides \\
  --title "Transport models in dense networks"
```

    ### Example: Create into existing repo

```bash
# Inside an existing git repo, no auto-commit, manage deps yourself:
npm create @open-press ./docs -- \\
  --type slides \\
  --no-git \\
  --no-install
pnpm install
```

    ### Example: Add another slides Press

```bash
open-press create appendix --type slides --title "Appendix"
```

    ### Example: Resulting file tree

```text
my-deck/
  package.json
  .gitignore
  press/
    my-deck/
      press.tsx          # ordered index
      slides/
        intro/
          slide.tsx      # meta + default component
      themes/
        default.css
```

    <p>
      Domain-specific starters are not bundled in the CLI. Install a domain skill
      (<code>npx skills add &lt;owner/repo&gt;</code>) and ask the agent to populate
      <code>press/</code> from that skill's starter. See <a href="/docs/concepts/slides">Slides architecture</a>
      for the full <code>slide.tsx</code> and <code>SlideMeta</code> contract.
    </p>
  </ApiEntry>

  <ApiEntry
    name="dev"
    kind="command"
    importFrom="npm run dev"
    summary="Start the local workbench at http://127.0.0.1:5173. Hot-reloads CSS, theme tokens, and React UI chrome; MDX content edits refresh through the engine's source watcher."
  >
    ### Example: Start the workbench

```bash
npm run dev
# → workspace at http://127.0.0.1:5173/workspace
# → document preview at http://127.0.0.1:5173/<press-slug>/preview
```

    <p>
      The workbench uses path-based routes: <code>/workspace</code> for the project gallery and
      <code>/&lt;press-slug&gt;/preview</code> for a specific document preview with inspector,
      source-edit endpoint, and comment markers enabled.
    </p>
  </ApiEntry>

  <ApiEntry
    name="build"
    kind="command"
    importFrom="npm run build"
    summary="Produce the deploy-ready bundle in dist-react/. Chains source validation, MDX → React export, and Vite production build. If validation fails, the build aborts before Vite runs."
  >
    ### Example: Build for production

```bash
npm run build
# → dist-react/ ready to host
```

    <p>
      The intermediate engine steps (<code>export</code>, <code>validate</code>) exist for advanced
      callers but are not user-facing — they run automatically inside <code>build</code>. To validate
      without rendering, call <code>open-press validate .</code> directly; that's mostly a
      CI lint or agent preflight.
    </p>
  </ApiEntry>

  <ApiEntry
    name="preview"
    kind="command"
    importFrom="npm run preview"
    summary="Serve dist-react/ as a static site without workbench chrome. Use to verify the public reader matches expectations before deploy."
  >
    ### Example: Preview after build

```bash
npm run build
npm run preview
# → reader at http://127.0.0.1:4173 (no workbench)
```
  </ApiEntry>

  <ApiEntry
    name="typecheck"
    kind="command"
    importFrom="npm run typecheck"
    summary="Run TypeScript checks across the workspace tree. Literally tsc --noEmit -p tsconfig.json — catches type errors that the bundler doesn't surface (unused exports, prop mismatches, narrowed types broken by edits)."
  >
    <p>
      <strong>What it does NOT do:</strong> validate MDX content shape, resolve cross-section links,
      or check theme tokens — those belong to <a href="/docs/reference/cli-tools">Tier 3 tools</a>
      (<code>validate</code>, <code>inspect</code>). Typecheck is purely about TypeScript correctness.
    </p>
  </ApiEntry>
