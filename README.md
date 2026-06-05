# open-press

> AI-first fixed-layout document framework. Creative skills decide what to make; OpenPress handles the workbench, inline editing, comment markers, rendering, PDF/image export, and deploy plumbing.

[![npm](https://img.shields.io/npm/v/@open-press/cli?label=%40open-press%2Fcli&color=black)](https://www.npmjs.com/package/@open-press/cli)
[![cli downloads](https://img.shields.io/npm/dm/%40open-press%2Fcli?label=cli%20downloads&color=black)](https://www.npmjs.com/package/@open-press/cli)
[![core downloads](https://img.shields.io/npm/dm/%40open-press%2Fcore?label=core%20downloads&color=black)](https://www.npmjs.com/package/@open-press/core)
[![Landing](https://img.shields.io/badge/site-open--press.dev-black)](https://open-press.dev)
[![License](https://img.shields.io/badge/license-MIT-black)](LICENSE)

![OpenPress workbench showing a fixed-layout document page with outline navigation](docs/assets/openpress-readme-hero-screenshot-wide.png)

OpenPress is for artifacts where **content keeps changing but the output format must stay stable**: proposals, whitepapers, reports, course notes, books, social cards, and slide decks.

## Start

Prerequisite: Node.js 20 or newer.

```bash
npx @open-press/cli init my-doc
cd my-doc
npm run dev
```

Init installs the framework packages and OpenPress skills. Open the local Vite URL, usually `http://127.0.0.1:5173/workspace`, after a skill has created a `press/` source tree.

## Create With AI

Open the workspace in a skill-aware agent such as Claude Code or Codex CLI:

```bash
claude
# or
codex
```

Then ask naturally:

```txt
我想寫一份投資人提案，幫我起手。
```

Creation is split by artifact type:

- `openpress-create-pages` creates page-based documents.
- `openpress-create-slide` creates slide decks.
- `openpress` owns CLI lifecycle, validation, rendering, export, upgrade, and migration.

For Copilot Chat or other tools that do not auto-discover `SKILL.md`, see [manual agent setup](docs/skills.md#manual-agent-setup).

### Skills

`npx @open-press/cli init` installs skills automatically. To install or update them separately:

```bash
# Install
npx skills add quan0715/open-press

# Update to latest
npx skills upgrade
```

Skills land in `.agents/skills/` (universal) and `.claude/skills/` (Claude Code). They are read automatically by Claude Code, Cursor, Codex, Gemini CLI, Cline, Warp, and most other skill-aware agents — no manual loading required.

### Bootstrap Prompts

Use these when the agent does not yet have the OpenPress skills installed.

**Init a new workspace (empty folder, no skills):**

```txt
Run `npx skills add quan0715/open-press` to install the OpenPress skills.
Once installed, use the openpress-create-pages or openpress-create-slide skill
to set up a new workspace in this folder.
```

**Upgrade an existing workspace:**

```txt
Run: npx open-press upgrade
This updates both the framework packages and the OpenPress skills.
Tell me what changed after it completes.
```

## What You Get

- Fixed-layout pages: A4, social formats, slide 16:9, or custom presets.
- Press Tree rendering from folder entries such as `press/slide/press.tsx`.
- Multi-Press workspaces: documents, cards, and slides in one project.
- Local workbench with preview, comments, mentions, and image export.
- PDF export and Cloudflare Pages deploy workflow.
- Portable skills under `.agents/skills/` and `.claude/skills/`.

## Framework Development

This repo includes a tracked dogfood workspace in `press/`.

```bash
pnpm run dev:workspace  # dogfood press / workbench
pnpm run dev:web        # open-press.dev landing site
pnpm run build          # render every Press
pnpm run openpress:pdf  # export PDF
```

## More

| Want to | See |
| --- | --- |
| CLI commands | [docs/cli.md](docs/cli.md) |
| Press Tree model | [docs/press-tree.md](docs/press-tree.md) |
| Workbench UI | [docs/workbench.md](docs/workbench.md) |
| Skills and routing | [docs/skills.md](docs/skills.md) |
| Release / deploy | [docs/release-and-deploy.md](docs/release-and-deploy.md) |
| Contribute | [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) |
| Changelog | [CHANGELOG.md](CHANGELOG.md) |

## License

MIT - see [LICENSE](LICENSE).
