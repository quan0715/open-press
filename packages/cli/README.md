# @open-press/cli

Workspace CLI for [open-press](https://github.com/quan0715/open-press) — an AI-first fixed-layout document workspace.

## Prerequisite

Node.js 20 or newer with `npm` / `npx`.

## Quick start

```bash
npx @open-press/cli init my-doc
cd my-doc
npm run dev
```

Then open the local URL printed by Vite (typically `http://127.0.0.1:5173/workspace`).

The CLI creates a package-based OpenPress workspace. Runtime files stay inside `@open-press/core`; your project keeps only source files, theme files, media, and npm scripts.

## Usage

```
npx @open-press/cli init <target> [flags]
```

| Flag                 | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `--title <s>`        | Document title                                                              |
| `--type <pages|slides>` | Scaffold a folder-convention Press under `press/<target-name>/`          |
| `--no-git`           | Skip `git init` + initial commit (use when scaffolding inside an existing repo) |
| `--no-install`       | Skip `npm install` (offline, or you'll run pnpm/bun yourself)              |
| `--skills`           | Install OpenPress agent skills after scaffolding                            |
| `--no-skills`        | Skip agent skill installation                                               |
| `--help`             | Print help                                                                  |

> The target must be empty. A `.git/` directory or other harmless dotfiles (`.gitignore`, `.gitkeep`, `.DS_Store`) are ignored — common when scaffolding into a fresh repo.

To use an opinionated starter, install a skill and let the agent copy that starter's `press/` files into the workspace:

```bash
npx -y skills@latest add quan0715/openpress-social-card-skill
```

## What it creates

A self-contained workspace with:

- `package.json` with `@open-press/core`, `@open-press/cli`, and `open-press ...` scripts
- `press/<target-name>/press.tsx` for folder-convention Press entries
- `press/<target-name>/theme/`, `press/<target-name>/media/`, `press/<target-name>/components/` — artifact-owned authoring files
- optional `press/shared/` for assets, media, components, or theme used by multiple Press folders
- `press/<target-name>/ui/` and `press/<target-name>/layouts/` for slide starters created with `--type slides`
- `press/design.md` — working design notes for agents and maintainers

It does **not** create `engine/`, `src/openpress/`, `index.html`, or `vite.config.ts` in your project. Those are package-owned runtime internals.

## After init

Workspace commands (run via `npm run` or `open-press`):

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
