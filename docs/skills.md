# Skill Index

open-press ships small, focused skills. **`openpress` is the system-level entry point** for any agent working in an open-press workspace; writing and style-pack skills reference it for CLI, validation, source/generated boundaries, and verification depth.

## How skills get into your workspace

`npx @open-press/cli init` installs the framework skills under both `.claude/skills/<name>/` (Claude Code, Cursor) and `.agents/skills/<name>/` (Codex CLI, generic agents). Most AI tools auto-discover from one of those paths.

If you're not using an SKILL-aware agent (e.g. GitHub Copilot Chat), paste the system prompt from the [README](../README.md#copilot-system-prompt) at the start of a session.

## Skill catalog

### System operation

| Skill | Use when |
| --- | --- |
| `openpress` | Operating the CLI, inspecting status, searching/replacing source text, validating/exporting/rendering, local workbench review, managing `@openpress-comment` markers, choosing which specialist owns a task. |
| `openpress-init` | Starting a new document project: intake questions, style-pack recommendation, metadata gathering, running `init`, handing off to writing. |
| `openpress-update` | Upgrading an existing workspace to a new framework release: CHANGELOG-driven migrations, post-upgrade verification. |
| `openpress-deploy` | Preparing deploy config, running preflight / dry-run, publishing only after explicit confirmation naming the target Cloudflare Pages project. |

### Writing

| Skill | Use when |
| --- | --- |
| `openpress-writing` | Planning, drafting, rewriting, or restructuring document content. Owns audience, narrative, captions, factual boundaries. Loads portable writing skills based on content type. |
| `openpress-document-hierarchy` | Designing H1/H2/H3/H4 structure, TOC depth, reader outline, chapters, appendices. |
| `openpress-diagram-drawing` | Designing diagram semantics: nodes, arrows, labels, state changes — what belongs inside a figure vs in surrounding prose. |
| `teaching-notes-writing` | Learner-facing notes, examples, practice questions, answer appendices. Loaded automatically by `openpress-writing` for teaching content. |
| `chinese-ai-writing-polish` | Polishing Traditional Chinese professional writing — removes AI-like phrasing, passive packaging, reverse-construction over-use. Loaded automatically by `openpress-writing` for 繁中 content. |

### Visual / structural

| Skill | Use when |
| --- | --- |
| `openpress-design` | Revising page rhythm, theme CSS, components, covers, figures, tables, charts, PDF-safe layout. |
| `openpress-style-pack-contributor` | Creating or improving a bundled style pack under `skills/<pack>/starter/`. |

### Bundled style packs

| Pack | Use when |
| --- | --- |
| `editorial-monograph` | Starting from the built-in hairline A4 editorial style (proposals, whitepapers, monographs). |
| `claude-document` | Starting from the built-in warm Claude-like A4 document style (working notes, briefs, research summaries). |

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
# Create a new skill in the workspace.
mkdir -p .claude/skills/my-company-tone
cat > .claude/skills/my-company-tone/SKILL.md <<'EOF'
---
name: my-company-tone
description: Use when writing for FooBar product. Enforces concrete verbs, no marketing fluff, metrics with source.
---

# My Company Tone

## Rules

- ...
EOF

# Mirror for Codex / generic agents.
cp -r .claude/skills/my-company-tone .agents/skills/my-company-tone
```

The skill loads automatically whenever its `description` matches the current request. `openpress-writing`'s priority list resolves conflicts:

1. Explicit user instruction
2. Workspace memory / `document/design.md`
3. Document brief
4. `openpress-writing` structural decisions
5. Portable skills (your custom skill lands here)

To share a skill across projects, push it to a public GitHub repo and others can `git clone --depth 1 <url> .claude/skills/<name>`. A first-party SKILL distribution tool may land in a future release.
