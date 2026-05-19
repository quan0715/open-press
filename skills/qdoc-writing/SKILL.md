---
name: qdoc-writing
description: Use when planning, restructuring, drafting, rewriting, or editing QDoc document content at the document level: audience, narrative, section order, table/figure captions, factual boundaries, and coordination with independent writing skills.
---

# QDoc Writing Skill

QDoc writing is document-level orchestration. It is not a replacement for portable writing skills.

Keep writing skills 可插拔. 不要把中文誤用規則內建 into this skill; load `chinese-ai-writing-polish` or another writing skill through the registry when needed.

## Responsibilities

Decide:

- document purpose and audience fit;
- section sequence and narrative flow;
- paragraph density and transitions;
- when prose should become a table, figure, chart, or callout;
- caption wording and table cell density;
- which claims need user confirmation;
- which portable writing skills should be applied.

## Content Shape

QDoc engine treats `content/` as a flat directory of `*.md` files, scanned alphabetically and dispatched by frontmatter `kind:`. No file shape is enforced by the engine, but a typical document follows this convention:

```
content/
  00-cover.md        kind: cover
  01-toc.md          kind: toc
  02-...md           kind: chapter   (or unspecified — defaults to chapter)
  ...
  99-back-cover.md   kind: back-cover
```

Frontmatter fields each `*.md` may carry:

- `title:` — page heading, also used as `data-page-title`. cover / toc / back-cover read this for their displayed title; if omitted, the engine falls back to English defaults `"Cover"` / `"Contents"` / `"End"`. A Chinese document writes `title: 目錄` etc.
- `kind:` — one of `cover` / `toc` / `chapter` / `back-cover`. Defaults to `chapter` when missing.
- `chapter:` — optional integer; engine auto-increments across chapter pages when missing.
- `slug:` — optional anchor slug; engine derives from filename when missing.

A document does not need every kind. A blank document with just a chapter or two is valid; the engine emits whatever the source provides.

## Document Metadata

Document-level metadata lives in `qdoc.config.mjs`, not in content frontmatter:

- `title` — required; appears in `public/qdoc/document.json` meta and the workbench navbar.
- `subtitle` — optional; navbar second line.
- `organization` — optional; `meta.organization`.
- `workspaceLabel` — optional; workbench top-left chrome. Falls back to `title` when omitted.

The agent should not move document identity into markdown frontmatter — keep it in one place.

## Marking Unfinished Content

The engine does not scan output for placeholder strings. When you leave work-in-progress text in a document, write a marker that is clearly recognisable to both reviewers and grep:

```
[TODO: ...]
[FIX: ...]
[DRAFT: ...]
```

Avoid bare `TODO` / `TBD` / `[必填]` — those collide with legitimate prose in technical / financial / contractual documents. The square-bracket prefix form survives manual review without false positives.

## Public Content Boundary

Rendered QDoc pages are for the document's intended reader. Do not leak production notes or agent-facing instructions into `document/content/`.

Avoid these in public-facing pages unless the document topic is explicitly QDoc, agent workflows, style pack authoring, or design-system documentation:

- agent instructions, review notes, or production rationale;
- `agent`, `skill`, `style pack`, `internal rule`, `design rationale`, or similar meta language;
- teacher-only reminders such as "給老師看的", "之後讓 agent 處理", or "這段是內部規則";
- explanations of how a diagram, style, renderer, or component was produced.

If a rule is useful for future editing, put it in `skills/`, `document/design-system/`, `memory/`, or another non-rendered reference. If a public page must mention the production system because that is the subject, make it reader-facing and factual rather than an instruction to the agent.

Before completing a writing pass on a public document, scan for accidental internal language:

```sh
rg -n '(agent|skill|style pack|內部規則|給老師看|設計理由|production note)' document/content -g '*.md'
```

## Heading Hygiene

Headings are navigation labels. Keep every `##` / `###` heading plain-text and semantic:

- Do not put inline type markup inside heading text: no backtick code spans, `<code>`, `<pre>`, `<strong>`, `<em>`, raw HTML tags, or bold/italic Markdown.
- Move identifiers, formulas, commands, and API names into the paragraph immediately after the heading when they need code styling.
- Prefer conceptual headings over syntax headings. For example, write `### 指標語法的三個層次`, then explain `p`, `*p`, and `p->next` in the body.
- Before completing a writing pass, grep headings for markup characters and clean them up:

```sh
rg -n '^#{1,6}\s+.*(`|<[^>]+>|\*\*|__)' document/content document/design-system -g '*.md'
```

## Formula Writing

QDoc renders LaTeX math through the engine. Use plain Markdown delimiters in the body:

- Inline math: `$x^2$` or `\(x^2\)`.
- Display math: `$$ ... $$` or `\[ ... \]` on their own lines.
- Keep formulas out of headings. Put the concept in the heading and the formula in the paragraph that follows.
- If a formula string should remain literal, wrap it in a code span or code fence.

## Figure And Chart Captions

QDoc owns figure and table numbering. Components and Markdown content should provide only the semantic caption text; the renderer adds `圖 N：` / `表 N：`.

- Keep charts and diagrams pure: the visual body should contain only the data, axes, nodes, arrows, labels that belong to the diagram itself.
- Do not draw `圖 1：`, `Figure 1`, or explanatory prose inside the chart panel.
- Use at most one `<figcaption>` per `<figure>`, place it after the visual body, and keep it bottom-centered through the shared QDoc style system.
- Keep the visible caption to the title-level caption. Put longer explanation in the paragraph before or after the figure.
- Avoid secondary bottom captions such as “同一組資料在兩種結構中的順序來源。” when the body text already explains it.
- For component diagrams, use SVG `<title>` / `<desc>` for accessibility, but let visible numbering and label rendering stay in the shared QDoc caption system.

## Starter Document Writing

Use `spec/qdoc/usage.md` when drafting a new or thin QDoc workspace.

When the user asks to generate a small demonstration document, create a coherent minimum document with:

- cover: title, subtitle, one-sentence promise, short summary;
- TOC: placeholder only, because QDoc injects the real table of contents;
- chapter 1: purpose, audience, and workflow;
- chapter 2: validation, output, and an example table or list;
- back cover: concise closing statement and brand line.

Prefer real user-provided facts. If facts are missing, write neutral operational content about the document workflow instead of inventing organizations, metrics, testimonials, dates, or commitments.

Each chapter file should include at least one `##` heading. The exporter uses those headings to split A4 report pages and build the generated TOC.

## Autonomy

You may rewrite structure and prose without asking for every sentence-level choice when the user intent is clear. Preserve facts and meaning.

Ask the user before:

- inventing or changing numbers;
- adding external claims;
- changing the document audience;
- removing a user-approved argument;
- making legal, financial, medical, or public commitment statements.

## Skill Loading

Browse `skills/` and load the writing skills whose `SKILL.md` description matches the user's task. When multiple skills could apply, resolve conflicts in this order:

1. user preferences (explicit instructions in the current conversation);
2. document brief (frontmatter, README, or content cues);
3. QDoc writing structure rules (this file);
4. portable writing skills (e.g. `chinese-ai-writing-polish`).

There is no registry file gating which skills are "enabled". Skills present in `skills/` are available; selection is by description-matching, not by config.
