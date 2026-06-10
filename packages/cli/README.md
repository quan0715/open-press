# @open-press/cli

Workspace CLI for [open-press](https://github.com/quan0715/open-press) — an AI-first fixed-layout document workspace.

## Prerequisite

Node.js 20 or newer with `npm` / `npx`. Use Node.js 24 for framework development and Cloudflare Pages builds.

## Quick start

```bash
npm create @open-press my-deck -- --type slides
cd my-deck
npm run dev
```

Then open the local URL printed by Vite (typically `http://127.0.0.1:5173/workspace`).

`@open-press/create` creates a package-based OpenPress workspace. Runtime files stay inside `@open-press/core`; your project keeps only source files, theme files, media, and npm scripts. The default scaffold is a minimal slides workspace; page-based structures are created by OpenPress skills inside that workspace.

## Usage

```
open-press create <name> --type slides [--title <s>]
```

| Flag                 | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `--title <s>`        | Document title                                                              |
| `--type slides`      | Scaffold a folder-convention Press under `press/<name>/`                   |
| `--help`             | Print help                                                                  |

> `open-press create` runs inside an existing workspace and never installs packages, initializes git, or syncs skills.

To use an opinionated starter, install a skill and let the agent copy that starter's `press/` files into the workspace:

```bash
npx -y skills@latest add quan0715/openpress-social-card-skill
```

## What it creates

A self-contained workspace with:

- `package.json` with `@open-press/core`, `@open-press/cli`, and `open-press ...` scripts
- `press/<name>/press.tsx` for folder-convention Press entries
- `press/<name>/themes/` and `press/<name>/slides/` for the minimal slides scaffold
- optional `press/shared/` for assets, media, components, or theme used by multiple Press folders

It does **not** create `engine/`, `src/openpress/`, `index.html`, or `vite.config.ts` in your project. Those are package-owned runtime internals.

## After create

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
