# open-press

> 用對話寫一份**正式長文件**的 AI-first 工作區。Proposal、白皮書、講義、書 — 固定 A4 版面，PDF 輸出，網頁 reader。

[![npm](https://img.shields.io/npm/v/@open-press/cli?label=%40open-press%2Fcli&color=black)](https://www.npmjs.com/package/@open-press/cli)
[![Landing](https://img.shields.io/badge/site-open--press.pages.dev-black)](https://open-press.pages.dev)
[![License](https://img.shields.io/badge/license-MIT-black)](LICENSE)

> **Status: v0.3.** Published on npm as [`@open-press/cli`](https://www.npmjs.com/package/@open-press/cli) and [`@open-press/core`](https://www.npmjs.com/package/@open-press/core). Landing site at [open-press.pages.dev](https://open-press.pages.dev).

## What it's for

Use open-press when **the content keeps changing but the output format must stay stable**.

Good fits: proposals, business plans, whitepapers, research reports, product specs, books, handbooks, course notes, study guides, technical reports, editorial long-form, branded reports.

Less useful for: one-off chat answers, free-form layout work, slide decks (without changing the page geometry tokens).

## Start in 30 seconds

```bash
npx @open-press/cli init my-doc --pack editorial-monograph
cd my-doc
npm run dev
```

That's it — `npm install` and skill setup happen automatically during init. Open the local URL printed by Vite (typically `http://127.0.0.1:5173/?dev=1`) to see the workbench.

Other available style packs: `claude-document` (warm working notes). Run without `--pack` for an empty skeleton.

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
- Ask me document type (proposal / whitepaper / teaching notes / book / etc), audience, primary language, scope, and metadata (title / subtitle / organization / author). Do not run init before metadata is gathered.
- Then run: `npx @open-press/cli init . --pack <pack>` (with --force if the dir isn't empty).
- Style pack candidates: `editorial-monograph` (formal long-form, hairline editorial) or `claude-document` (warm working notes, briefs).
- After init: fill the cover/toc/backCover props inside `document/index.tsx`, and `npm run openpress:validate`.

Working in an EXISTING open-press workspace (one that already has `document/` + `engine/` from a previous init):
- Edit only files under `document/`, `.claude/skills/`, `.agents/skills/`, and root config files.
- Never hand-edit `public/openpress/`, `dist-react/`, `.deploy/`, or `.openpress/` — those are generated.
- Framework code under `engine/` and `src/` is treated as read-only.

Writing content:
- Edit `document/chapters/**/*.mdx`.
- Traditional Chinese content: apply `.claude/skills/chinese-ai-writing-polish/SKILL.md`.
- Learner-facing content (講義 / 教材 / 課程): apply `.claude/skills/teaching-notes-writing/SKILL.md`.
- Use `<TableCaption>...</TableCaption>` before captioned tables; do not hand-write figure or table numbers.

Visual / structural:
- Theme tokens, components, page rhythm → edit `document/theme/` or `document/components/`.
- H1/H2/H3/H4 hierarchy / TOC depth → see `.claude/skills/openpress-document-hierarchy/SKILL.md`.

Verification before "done":
- `npm run openpress:validate` (structural checks)
- `npm run openpress:render` (React reader build)
- `npm run openpress:pdf` (PDF output)

Deploy: never publish without my explicit confirmation naming the target Cloudflare Pages project. Always `npm run openpress:deploy:dry-run` first.

Now ask me what document I want to write.
```

## What the AI will do

1. **Ask 4-5 intake questions**: doc type, audience, language, scope, title / subtitle / organization.
2. **Recommend a style pack** (`editorial-monograph` for formal long-form, `claude-document` for warm working notes).
3. **Run init**: `npx @open-press/cli init . --pack <pack>` scaffolds the workspace.
4. **Fill metadata** into `openpress.config.mjs` and `document/index.tsx` cover props.
5. **Validate**: `npm run openpress:validate` confirms the workspace is healthy.
6. **Hand off**: tells you to edit `document/chapters/` next, and which skill picks up writing (繁中內容 → `chinese-ai-writing-polish`, 教學講義 → `teaching-notes-writing`).

From here, keep chatting. You write content; the agent handles tooling.

## What you get

- **A4 fixed-layout pages** — no surprise reflow between draft, reader, and PDF.
- **Live web reader** at `npm run dev` (`http://127.0.0.1:5173/?dev=1`).
- **PDF export** at `npm run openpress:pdf`.
- **Public deploy via Cloudflare Pages** — opt-in, never auto-deployed; gated on confirmation naming the target project.
- **`@openpress-comment` markers** — leave feedback inline in the reader; the agent applies them as source edits.
- **Two built-in style packs**: `editorial-monograph` (hairline editorial), `claude-document` (warm working notes).
- **Multi-tool agent skills** installed under `.claude/skills/` and `.agents/skills/` — works with Claude Code, Codex CLI, Cursor, Gemini CLI, Copilot, and 50+ other AI agents.

→ See the [landing site](https://open-press.pages.dev) for the agent-first walkthrough.

## Need more

| Want to | See |
| --- | --- |
| Run commands directly | [`docs/cli.md`](docs/cli.md) |
| Use the workbench UI (comments, mentions, project assets) | [`docs/workbench.md`](docs/workbench.md) |
| Understand the skills | [`docs/skills.md`](docs/skills.md) or browse [`skills/<skill>/SKILL.md`](skills/) |
| Cut a release / configure CD | [`docs/release-and-deploy.md`](docs/release-and-deploy.md) |
| Contribute to open-press | [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`AGENTS.md`](AGENTS.md) |
| See what changed in each release | [`CHANGELOG.md`](CHANGELOG.md) |
| Report bugs | [GitHub Issues](https://github.com/quan0715/open-press/issues) |

## License

MIT — see [LICENSE](LICENSE).
