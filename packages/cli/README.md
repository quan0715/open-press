# @open-press/cli

Scaffolder for [open-press](https://github.com/quan0715/open-press) — an AI-first fixed-layout document workspace.

## Prerequisite

Node.js 20 or newer with `npm` / `npx`.

## Quick start

```bash
npx @open-press/cli init my-doc --pack editorial-monograph
cd my-doc
npm run dev
```

Then open the local URL printed by Vite (typically `http://127.0.0.1:5173/?dev=1`).

## Usage

```
npx @open-press/cli init <target> [flags]
```

| Flag                 | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `--pack <name>`      | Style pack starter: `editorial-monograph`, `claude-document`, or `academic-paper` |
| `--title <s>`        | Document title (written to `openpress.config.mjs`)                          |
| `--subtitle <s>`     | Document subtitle                                                           |
| `--organization <s>` | Organization name                                                           |
| `--author <s>`       | Author name                                                                 |
| `--no-git`           | Skip `git init`                                                             |
| `--no-install`       | Skip `npm install`                                                          |
| `--force`            | Allow scaffolding into a non-empty target                                   |
| `--help`             | Print help                                                                  |

## What it creates

A self-contained workspace with:

- `engine/`, `src/`, `vite.config.ts` — the open-press framework (snapshot of `@open-press/core`)
- `document/` — your content (populated from the chosen style pack)
- `.claude/skills/` and `.agents/skills/` — agent skill files for Claude Code, Codex, Cursor, Copilot, etc.
- `openpress.config.mjs` — workspace metadata (title, subtitle, organization, author)
- `AGENTS.md` — agent contract

## After init

Workspace commands (run via `npm run` or `node engine/cli.mjs`):

```
npm run dev         # start workbench
npm run build       # render production output (dist-react/)
npm run preview     # preview production build
npm run openpress:validate   # structural checks
npm run openpress:pdf        # render PDF
npm run openpress:deploy:dry-run
```

## License

MIT — see [LICENSE](https://github.com/quan0715/open-press/blob/main/LICENSE).
