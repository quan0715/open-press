# CLI Reference

open-press ships one public CLI with two jobs:

| CLI | Where you run it | What it does |
| --- | --- | --- |
| `@open-press/cli` (`open-press init`) | from any directory via `npx` | Scaffolds a new workspace |
| `open-press <command>` / `npm run openpress:*` | inside a workspace | Day-to-day: dev / build / validate / pdf / deploy |

Most users invoke these through their AI agent. This page is the reference.

---

## 1. Prerequisites

OpenPress requires Node.js 20 or newer. Verify:

```bash
node -v
npm -v
npx -v
```

If any command is missing, install Node.js LTS from the [official download page](https://nodejs.org/en/download/), reopen the terminal, then retry.

---

## 2. Scaffolding a new workspace

```bash
npx @open-press/cli init <target> [flags]
```

| Flag | Description |
| --- | --- |
| `<target>` | Positional. Target directory (created if missing). |
| `--title <s>` | Document title (written into `press/index.tsx`). |
| `--no-git` | Skip `git init` + initial commit. Use when scaffolding into an existing repo. |
| `--no-install` | Skip `npm install`. Use offline, or when managing deps with pnpm / bun yourself. |
| `--skills` | Install OpenPress agent skills after scaffolding. |
| `--no-skills` | Skip agent skill installation. |
| `--help` | Print help. |

The target must be empty. A lone `.git/`, `.gitignore`, `.gitkeep`, or `.DS_Store` is fine — they're ignored, so init into a fresh repo Just Works.

Examples:

```bash
# Interactive AI flow (Claude Code / Codex / etc) — agent constructs the command.
npx @open-press/cli init my-doc

# Fully specified (CI, scripts, agent-driven non-interactive):
npx @open-press/cli init my-doc \
  --title "Series A 提案書" \
  --no-git
```

After init the target directory contains an OpenPress workspace shell (`package.json`, `press/`, theme/media/component directories, and gitignore). Runtime internals stay in `@open-press/core` under `node_modules`; init does not copy `engine/`, `src/openpress/`, `index.html`, or `vite.config.ts` into your repo.

Starters are distributed through skills, not through CLI flags. Install a skill with `npx skills add <owner/repo>`, then let the agent copy or adapt that skill's starter/example files into the `press/` source tree.

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
npm run openpress:deploy:dry-run       # show what `deploy` would do
npm run openpress:deploy -- --confirm  # publish after explicit confirmation
```

**Tier 3 — Tools** (for agents / debugging):

```bash
open-press --help
open-press validate .                     # source-level structural check
open-press export .                       # write public/openpress/document.json only
open-press inspect . --json               # post-render geometry + comment markers
open-press search . "keyword" --json
open-press replace . "old" "new" --json   # preview only
open-press replace . "old" "new" --apply  # writes changes
open-press doctor . --json                # workspace freshness vs npm latest
open-press upgrade . --dry-run            # alias: migrate
```

### Safety rules

- `replace` previews by default; writes only with `--apply`.
- `search` and `replace` default to document content (skip framework / generated).
- Generated paths (`public/openpress/`, `dist-react/`, `.deploy/`, `.openpress/`) are never hand-edited.
- Public deploys always go through `openpress-deploy` skill and require explicit user confirmation naming the target Cloudflare Pages project.

---

## 4. Workspace layout (after init)

```txt
<target>/
├── package.json                  # workspace manifest; the "openpress" field holds deploy / pdf settings
│
├── press/                        # ← your source tree
│   ├── index.tsx                  # default-exported <Workspace>/<Press> tree
│   ├── <slug>/chapters/           # MDX sections for a slugged Press (or `chapters/` at root for single-Press workspaces)
│   ├── <slug>/components/         # per-Press visual components
│   ├── theme/                     # tokens, page surfaces, base type, print rules (workspace-shared)
│   ├── design.md                  # public design brief for agents
│   └── media/                     # images and assets
│
├── node_modules/@open-press/      # package-owned runtime after install
│
└── public/openpress/             # generated, gitignored
```

| Editable by you | Editable by agent | Hand-edit forbidden |
| --- | --- | --- |
| `press/`, the `"openpress"` field in `package.json` | same as left + create source files / components | `node_modules/@open-press/`, `public/openpress/`, `dist-react/`, `.deploy/`, `.openpress/` |

---

## 5. Authoring surface

| Source | Use for |
| --- | --- |
| `press/index.tsx` | Default-exported `<Workspace>` + `<Press>` tree — the document-shape authority |
| `<Press page>` | Canonical page geometry (`a4`, `social-square`, `slide-16-9`, or a custom fixed size `{ id, label, width, height }` object) |
| `<Press sources>` | Registers MDX roots/files via `mdxSource()`; search/replace/validate use this registration |
| `<Frame frameKey role>` | One fixed-layout page/surface, including cover, TOC, section openers, content pages, and back cover |
| `<MdxArea chainId>` | Slot that receives measured MDX blocks from a registered source chain |
| `<Toc source="...">` / `<TocArea chainId>` | Manuscript helper that renders a TOC frame and consumes the generated `toc:<sourceId>` chain; core treats it like any other MDX area |
| `Sections page={Page}` | Manuscript helper that passes `frameKey`, `chainId`, `pageIndex`, `totalPages`, `sectionSlug`, `sectionTitle`, and section metadata into your content page template |
| Source files under `press/` or `document/` | Prose, card text, slide text, or other content registered by the Press tree |
| `components/` inside the source tree | Shared document components |
| `theme/` inside the source tree | Visual tokens, page surfaces, typography, print rules |
| `design.md` inside the source tree | Public design brief — what the design system promises |

The reader runtime no longer paginates, rewrites headings/captions, or injects footers. Export writes final frame HTML into `public/openpress/document.json`; `src/openpress/` only displays that output and handles workbench interactions. Page shell choices, including running headers, footers, and page number placement, are workspace component concerns.
