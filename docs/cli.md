# CLI Reference

open-press ships two CLI surfaces:

| CLI | Where you run it | What it does |
| --- | --- | --- |
| `@open-press/cli` (`open-press`) | from any directory via `npx` | Scaffolds a new workspace |
| `node engine/cli.mjs` / `npm run openpress:*` | inside a scaffolded workspace | Day-to-day: dev / build / validate / pdf / deploy |

Most users invoke these through their AI agent. This page is the reference.

---

## 1. Scaffolding a new workspace

```bash
npx @open-press/cli init <target> [flags]
```

| Flag | Description |
| --- | --- |
| `<target>` | Positional. Target directory (created if missing). |
| `--pack <name>` | Style pack starter: `editorial-monograph` or `claude-document`. Omit for an empty skeleton. |
| `--title <s>` | Document title (written into `openpress.config.mjs`). |
| `--subtitle <s>` | Document subtitle. |
| `--organization <s>` | Organization name. |
| `--author <s>` | Author name. |
| `--no-git` | Skip `git init`. |
| `--no-install` | Skip `npm install`. |
| `--force` | Allow scaffolding into a non-empty target. |
| `--help` | Print help. |

Examples:

```bash
# Interactive AI flow (Claude Code / Codex / etc) — agent constructs the command.
npx @open-press/cli init my-doc --pack editorial-monograph

# Fully specified (CI, scripts, agent-driven non-interactive):
npx @open-press/cli init my-doc \
  --pack editorial-monograph \
  --title "Series A 提案書" \
  --subtitle "2026 Q2" \
  --organization "FooBar Co." \
  --author "Quan" \
  --no-git
```

After init the target directory contains a fully self-contained workspace (engine, runtime, theme, skills, sample chapters). Future versions may switch to a `@open-press/core` dependency model; today it's a snapshot copy.

---

## 2. Workspace commands (inside a scaffolded directory)

All commands are also exposed as npm scripts:

```bash
npm run dev                            # start the local workbench (vite)
npm run build                          # same as openpress:render
npm run preview                        # preview a built workspace
npm run openpress:validate             # structural gates (no render)
npm run openpress:export               # write public/openpress/document.json
npm run openpress:render               # build dist-react/
npm run openpress:pdf                  # render PDF
npm run openpress:deploy:dry-run       # show what `deploy` would do
npm run openpress:deploy -- --confirm  # publish after explicit confirmation
```

Direct invocation (same behaviour):

```bash
node engine/cli.mjs --help
node engine/cli.mjs inspect . --json
node engine/cli.mjs search . "keyword" --json
node engine/cli.mjs replace . "old" "new" --json   # preview only
node engine/cli.mjs replace . "old" "new" --apply  # writes changes
```

### Safety rules

- `replace` previews by default; writes only with `--apply`.
- `search` and `replace` default to document content (skip framework / generated).
- Generated paths (`public/openpress/`, `dist-react/`, `.deploy/`, `.openpress/`) are never hand-edited.
- Public deploys always go through `openpress-deploy` skill and require explicit user confirmation naming the target Cloudflare Pages project.

---

## 3. Workspace layout (after init)

```txt
<target>/
├── package.json                  # workspace manifest (private, scripts proxied to engine/cli.mjs)
├── openpress.config.mjs          # title / subtitle / organization / author / deploy
├── vite.config.ts                # workbench dev/build (do not edit)
├── tsconfig.json                 # TypeScript paths (@open-press/core, @/components, etc.)
├── index.html                    # vite entry (do not edit)
│
├── document/                     # ← YOUR content
│   ├── index.tsx                  # default-exported Press tree + config + sources
│   ├── chapters/<NN-slug>/        # default source convention for manuscript docs
│   │   └── content/01-start.mdx
│   ├── components/                # your visual components
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
| `document/`, `openpress.config.mjs`, `.claude/skills/<user>/`, `.agents/skills/<user>/` | same as left + create new chapters / components | `engine/`, `src/openpress/`, `public/openpress/`, `dist-react/`, `.deploy/`, `.openpress/` |

---

## 4. Authoring surface

| Source | Use for |
| --- | --- |
| `document/index.tsx` | `config`, `sources`, and the default-exported `<Press>` tree |
| `export const sources` | Registers MDX roots/files via `mdxSource()`; search/replace/validate use this registration |
| `<Frame frameKey role>` | One fixed-layout page/surface, including cover, TOC, section openers, content pages, and back cover |
| `<MdxArea chainId>` | Slot that receives measured MDX blocks from a registered source chain |
| `document/chapters/<NN-slug>/content/*.mdx` | Default manuscript-style prose convention; other registered MDX roots are valid |
| `document/components/` | Shared document components |
| `document/theme/` | Visual tokens, page surfaces, typography, print rules |
| `document/design.md` | Public design brief — what the design system promises |

---

## 5. Available style packs

| Pack | Best for |
| --- | --- |
| `editorial-monograph` | A4 proposals, reports, whitepapers, product specs, long-form editorial documents. Hairline editorial system, serif chapter heads, IBM Carbon–style restraint. |
| `claude-document` | Warm Claude-like A4 working notes, briefs, specs, research summaries, learning material. Deep blue-gray ink on warm paper, calm editorial rhythm. |
| `academic-paper` | A4 research papers, conference-style articles, abstracts, references, and numbered sections. |

Each pack ships SKILL metadata (in `skills/<pack>/SKILL.md`) plus a starter under `skills/<pack>/starter/document/` that init copies into your workspace.

To design a new pack, see [`skills/openpress-style-pack-contributor/SKILL.md`](../skills/openpress-style-pack-contributor/SKILL.md).
