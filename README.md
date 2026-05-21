# open-press

> 用對話寫一份**正式長文件**的 AI-first 工作區。Proposal、白皮書、講義、書 — 固定 A4 版面，PDF 輸出，網頁 reader。

[![Showcase](https://img.shields.io/badge/showcase-openpress--showcase.pages.dev-black)](https://openpress-showcase.pages.dev)

> **Status: v0 (template-only).** This repo is the framework source; npm packages are not published yet. Use it as a template — clone, edit, ship.

## What it's for

Use open-press when **the content keeps changing but the output format must stay stable**.

Good fits: proposals, business plans, whitepapers, research reports, product specs, books, handbooks, course notes, study guides, technical reports, editorial long-form, branded reports.

Less useful for: one-off chat answers, free-form layout work, slide decks (without changing the page geometry tokens).

## Start in 30 seconds

```bash
git clone https://github.com/quan0715/open-press.git my-doc
cd my-doc
```

Open the folder in your AI tool of choice and say what you want to write. The agent does the rest — `npm install`, init, validation, render. You provide the goal and the facts.

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
You are helping me work in an open-press workspace — an AI-first fixed-layout document framework. The full routing rules live in `skills/openpress/SKILL.md`; read it on demand.

Boundary rules (do not violate without my permission):
- Edit only files under `document/`, `skills/`, and root config files.
- Never hand-edit anything under `public/openpress/`, `dist-react/`, `.deploy/`, or `.openpress/` — those are generated.
- Framework code under `engine/` and `src/` is read-only from my perspective.

Starting a new project:
- If `document/` is empty or has only the gitkeep, run the intake flow first: ask me about document type (proposal / whitepaper / teaching notes / book / etc), audience, primary language, scope (single brief / multi-chapter / full book), and metadata (title / subtitle / organization / author). Do not run init before metadata is gathered.
- Then run: `node engine/cli.mjs init . --skill <pack>` with the pack you recommend.
- Style pack candidates: `editorial-monograph` (formal long-form, hairline editorial) or `claude-document` (warm working notes, briefs).
- Fill metadata into `openpress.config.mjs` and the cover/toc/backCover props inside `document/index.tsx`.
- Run `npm run openpress:validate` to confirm the workspace is healthy.

Writing content:
- Edit `document/chapters/**/*.mdx`.
- If language is Traditional Chinese, apply the rules in `skills/chinese-ai-writing-polish/SKILL.md`.
- If audience is learners (講義 / 教材 / 課程), apply `skills/teaching-notes-writing/SKILL.md`.
- Use `<TableCaption>...</TableCaption>` before captioned tables; do not hand-write figure or table numbers.

Visual / structural changes:
- For theme tokens, components, or page rhythm: edit `document/theme/` or `document/components/`.
- For H1/H2/H3/H4 hierarchy or TOC depth changes: see `skills/openpress-document-hierarchy/SKILL.md`.

Verification before "done":
- `npm run openpress:validate` for structural checks.
- `npm run openpress:render` for the React reader build.
- `npm run openpress:pdf` for PDF output.

Deploy:
- Never publish without my explicit confirmation naming the target project.
- Always run the dry-run first: `npm run openpress:deploy:dry-run`.

Now ask me what document I want to write.
```

## What the AI will do

1. **Ask 4-5 intake questions**: doc type, audience, language, scope, title / subtitle / organization.
2. **Recommend a style pack** (`editorial-monograph` for formal long-form, `claude-document` for warm working notes).
3. **Run init**: `node engine/cli.mjs init . --skill <pack>` copies the starter into `document/`.
4. **Fill metadata** into `openpress.config.mjs` and `document/index.tsx`.
5. **Validate**: runs `npm run openpress:validate` to confirm the workspace is healthy.
6. **Hand off**: tells you to edit `document/chapters/` next, and which skill will pick up writing (繁中內容 → `chinese-ai-writing-polish` loads automatically, 教學講義 → `teaching-notes-writing` loads).

From here, keep chatting. You write content; the agent handles tooling.

## What you get

- **A4 fixed-layout pages** — no surprise reflow between draft, reader, and PDF.
- **Live web reader** at `npm run dev` (`http://127.0.0.1:5173/?dev=1`).
- **PDF export** at `npm run openpress:pdf`.
- **Public deploy via Cloudflare Pages** — opt-in, never auto-deployed.
- **`@openpress-comment` markers** — leave feedback in the reader, AI applies as source edits.
- **Two built-in style packs**: `editorial-monograph` (hairline editorial), `claude-document` (warm working notes).

[showcase →](https://openpress-showcase.pages.dev)

## Need more

| Want to | See |
| --- | --- |
| Run commands directly | `docs/cli.md` |
| Use the workbench UI (comments, mentions, project assets) | `docs/workbench.md` |
| Understand all the skills | `docs/skills.md` or `skills/<skill>/SKILL.md` |
| Contribute to open-press | `CONTRIBUTING.md` and `AGENTS.md` |
| See what changed in each release | `CHANGELOG.md` |
| Report bugs | [GitHub Issues](https://github.com/quan0715/open-press/issues) |

## License

MIT — see [LICENSE](LICENSE).
