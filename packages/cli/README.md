# @open-press/cli

Scaffolder for [open-press](https://github.com/quan0715/open-press) — an AI-first fixed-layout document workspace.

## Prerequisite

Node.js 20 or newer with `npm` / `npx`.

## Quick start

```bash
npx @open-press/cli init my-doc
cd my-doc
npm run dev
```

Then open the local URL printed by Vite (typically `http://127.0.0.1:5173/?dev=1`).

The CLI creates the OpenPress runtime workspace only. Starters and examples live in skills, installed separately with `npx skills add <owner/repo>`. The starter-bearing skills in the framework repo are just skills; agents can read and use them directly.

## Usage

```
npx @open-press/cli init <target> [flags]
```

| Flag                 | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `--title <s>`        | Document title (written to workspace config)                                |
| `--subtitle <s>`     | Document subtitle                                                           |
| `--organization <s>` | Organization name                                                           |
| `--author <s>`       | Author name                                                                 |
| `--no-git`           | Skip `git init` + initial commit (use when scaffolding inside an existing repo) |
| `--no-install`       | Skip `npm install` (offline, or you'll run pnpm/bun yourself)              |
| `--help`             | Print help                                                                  |

> The target must be empty. A `.git/` directory or other harmless dotfiles (`.gitignore`, `.gitkeep`, `.DS_Store`) are ignored — common when scaffolding into a fresh repo.

To use an opinionated starter, install a skill and let the agent read that skill's files:

```bash
npx -y skills@latest add quan0715/openpress-social-card-skill
```

## What it creates

A self-contained workspace with:

- `engine/`, `src/`, `vite.config.ts` — the open-press framework (snapshot of `@open-press/core`)
- `.claude/skills/` and `.agents/skills/` — agent skill files for Claude Code, Codex, Cursor, Copilot, etc.
- `openpress.config.mjs` — workspace metadata (title, subtitle, organization, author)
- `AGENTS.md` — agent contract

The `press/` or transitional `document/` source tree is added by a skill, user-authored code, or a project-specific workflow after init.

## After init

Workspace commands (run via `npm run` or `node engine/cli.mjs`):

```
npm run dev                       # start workbench
npm run build                     # validate + render dist-react/
npm run preview                   # preview production build
npm run typecheck                 # tsc --noEmit
npm run openpress:image           # render one PNG per page
npm run openpress:pdf             # render PDF
npm run openpress:deploy:dry-run  # preview deploy without publishing
```

Full reference: <https://open-press.dev/docs/cli>

## License

MIT — see [LICENSE](https://github.com/quan0715/open-press/blob/main/LICENSE).
