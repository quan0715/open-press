# Skill Index

open-press ships small, focused skills. **`openpress` is the system-level entry point** for any agent working in an open-press workspace; creation skills reference it for CLI, validation, source/generated boundaries, upgrade/migration, and verification depth.

## How skills get into your workspace

Two paths, same end state:

**A. Add to an existing project**

```bash
npx skills add quan0715/open-press
```

This is the [Vercel Labs `skills` tool](https://www.npmjs.com/package/skills). It fetches the skills from this repo, writes them to `.agents/skills/<name>/` (the universal path read by Claude Code, Cursor, Codex, Gemini CLI, Cline, Continue, Warp, and 50+ other AI agents), and records the install in `skills-lock.json` for later updates.

**B. Create a new workspace** (which runs the same skill install internally):

```bash
npm create @open-press my-deck -- --type slides
```

Domain-specific OpenPress starters live in external skills, installed through the skills tool:

```bash
npx -y skills@latest add quan0715/openpress-social-card-skill
```

The social-card skill targets 1080×1350 (4:5 portrait). The old bundled square starter is no longer part of this repo.

The agent reads the installed skill, follows its intake, and copies or adapts that skill's starter/examples into the OpenPress workspace. OpenPress does not fetch external starters.

If you're not using a SKILL-aware agent (e.g. GitHub Copilot Chat), paste the prompt in [Manual Agent Setup](#manual-agent-setup) at the start of a session.

### Updating skills later

```bash
npx skills upgrade
```

Re-fetches the latest skills from the source recorded in `skills-lock.json`. Framework skills get the newest version; user-authored skills are preserved.

## Skill catalog

### System operation

| Skill | Use when |
| --- | --- |
| `openpress` | Operating the CLI, inspecting status, searching/replacing source text, validating/exporting/rendering, local workbench review, **upgrading or migrating a workspace**, choosing which specialist owns a task. |
| `openpress-apply-comments` | Reading pending `@openpress-comment` markers, applying the requested source edits, removing resolved markers, and verifying the result. |
| `openpress-deploy` | Preparing deploy config, running preflight / dry-run, publishing only after explicit confirmation naming the target Cloudflare Pages project. |
| `package-release` | Framework-maintainer package release workflow: local change inventory, docs/skill preflight, changeset/version PR handling, release workflow monitoring, and npm publish verification. |

### Create Artifacts

| Skill | Use when |
| --- | --- |
| `openpress-create-pages` | Creating page-based artifacts: workspace bootstrap, pages Press Tree, MDX source roots, hierarchy, prose structure, captions, factual boundaries, initial theme, page components. Includes `open-press search` integration for locating content before editing. |
| `openpress-create-slide` | Creating slide decks: workspace bootstrap, slide Press Tree, `DeckSlide`, protocol layouts, UI primitives, Tailwind semantic styling, deck structure, and assets. Follows a PROPOSE → REFINE → DOCUMENT → ALIGN workflow. |

### Portable Writing and Diagrams

| Skill | Use when |
| --- | --- |
| `openpress-diagram-drawing` | Designing diagram semantics: nodes, arrows, labels, state changes — what belongs inside a figure vs in surrounding prose. |
| `teaching-notes-writing` | Learner-facing notes, examples, practice questions, answer appendices. Loaded by `openpress-create-pages` for teaching content. |
| `chinese-ai-writing-polish` | Polishing Traditional Chinese professional writing — removes AI-like phrasing, passive packaging, reverse-construction over-use. Loaded by `openpress-create-pages` for 繁中 content. |

Maintainer guidance for starter-bearing skills now lives in [Authoring a Starter-Bearing Skill](./starter-skill-authoring.md), not as an installed agent skill. Built-in starter packs have been retired; use `openpress-create-pages` or `openpress-create-slide` for new work.

---

## Talking to your agent

Once a skill-aware agent is loaded in the workspace, plain language works:

```txt
我想寫一份投資人提案，幫我起手。
```

```txt
把目前 chapters/01-intro 的內容改寫成更給投資人看的口吻，保留事實，沒講到的數字留 [TODO]。
```

```txt
這份文件結構太鬆，把章節重新分一輪 H2/H3，公開 TOC 不要塞 H4。
```

```txt
跑一次 deploy 的 dry-run，看 Cloudflare Pages 的 project 設定有沒有問題。先不要真的 publish。
```

The agent loads the relevant SKILL.md based on the request — you don't need to name skills explicitly. If routing isn't obvious, you can prompt: "use `openpress-create-pages`" for page artifacts or "use `openpress-create-slide`" for slide decks.

## Manual Agent Setup

Use this only for tools that do not auto-discover `SKILL.md`, such as GitHub Copilot Chat.

```txt
You are helping me work in an open-press workspace: an AI-first fixed-layout document framework.

Read the routing rules in `.agents/skills/openpress/SKILL.md` or `.claude/skills/openpress/SKILL.md` when available.

Starting from an empty directory:
- First check `node -v`, `npm -v`, and `npx -v`. OpenPress requires Node.js 20 or newer; use Node.js 24 for framework development and Cloudflare Pages builds.
- If I want a report, proposal, paper, book, teaching note, or other page-based artifact, follow `openpress-create-pages`.
- If I want a slide deck, follow `openpress-create-slide`.
- For a fresh workspace shell, a creation skill may run `npm create @open-press . -- --type slides` after intake. Slide skills extend the generated slides Press; page skills replace it with a pages Press. Do not use create as an upgrade or migration tool.
- After creating the source tree, run `npm run build`.

Working in an existing workspace:
- Edit source files under `press/`, `.agents/skills/`, `.claude/skills/`, and root config files.
- Do not hand-edit generated output under `public/openpress/`, `dist-react/`, `.deploy/`, or `.openpress/`.
- Treat framework code under `node_modules/@open-press/` as read-only.

Routing:
- `openpress-create-pages` owns page-based artifact creation, source hierarchy, MDX structure, first theme, and page components.
- `openpress-create-slide` owns slide deck creation, slide Press Tree generation, `DeckSlide`, protocol layouts, reusable UI primitives, Tailwind semantic styling, and deck structure.
- `openpress` owns CLI lifecycle, validation, rendering, PDF/image export, doctor, and upgrade.
- `openpress-deploy` owns deploy, and must never publish without my explicit confirmation naming the target Cloudflare Pages project.

Now ask me what I want to create.
```

## Adding your own skill

Skills are plain files. To add one (e.g. a project-specific tone guide):

```bash
mkdir -p .agents/skills/my-company-tone
cat > .agents/skills/my-company-tone/SKILL.md <<'EOF'
---
name: my-company-tone
description: Use when writing for FooBar product. Enforces concrete verbs, no marketing fluff, metrics with source.
---

# My Company Tone

## Rules

- ...
EOF
```

`.agents/skills/` is the universal source. Modern AI tools (Claude Code, Cursor, Codex, Gemini CLI, Cline, Continue, Warp, …) read directly from there. To share the skill with others, push it to a public GitHub repo:

```bash
npx skills add <owner>/<repo>
```

The skill loads automatically whenever its `description` matches the current request. `openpress-create-pages` resolves portable writing skill conflicts in this order:

1. Explicit user instruction
2. Workspace memory / `document/design.md`
3. Document brief
4. `openpress-create-pages` structural decisions
5. Portable skills (your custom skill lands here)

To share a skill across projects, push it to a public GitHub repo and install it with `npx skills add <owner>/<repo>`. Use `npx skills upgrade` later to refresh installed skills from `skills-lock.json`.
