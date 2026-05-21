# Skill Index

open-press uses small, focused skills instead of one giant instruction file. **`openpress` is the system-level entry point**; writing and style-pack skills reference it for CLI, validation, source/generated boundaries, and verification depth.

If your agent does not auto-discover skills, point it at `skills/openpress/SKILL.md`.

## Categories

| Category | Skills | Scope |
| --- | --- | --- |
| System operation | `openpress`, `openpress-init`, `openpress-update`, `openpress-deploy` | Run lifecycle (init / update / deploy) and day-to-day operations: inspect / search / replace source, validate / export / render / PDF, manage `@openpress-comment` markers. |
| Writing | `openpress-writing`, `openpress-document-hierarchy`, `openpress-diagram-drawing`, `teaching-notes-writing`, `chinese-ai-writing-polish` | Plan structure, prose, captions, diagrams, learning flow, language quality. These skills do not own CLI or generated-output rules. |
| Style pack | `openpress-style-pack-contributor`, `editorial-monograph`, `claude-document` | Bundled visual starters and their design scope. Use `openpress` for applying packs and choosing validation commands. |

## Use-when reference

| Skill | Use When |
| --- | --- |
| `openpress` | Operating the open-press CLI, inspecting status, searching/replacing source text, validating/exporting/rendering, local workbench review, managing `@openpress-comment` markers, choosing which specialist skill owns the task. |
| `openpress-init` | Starting a new document project: intake questions, style-pack recommendation, metadata gathering, running `init`, handing off to writing. |
| `openpress-update` | Upgrading an existing workspace to a new framework release: CHANGELOG-driven migrations, post-upgrade verification. |
| `openpress-writing` | Planning, drafting, rewriting, or restructuring document content. |
| `openpress-document-hierarchy` | Designing H1/H2/H3/H4 structure, TOC depth, reader outline, chapters, appendices. |
| `openpress-design` | Revising page rhythm, theme CSS, components, covers, figures, tables, charts, PDF-safe layout. |
| `openpress-diagram-drawing` | Designing diagram semantics: nodes, arrows, labels, state changes, what belongs inside a figure. |
| `openpress-deploy` | Preparing deploy config, running preflight / dry-run, publishing only after explicit confirmation. |
| `openpress-style-pack-contributor` | Creating or improving a bundled style pack under `skills/<pack>/starter/`. |
| `editorial-monograph` | Starting from the built-in hairline A4 editorial style (proposals, whitepapers, monographs). |
| `claude-document` | Starting from the built-in warm Claude-like A4 document style (working notes, briefs, research summaries). |
| `teaching-notes-writing` | Writing learner-facing notes, examples, practice questions, answer appendices. |
| `chinese-ai-writing-polish` | Polishing Traditional Chinese professional writing and removing AI-like phrasing. |

## Example agent prompts

Once a skill-aware agent (Claude Code, Codex CLI) is loaded into the workspace, the easiest interaction is plain language. The agent loads the relevant SKILL.md automatically.

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

For tools that do not auto-load skills (e.g. Copilot in VS Code), see the system prompt in the project README.
