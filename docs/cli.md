# CLI Reference

open-press ships two CLI surfaces:

| CLI | Where you run it | What it does |
| --- | --- | --- |
| `@open-press/cli` (`open-press`) | from any directory via `npx` | Scaffolds a new workspace |
| `node engine/cli.mjs` / `npm run openpress:*` | inside a scaffolded workspace | Day-to-day: dev / build / validate / pdf / deploy |

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
| `--title <s>` | Document title (written into workspace config). |
| `--subtitle <s>` | Document subtitle. |
| `--organization <s>` | Organization name. |
| `--author <s>` | Author name. |
| `--no-git` | Skip `git init` + initial commit. Use when scaffolding into an existing repo. |
| `--no-install` | Skip `npm install`. Use offline, or when managing deps with pnpm / bun yourself. |
| `--help` | Print help. |

The target must be empty. A lone `.git/`, `.gitignore`, `.gitkeep`, or `.DS_Store` is fine — they're ignored, so init into a fresh repo Just Works.

Examples:

```bash
# Interactive AI flow (Claude Code / Codex / etc) — agent constructs the command.
npx @open-press/cli init my-doc

# Fully specified (CI, scripts, agent-driven non-interactive):
npx @open-press/cli init my-doc \
  --title "Series A 提案書" \
  --subtitle "2026 Q2" \
  --organization "FooBar Co." \
  --author "Quan" \
  --no-git
```

After init the target directory contains a self-contained OpenPress runtime workspace (engine, runtime, config, and framework skills). Starters are distributed through skills, not through this CLI. Install a skill with `npx skills add <owner/repo>`, then let the agent copy or adapt that skill's starter/example files into `press/` or the transitional `document/` source tree. The starter-bearing skills in this repo are ordinary skills agents can read and use directly.

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
npm run openpress:pdf                  # render PDF
npm run openpress:deploy:dry-run       # show what `deploy` would do
npm run openpress:deploy -- --confirm  # publish after explicit confirmation
```

**Tier 3 — Tools** (call the engine directly; for agents / debugging):

```bash
node engine/cli.mjs --help
node engine/cli.mjs validate .                     # source-level structural check
node engine/cli.mjs export .                       # write public/openpress/document.json only
node engine/cli.mjs inspect . --json               # post-render geometry + comment markers
node engine/cli.mjs search . "keyword" --json
node engine/cli.mjs replace . "old" "new" --json   # preview only
node engine/cli.mjs replace . "old" "new" --apply  # writes changes
node engine/cli.mjs doctor . --json                # workspace freshness vs npm latest
node engine/cli.mjs upgrade . --dry-run            # alias: migrate
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
├── package.json                  # workspace manifest (private, scripts proxied to engine/cli.mjs)
├── openpress.config.mjs          # title / subtitle / organization / author / deploy
├── vite.config.ts                # workbench dev/build (do not edit)
├── tsconfig.json                 # TypeScript paths (@open-press/core, @/components, etc.)
├── index.html                    # vite entry (do not edit)
│
├── press/ or document/           # ← your source tree, added by a skill or project workflow
│   ├── index.tsx                  # default-exported <Workspace>/<Press> tree
│   ├── chapters/ or cards/        # source files registered by the Press tree
│   ├── components/                # visual components
│   ├── theme/                     # tokens, page surfaces, base type, print rules
│   ├── design.md                  # public design brief for agents
│   └── media/                     # images and assets
│
├── engine/                       # ← framework CLI + render pipeline (read-only)
├── src/openpress/                # ← framework runtime (read-only)
│
├── .claude/skills/               # SKILL files for Claude Code (installed by init)
├── .agents/skills/               # SKILL files for Codex / generic agents
├── AGENTS.md                     # agent contract
│
└── public/openpress/             # generated, gitignored
```

| Editable by you | Editable by agent | Hand-edit forbidden |
| --- | --- | --- |
| `press/`, `document/`, `openpress.config.mjs`, `.claude/skills/<user>/`, `.agents/skills/<user>/` | same as left + create source files / components | `engine/`, `src/openpress/`, `public/openpress/`, `dist-react/`, `.deploy/`, `.openpress/` |

---

## 5. Authoring surface

| Source | Use for |
| --- | --- |
| `press/index.tsx` or `document/index.tsx` | Default-exported `<Workspace>/<Press>` tree; transitional workspaces may also export `config` and `sources` |
| `<Press page>` or transitional `config.page` | Canonical page geometry (`a4`, `social-square`, `slide-16-9`, or a custom fixed size object) |
| `<Press sources>` or transitional `export const sources` | Registers MDX roots/files via `mdxSource()`; search/replace/validate use this registration |
| `<Frame frameKey role>` | One fixed-layout page/surface, including cover, TOC, section openers, content pages, and back cover |
| `<MdxArea chainId>` | Slot that receives measured MDX blocks from a registered source chain |
| `<Toc source="...">` / `<TocArea chainId>` | Manuscript helper that renders a TOC frame and consumes the generated `toc:<sourceId>` chain; core treats it like any other MDX area |
| `Sections page={Page}` | Manuscript helper that passes `frameKey`, `chainId`, `pageIndex`, `totalPages`, `sectionSlug`, `sectionTitle`, and section metadata into your content page template |
| Source files under `press/` or `document/` | Prose, card text, slide text, or other content registered by the Press tree |
| `components/` inside the source tree | Shared document components |
| `theme/` inside the source tree | Visual tokens, page surfaces, typography, print rules |
| `design.md` inside the source tree | Public design brief — what the design system promises |

The reader runtime no longer paginates, rewrites headings/captions, or injects footers. Export writes final frame HTML into `public/openpress/document.json`; `src/openpress/` only displays that output and handles workbench interactions. Page shell choices, including running headers, footers, and page number placement, are workspace component concerns.
