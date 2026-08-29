# Skill Index

open-press ships small, focused skills. **`openpress` is the system-level entry point** for any agent working in an open-press workspace; creation and upgrade skills reference it for CLI, validation, source/generated boundaries, routing, and verification depth.

## How skills get into your workspace

Two paths, same end state:

**A. Add to an existing project**

```bash
npx --yes skills@1.5.18 add quan0715/open-press --skill openpress openpress-apply-comments openpress-collaborate openpress-create-pages openpress-create-slide openpress-plugins openpress-deploy openpress-upgrade --agent universal claude-code --yes
```

This uses the [Vercel Labs `skills` tool](https://www.npmjs.com/package/skills).
OpenPress pins `skills@1.5.18`, the current lock/symlink implementation that
still supports OpenPress's Node.js 20 runtime contract. The tool writes
canonical skill directories to `.agents/skills/<name>/`, maintains
`.claude/skills/<name>` links for Claude Code (or a copied fallback where links
are unavailable), and records each exact skill and source in the v1
`skills-lock.json`.

**B. Create a new workspace** (which runs the same skill install internally):

```bash
npm create @open-press my-deck -- --type slides
```

Domain-specific OpenPress starters live in external skills, installed through the skills tool:

```bash
npx --yes skills@1.5.18 add quan0715/openpress-social-card-skill --skill '*' --agent universal claude-code --yes
```

The social-card skill targets 1080×1350 (4:5 portrait). OpenPress no longer bundles a square social-card starter.

The agent reads the installed skill, follows its intake, and copies or adapts that skill's starter/examples into the OpenPress workspace. OpenPress does not fetch external starters.

If you're not using a SKILL-aware agent (e.g. GitHub Copilot Chat), paste the prompt in [Manual Agent Setup](#manual-agent-setup) at the start of a session.

### Updating skills later

```bash
npm run openpress:skills
# or, in core-only workspaces:
node node_modules/@open-press/core/engine/cli.mjs skills:sync .
```

Validates the v1 `skills-lock.json`, installs the eight default OpenPress
workflow skills, refreshes tracked optional and third-party skills from their
recorded sources, and repairs missing Claude links. Untracked local skills are preserved.
Unsupported or malformed lock schemas fail explicitly instead of silently
replacing their sources. Use the core CLI path when the workspace does not
install `@open-press/cli`.

## Skill catalog

### System operation

| Skill | Use when |
| --- | --- |
| `openpress` | Operating the CLI, inspecting status, searching/replacing source text, validating/exporting/rendering, local workbench review, and choosing which specialist owns a task. |
| `openpress-collaborate` | Analyzing or changing authored OpenPress content. Chooses answer, exact Change Preview, reviewed apply, or direct-edit behavior and coordinates Comments with content skills. |
| `openpress-upgrade` | Upgrading framework packages and skills, selecting migration docs, scanning `press/`, applying confirmed workspace migrations, and looping through Migration QA checkpoints. |
| `openpress-apply-comments` | Reading pending `@openpress-comment` markers, applying the requested source edits, removing resolved markers, and verifying the result. |
| `openpress-deploy` | Preparing deploy config, running preflight / dry-run, publishing only after explicit confirmation naming the target Cloudflare Pages project. |

Framework package release guidance lives in [Release & deploy pipelines](./release-and-deploy.md); it is maintainer documentation, not an installed workspace skill.

### Create Artifacts

| Skill | Use when |
| --- | --- |
| `openpress-create-pages` | Creating page-based artifacts: workspace bootstrap, pages Press Tree, MDX source roots, hierarchy, prose structure, captions, factual boundaries, initial theme, page components. Includes `open-press search` integration for locating content before editing. |
| `openpress-create-slide` | Creating slide decks: workspace bootstrap, slide Press Tree, `DeckSlide`, protocol layouts, UI primitives, Tailwind semantic styling, deck structure, and assets. Follows a PROPOSE → REFINE → DOCUMENT → ALIGN workflow. |

### External Plugins & Extensions

| Skill | Use when |
| --- | --- |
| `openpress-plugins` | Recommending, configuring, and bridging external specialized skills (e.g. `diagram-design` architecture diagrams, visual toolkits, and writing helpers) into OpenPress documents. |

External skills remain separate dependencies tracked in `skills-lock.json`. Responsibility is cleanly separated:
- **`openpress-plugins`**: Contextually recommends skills during document authoring and adapts external outputs into native React Figure / MDX components.
- **Workbench Updates (`/workspace/settings`)**: Read-only capability dashboard in the local Workbench that generates precise copyable prompts for agent handoff.
- **Codex / Claude (Agent)**: Executes actual remote queries, package updates, and verification after human review.

Maintainer guidance for starter-bearing skills lives in [Authoring a Starter-Bearing Skill](./starter-skill-authoring.md). Built-in starter packs have been retired; use `openpress-create-pages` or `openpress-create-slide` for new work.

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

When revising existing content, `openpress-collaborate` defaults non-trivial writing changes to an exact Workbench Change Preview. Each replacement has a numbered marker that opens its short change intent, optional Comment, and quick **Accept**, **Reject**, or **More info** feedback directly on the rendered diff. This temporary feedback is not a source Comment; ask the Agent to read it and prepare the next pass from the Agent GUI.

## Manual Agent Setup

Use this only for tools that do not auto-discover `SKILL.md`, such as GitHub Copilot Chat.

```txt
You are helping me work in an open-press workspace: an AI-first fixed-layout document framework.

Read the routing rules in `.agents/skills/openpress/SKILL.md` (or its managed `.claude/skills/openpress/SKILL.md` link) when available.

Starting from an empty directory:
- First check `node -v`, `npm -v`, and `npx -v`. OpenPress requires Node.js 20 or newer; use Node.js 24 for framework development and Cloudflare Pages builds.
- If I want a report, proposal, paper, book, teaching note, or other page-based artifact, follow `openpress-create-pages`.
- If I want a slide deck, follow `openpress-create-slide`.
- For a fresh workspace shell, a creation skill may run `npm create @open-press . -- --type pages` or `--type slides` after intake. Page and slide skills extend the matching generated Press. Do not use create as an upgrade or migration tool.
- After creating the source tree, run `npm run build`.

Working in an existing workspace:
- Edit source files under `press/`, project-owned `.agents/skills/`, and root config files. Treat `.claude/skills/` entries installed by the skills tool as managed links.
- Do not hand-edit generated output under `public/openpress/`, `dist-react/`, `.deploy/`, or `.openpress/`. The only exception is the temporary `.openpress/review/current.json` handoff written and removed by `openpress-collaborate`.
- Treat framework code under `node_modules/@open-press/` as read-only.

Routing:
- `openpress-collaborate` owns the human-agent review mode for existing authored content: answer, propose, refresh, apply, or direct edit.
- `openpress-create-pages` owns page-based artifact creation, source hierarchy, MDX structure, first theme, and page components.
- `openpress-create-slide` owns slide deck creation, slide Press Tree generation, `DeckSlide`, protocol layouts, reusable UI primitives, Tailwind semantic styling, and deck structure.
- `openpress-plugins` owns recommending, verifying, and adapting external diagramming, visual tools, and writing helpers.
- `openpress` owns CLI lifecycle, validation, rendering, PDF/image/Word export, doctor, and routing.
- `openpress-upgrade` owns package upgrades, migration plans, source migrations, and Migration QA loops.
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
npx --yes skills@1.5.18 add <owner>/<repo> --skill '*' --agent universal claude-code --yes
```

The skill loads automatically whenever its `description` matches the current request. `openpress-create-pages` resolves portable writing skill conflicts in this order:

1. Explicit user instruction
2. Workspace memory / `press/design.md`
3. Document brief
4. `openpress-create-pages` structural decisions
5. Portable skills (your custom skill lands here)

To share a skill across projects, push it to a public GitHub repo and install it
with the pinned command above. Use `npm run openpress:skills` later to refresh
the exact tracked skills from `skills-lock.json`.
