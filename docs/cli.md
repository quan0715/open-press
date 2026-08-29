# CLI Reference

open-press ships one public CLI with two jobs:

| CLI | Where you run it | What it does |
| --- | --- | --- |
| `@open-press/create` (`npm create @open-press`) | from any directory | Bootstraps a new workspace |
| `open-press create` | inside a workspace | Adds a new Press folder |
| `open-press <command>` / `npm run openpress:*` | inside a workspace | Day-to-day: dev / build / validate / pdf / word / deploy |

Most users invoke these through their AI agent. This page is the reference.

---

## 1. Prerequisites

OpenPress requires Node.js 20 or newer. Use Node.js 24 for framework development and Cloudflare Pages builds. Verify:

```bash
node -v
npm -v
npx -v
```

If any command is missing, install Node.js LTS from the [official download page](https://nodejs.org/en/download/), reopen the terminal, then retry.

---

## 2. Creating a new workspace

```bash
npm create @open-press <target> -- --type <pages|slides> [flags]
```

| Flag | Description |
| --- | --- |
| `<target>` | Positional. Target directory (created if missing). |
| `--title <s>` | Document title. |
| `--type pages` | Scaffold an A4 MDX document under `press/<target-name>/`. |
| `--type slides` | Scaffold a folder-convention slides Press under `press/<target-name>/`. |
| `--no-git` | Skip `git init` + initial commit. Use when scaffolding into an existing repo. |
| `--no-install` | Skip `npm install`. Use offline, or when managing deps with pnpm / bun yourself. |
| `--no-skills` | Skip agent skill installation. |
| `--help` | Print help. |

The target must be empty. A lone `.git/`, `.gitignore`, `.gitkeep`, or `.DS_Store` is fine.

Examples:

```bash
# Interactive AI flow (Claude Code / Codex / etc) — agent constructs the command.
npm create @open-press my-deck -- --type slides

# Create an A4 page document:
npm create @open-press my-report -- --type pages

# Fully specified (CI, scripts, agent-driven non-interactive):
npm create @open-press my-deck -- \
  --type slides \
  --title "Series A deck" \
  --no-git

# Add a second Press inside an existing workspace:
open-press create appendix --type slides --title "Appendix"

# Add a page Press inside an existing workspace:
open-press create report --type pages --title "Annual Report"
```

After creation the target directory contains an OpenPress workspace shell (`package.json`, `openpress/settings.json`, `press/`, theme/media directories, and gitignore). Runtime internals stay in `@open-press/core` under `node_modules`; creation does not copy `engine/`, `src/openpress/`, `index.html`, or `vite.config.ts` into your repo.

The creator installs required npm dependencies before attempting the optional agent skills. A stalled skills download is stopped after a short timeout and does not invalidate the workspace; rerun `npm run openpress:skills` later. OpenPress uses Playwright for layout measurement and falls back to an installed system Chrome when the matching Playwright Chromium download is unavailable.

The create package intentionally keeps both scaffolds minimal. A pages Press starts with one editable MDX chapter; use `openpress-create-pages` to shape its hierarchy, prose, components, and theme. A slides Press starts with one folder-based slide; use `openpress-create-slide` to extend the deck.

---

## 3. Workspace commands (inside a scaffolded directory)

> Full reference: <https://open-press.dev/docs/cli> — this file is a quick lookup.

Commands are organized in three tiers.

**Tier 1 — Lifecycle** (npm scripts, no `openpress:` prefix):

```bash
npm run dev          # start the local workbench (vite)
npm run build        # validate + render dist-react/
npm run preview      # preview a built workspace
npm run typecheck    # tsc --noEmit
```

**Tier 2 — Output targets** (npm scripts with `openpress:` prefix):

```bash
npm run openpress:image                # render one PNG per page
npm run openpress:pdf                  # render PDF
npm run openpress:word                 # render editable page Press DOCX
npm run openpress:deploy:dry-run       # show what `deploy` would do
npm run openpress:deploy -- --confirm  # publish after explicit confirmation
```

### Deploy one Press to its own site

Configure an explicit Cloudflare Pages target for each independently hosted
Press. `--press` never falls back to the workspace target: this prevents a
single-Press deploy from accidentally publishing every Press in the workspace.

```json
{
  "version": 1,
  "deploy": {
    "adapter": "cloudflare-pages",
    "source": ".deploy/workspace",
    "projectName": "workspace-pages",
    "presses": {
      "resume": {
        "source": ".deploy/resume",
        "projectName": "my-resume-pages"
      }
    }
  }
}
```

```bash
open-press deploy . --press resume --dry-run
open-press deploy . --press resume --confirm --no-pdf
```

The deploy stage includes only that Press's rendered document, workspace
manifest, search entries, and referenced media. The workspace target remains
available when no `--press` argument is supplied.

**Tier 3 — Tools** (for agents / debugging):

```bash
open-press --help
open-press validate .                     # source-level structural check
open-press export .                       # write public/openpress/<slug>/document.json + workspace.json
open-press pdf . --press report --pages 0,2 # PDF selected by zero-based page indexes
open-press word .                         # write editable dist-react/<pdf-name>.docx
open-press word . --visual                # write high-fidelity snapshot DOCX
open-press word . --visual --pages 1-3    # snapshot DOCX for selected pages
open-press inspect . --json               # post-render geometry + comment markers
open-press search . "keyword" --json
open-press replace . "old" "new" --json   # preview only
open-press replace . "old" "new" --apply  # writes changes
open-press doctor . --json                # workspace freshness vs npm latest
open-press upgrade . --dry-run
open-press skills update .                # refresh defaults + tracked skills
```

Use `openpress-plugins` for context-specific external-skill recommendations;
each adapter describes its separate install flow. Use `skills update` for
refreshing tracked OpenPress skills.

The `skills update` spelling is provided by the `@open-press/cli`
binary, which rewrites it to the core engine's `skills:sync`.
When calling the engine directly — `node node_modules/@open-press/core/engine/cli.mjs`,
or `node packages/core/engine/cli.mjs` inside the framework repo — use the colon
form; the engine has no `skills` command.

`pdf --pages` uses zero-based comma-separated indexes because the workbench sends rendered page indexes directly. `word --visual --pages` and `image --pages` use their existing 1-based page selector syntax.

When a workspace has multiple Presses, PDF and image export default to the first Press in `workspace.json`; pass `--press <slug>` when the output target must be explicit.

### Safety rules

- `replace` previews by default; writes only with `--apply`.
- `search` and `replace` default to document content (skip framework / generated).
- Generated paths (`public/openpress/`, `dist-react/`, `.deploy/`, `.openpress/`) are never hand-edited. The only exception is the temporary `.openpress/review/current.json` handoff owned by `openpress-collaborate`.
- Public deploys always go through `openpress-deploy` skill and require explicit user confirmation naming the target Cloudflare Pages project.

---

## 4. Workspace layout (after create)

```txt
<target>/
├── package.json                  # package manifest and scripts
├── openpress/
│   └── settings.json             # appearance, page, caption, PDF, and deploy settings
│
├── press/                        # ← your source tree
│   ├── <slug>/press.tsx           # folder-convention Press entry
│   ├── <slug>/chapters/           # MDX sections for pages Presses
│   ├── <slug>/components/         # per-Press wrapper components
│   ├── <slug>/ui/                 # slide reusable content primitives
│   ├── <slug>/layouts/            # slide-level layout components
│   ├── <slug>/theme/              # per-Press visual rules
│   ├── <slug>/media/              # per-Press images and assets
│   ├── shared/                    # optional only when multiple Press folders intentionally share source
│   ├── design.md                  # public design brief for agents
│
├── node_modules/@open-press/      # package-owned runtime after install
│
└── public/openpress/             # generated, gitignored
```

| Editable by you | Editable by agent | Hand-edit forbidden |
| --- | --- | --- |
| `press/`, `openpress/settings.json` | same as left + create source files / components + replace `.openpress/review/current.json` through `openpress-collaborate` | `node_modules/@open-press/`, `public/openpress/`, `dist-react/`, `.deploy/`, all other `.openpress/` |

---

## 5. Authoring surface

| Source | Use for |
| --- | --- |
| `press/*/press.tsx` | Default folder-convention Press entries |
| `<Press page>` | Per-Press page geometry. Use a generic preset such as `a4` or `slide-16-9`, or pass a custom fixed size `{ id, label, width, height }` object for project-specific formats such as social cards |
| `<Press sources>` | Registers MDX roots/files via `mdxSource()`; search/replace/validate use this registration |
| `<Press componentsDir>` / `<Press mediaDir>` | Optional path or path array for MDX components and media. Prefer explicit `./components` and `./media` in multi-Press workspaces |
| `<Frame frameKey role>` | One fixed-layout page/surface, including cover, TOC, section openers, content pages, and back cover |
| `<MdxArea chainId>` | Slot that receives measured MDX blocks from a registered source chain |
| `<PageBreak />` | Built-in MDX control component that starts the following content block on a new document page |
| `<Toc source="...">` / `<TocArea chainId>` | Manuscript helper that renders a TOC frame and consumes the generated `toc:<sourceId>` chain; core treats it like any other MDX area |
| `Sections page={Page}` | Manuscript helper that passes `frameKey`, `chainId`, `pageIndex`, `totalPages`, `sectionSlug`, `sectionTitle`, and section metadata into your content page template |
| Source files under `press/` | Prose, card text, slide text, or other content registered by the Press tree |
| `components/`, `theme/`, `media/` inside each Press folder | Artifact-owned source; default for new work |
| `press/shared/` | Optional exception used only when multiple Press folders intentionally share source |
| `design.md` inside the source tree | Public design brief — what the design system promises |

The reader runtime no longer paginates, rewrites headings/captions, or injects footers. Export writes final frame HTML into `public/openpress/<slug>/document.json` and registers each Press in `public/openpress/workspace.json`; `src/openpress/` only displays that output and handles workbench interactions. Page shell choices, including running headers, footers, and page number placement, are workspace component concerns.
