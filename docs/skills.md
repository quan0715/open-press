# Skill Index

open-press ships small, focused skills. **`openpress` is the system-level entry point** for any agent working in an open-press workspace; writing and design skills reference it for CLI, validation, source/generated boundaries, and verification depth.

## How skills get into your workspace

Two paths, same end state:

**A. Add to an existing project**

```bash
npx skills add quan0715/open-press
```

This is the [Vercel Labs `skills` tool](https://www.npmjs.com/package/skills). It fetches the skills from this repo, writes them to `.agents/skills/<name>/` (the universal path read by Claude Code, Cursor, Codex, Gemini CLI, Cline, Continue, Warp, and 50+ other AI agents), and records the install in `skills-lock.json` for later updates.

**B. Scaffold a new workspace** (which runs the same skill install internally):

```bash
npx @open-press/cli init my-doc
```

Domain-specific OpenPress starters live in external skills, installed through the skills tool:

```bash
npx -y skills@latest add quan0715/openpress-social-card-skill
```

The social-card skill targets 1080×1350 (4:5 portrait). The old bundled square starter is no longer part of this repo.

The agent reads the installed skill, follows its intake, and copies or adapts that skill's starter/examples into the OpenPress workspace. OpenPress does not fetch external starters.

If you're not using a SKILL-aware agent (e.g. GitHub Copilot Chat), paste the system prompt from the [README](../README.md#copilot-system-prompt) at the start of a session.

### Updating skills later

```bash
npx skills upgrade
```

Re-fetches the latest skills from the source recorded in `skills-lock.json`. Framework skills get the newest version; user-authored skills are preserved.

## Skill catalog

### System operation

| Skill | Use when |
| --- | --- |
| `openpress` | Operating the CLI, inspecting status, searching/replacing source text, validating/exporting/rendering, local workbench review, **upgrading to a new framework release**, choosing which specialist owns a task. |
| `openpress-apply-comments` | Reading pending `@openpress-comment` markers, applying the requested source edits, removing resolved markers, and verifying the result. |
| `openpress-init` | Starting a new document project: intake questions, metadata gathering, running `init`, and handing off to a skill or writing workflow. |
| `openpress-deploy` | Preparing deploy config, running preflight / dry-run, publishing only after explicit confirmation naming the target Cloudflare Pages project. |

### Writing

| Skill | Use when |
| --- | --- |
| `openpress-writing` | Planning, drafting, rewriting, or restructuring document content. Owns audience, narrative, captions, factual boundaries, **H1/H2/H3/H4 hierarchy and TOC depth**. Loads portable writing skills based on content type. |
| `openpress-diagram-drawing` | Designing diagram semantics: nodes, arrows, labels, state changes — what belongs inside a figure vs in surrounding prose. |
| `teaching-notes-writing` | Learner-facing notes, examples, practice questions, answer appendices. Loaded automatically by `openpress-writing` for teaching content. |
| `chinese-ai-writing-polish` | Polishing Traditional Chinese professional writing — removes AI-like phrasing, passive packaging, reverse-construction over-use. Loaded automatically by `openpress-writing` for 繁中 content. |

### Visual / structural

| Skill | Use when |
| --- | --- |
| `openpress-create-theme` | Product entry for `/create-theme`: brand intake, base preset selection, and initial `press/theme/` generation. |
| `openpress-design` | Revising page rhythm, theme CSS, components, covers, figures, tables, charts, PDF-safe layout. |

Maintainer guidance for starter-bearing skills now lives in [Authoring a Starter-Bearing Skill](./starter-skill-authoring.md), not as an installed agent skill.

### Starter-Bearing Skills

These are normal skills. Some include `starter/` files that agents can inspect, copy, and adapt after `openpress init`.

| Skill | Use when |
| --- | --- |
| `editorial-monograph` | A4 proposals, reports, whitepapers, product specs, long-form editorial documents. |
| `claude-document` | Warm A4 working notes, briefs, specs, research summaries, learning material. |
| `academic-paper` | A4 research papers, conference-style articles, abstracts, references, and numbered sections. |

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

The agent loads the relevant SKILL.md based on the request — you don't need to name skills explicitly. If routing isn't obvious, you can prompt: "use `openpress` and `openpress-design`" to force a particular pair.

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

The skill loads automatically whenever its `description` matches the current request. `openpress-writing`'s priority list resolves conflicts:

1. Explicit user instruction
2. Workspace memory / `document/design.md`
3. Document brief
4. `openpress-writing` structural decisions
5. Portable skills (your custom skill lands here)

To share a skill across projects, push it to a public GitHub repo and install it with `npx skills add <owner>/<repo>`. Use `npx skills upgrade` later to refresh installed skills from `skills-lock.json`.
