# open-press

> 用對話寫一份**固定版面文件**的 AI-first 工作區。Proposal、白皮書、講義、書、社群貼文、簡報 — 固定尺寸版面，PDF 輸出，網頁 reader。

[![npm](https://img.shields.io/npm/v/@open-press/cli?label=%40open-press%2Fcli&color=black)](https://www.npmjs.com/package/@open-press/cli)
[![cli downloads](https://img.shields.io/npm/dm/%40open-press%2Fcli?label=cli%20downloads&color=black)](https://www.npmjs.com/package/@open-press/cli)
[![core downloads](https://img.shields.io/npm/dm/%40open-press%2Fcore?label=core%20downloads&color=black)](https://www.npmjs.com/package/@open-press/core)
[![Landing](https://img.shields.io/badge/site-open--press.dev-black)](https://open-press.dev)
[![License](https://img.shields.io/badge/license-MIT-black)](LICENSE)

> **Status: v0.8.** Published on npm as [`@open-press/cli`](https://www.npmjs.com/package/@open-press/cli) and [`@open-press/core`](https://www.npmjs.com/package/@open-press/core). Landing site at [open-press.dev](https://open-press.dev).

## What it's for

Use open-press when **the content keeps changing but the output format must stay stable**.

Good fits: proposals, business plans, whitepapers, research reports, product specs, books, handbooks, course notes, study guides, technical reports, editorial long-form, branded reports, social media cards, and 16:9 slide decks.

Less useful for: one-off chat answers, free-form image editing, and documents that need live responsive reflow instead of fixed page scaling.

## Prerequisite

Install [Node.js LTS](https://nodejs.org/en/download/) first if `node -v`, `npm -v`, or `npx -v` is not available. OpenPress requires Node.js 20 or newer.

## Start in 30 seconds

```bash
npx @open-press/cli init my-doc --pack editorial-monograph
cd my-doc
npm run dev
```

That's it — `npm install` and skill setup happen automatically during init. Open the local URL printed by Vite (typically `http://127.0.0.1:5173/?dev=1`) to see the workbench.

Other available style packs: `claude-document` (warm working notes), `academic-paper` (research/article format), `social-post` (1080px square), and `slide-deck` (16:9). Run without `--pack` for an empty skeleton.

To hand off to your AI tool:

### Claude Code (full skill support)

```bash
claude
```

Then:

> 我想寫一份 [提案 / 白皮書 / 講義 / 書]，幫我起手。

Claude Code auto-loads `skills/openpress-init/SKILL.md` and walks you through intake.

### Codex CLI (full skill support)

```bash
codex
```

Same opening prompt. Codex reads `AGENTS.md` at the repo root for the framework contract.

### Copilot Chat / other LLM tools (manual)

Open the folder in VS Code, then **paste the system prompt below** into Copilot Chat before your first message. Copilot does not auto-discover SKILL files; the prompt gives it the routing rules inline.

After pasting, send the same opening message: 「我想寫一份 [...]，幫我起手。」

#### Copilot system prompt

```txt
You are helping me work in an open-press workspace — an AI-first fixed-layout document framework. Full routing rules live in `.claude/skills/openpress/SKILL.md` (or `.agents/skills/openpress/SKILL.md`); read it on demand.

Starting from an EMPTY directory:
- First run `node -v`, `npm -v`, and `npx -v`. If missing, stop and tell me to install Node.js LTS, reopen the terminal, then retry.
- Ask for document type, audience, primary language, scope, and metadata (title / subtitle / organization / author). Do not run init before metadata is gathered.
- Then run `npx @open-press/cli init . --pack <pack>` with metadata flags. Use `--force` only after explicit confirmation for a non-empty directory.
- Style pack candidates: `editorial-monograph`, `claude-document`, `academic-paper`, `social-post`, `slide-deck`.
- After init: run `npm run openpress:validate` and `npm run openpress:export`.

Working in an EXISTING open-press workspace (one that already has `document/` + `engine/` from a previous init):
- Edit only files under `document/`, `.claude/skills/`, `.agents/skills/`, and root config files.
- Never hand-edit `public/openpress/`, `dist-react/`, `.deploy/`, or `.openpress/` — those are generated.
- Framework code under `engine/` and `src/` is treated as read-only.

Writing content:
- Edit the MDX files registered in `document/index.tsx` `export const sources` (starter packs default to `document/chapters/**/*.mdx`).
- Traditional Chinese content: apply `.claude/skills/chinese-ai-writing-polish/SKILL.md`.
- Learner-facing content (講義 / 教材 / 課程): apply `.claude/skills/teaching-notes-writing/SKILL.md`.
- Use `<TableCaption>...</TableCaption>` before captioned tables; do not hand-write figure or table numbers.

Visual / structural:
- Theme tokens, components, page rhythm → edit `document/theme/` or `document/components/`.
- Page chrome such as headers, footers, page numbers, and TOC frame layout belongs in the workspace React components (`Frame` / `Toc` / `Sections` page templates), not in the reader runtime.
- H1/H2/H3/H4 hierarchy / TOC depth → see the "Hierarchy" section in `.agents/skills/openpress-writing/SKILL.md`.

Verification before "done":
- `npm run openpress:validate` (structural checks)
- `npm run openpress:render` (React reader build)
- `npm run openpress:pdf` (PDF output)

Deploy: never publish without my explicit confirmation naming the target Cloudflare Pages project. Always `npm run openpress:deploy:dry-run` first.

Now ask me what document I want to write.
```

## What the AI will do

1. **Check environment and ask intake questions**: Node/npm availability, doc type, audience, language, scope, title / subtitle / organization / author.
2. **Recommend a style pack**: `editorial-monograph`, `claude-document`, `academic-paper`, `social-post`, or `slide-deck`.
3. **Run init with metadata flags**: `npx @open-press/cli init . --pack <pack> --title "..."`.
4. **Validate/export**: `npm run openpress:validate` and `npm run openpress:export`.
5. **Hand off**: tells you to edit `document/chapters/` next, and which skill picks up writing (繁中內容 → `chinese-ai-writing-polish`, 教學講義 → `teaching-notes-writing`).

From here, keep chatting. You write content; the agent handles tooling.

## What you get

- **A4 fixed-layout pages** — no surprise reflow between draft, reader, and PDF.
- **Press Tree rendering** — `document/index.tsx` composes `<Press>`, `<Frame>`, manuscript helpers, and registered MDX sources.
- **Live web reader** at `npm run dev` (`http://127.0.0.1:5173/?dev=1`).
- **PDF export** at `npm run openpress:pdf`.
- **Public deploy via Cloudflare Pages** — opt-in, never auto-deployed; gated on confirmation naming the target project.
- **`@openpress-comment` markers** — leave feedback inline in the reader; the `openpress-apply-comments` workflow skill applies them as source edits.
- **Five built-in style packs**: `editorial-monograph`, `claude-document`, `academic-paper`, `social-post`, and `slide-deck`.
- **Multi-tool agent skills** installed under `.claude/skills/` and `.agents/skills/` — works with Claude Code, Codex CLI, Cursor, Gemini CLI, Copilot, and 50+ other AI agents.

→ See the [landing site](https://open-press.dev) for the agent-first walkthrough.

## Framework Development

Inside this repository, `document/` is the tracked dogfood workspace for the OpenPress User Story Book. It is separate from the public landing site:

```bash
pnpm run dev:workspace  # dogfood document / workbench
pnpm run dev:web        # open-press.dev landing site
```

The dogfood document uses the same CLI path as downstream workspaces:

```bash
pnpm run openpress:validate
pnpm run openpress:render
pnpm run openpress:pdf
pnpm run openpress:deploy:dry-run
```

## Need more

| Want to | See |
| --- | --- |
| Run commands directly | [`docs/cli.md`](docs/cli.md) |
| Maintain the Press Tree model | [`docs/press-tree.md`](docs/press-tree.md) |
| Use the workbench UI (comments, mentions, project assets) | [`docs/workbench.md`](docs/workbench.md) |
| Understand the skills | [`docs/skills.md`](docs/skills.md) or browse [`skills/<skill>/SKILL.md`](skills/) |
| Cut a release / configure CD | [`docs/release-and-deploy.md`](docs/release-and-deploy.md) |
| Contribute to open-press | [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`AGENTS.md`](AGENTS.md) |
| See what changed in each release | [`CHANGELOG.md`](CHANGELOG.md) |
| Report bugs | [GitHub Issues](https://github.com/quan0715/open-press/issues) |

## License

MIT — see [LICENSE](LICENSE).
