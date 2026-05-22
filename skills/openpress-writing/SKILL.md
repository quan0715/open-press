---
name: openpress-writing
description: "Use when planning, restructuring, drafting, rewriting, or editing open-press document content: audience, narrative, section order, H1/H2/H3/H4 hierarchy, TOC depth, appendix placement, table/figure captions, factual boundaries, and coordination with portable writing skills (繁中, teaching notes)."
---

# open-press Writing

open-press writing owns the **reader-facing document argument** — what the document says, in what order, with which heading structure, and what facts need confirmation. It is also the **entry point for portable writing skills** (tone, language, genre, teaching).

## Responsibilities

- Define audience, purpose, narrative flow, and section order.
- Decide H1/H2/H3/H4 structure, formal TOC depth, reader outline depth, and appendix placement (see **Hierarchy** below).
- Rewrite prose, tables, captions, and content transitions.
- Own the `<TableCaption>...</TableCaption>` placement rule (single authoritative definition; style packs link to this skill, not redefine it).
- Decide when prose should become a table, figure, chart, or callout.
- Preserve confirmed facts and mark missing facts explicitly.
- Load portable writing skills based on content type (see triggers below).
- Reference `openpress` for system operations, source/generated boundaries, and verification commands instead of defining them here.

## Boundaries

| Owns | Boundary |
| --- | --- |
| `openpress` | CLI, inspect/search/replace, source/generated boundary, framework upgrades |
| `openpress-design` | theme CSS, visual systems, component styling |
| `openpress-diagram-drawing` | what diagrams show (semantic content of figures) |
| Portable writing skills | language, tone, genre, teaching-specific rules |

Source paths follow `openpress` > Source Boundary. Do not redefine them here.

---

## Hierarchy

Document skeleton is part of writing: visible heading levels, formal TOC depth, reader outline depth, chapter grouping, and appendix placement. Decide structure **before** drafting prose; tweak prose without breaking structure.

### When to start a hierarchy pass

- Adding or removing an H2 chapter, or splitting one chapter into two.
- Promoting / demoting headings across H2 / H3 / H4.
- Changing TOC depth or reader outline depth.
- Reorganizing appendices, or deciding what becomes an appendix vs an inline section.
- Auditing H4 granularity (too many vs too few sub-sections).

### Hierarchy contract

Map document content to headings by semantic role:

| Level | Meaning | open-press behavior |
| --- | --- | --- |
| `#` | Whole document title only | Use on cover or document identity; do not use inside normal content files |
| `##` | Formal chapter / document unit | Enters the formal TOC; starts a major reader section |
| `###` | Major topic group inside a chapter | Enters the formal TOC; use for concepts readers should scan before reading |
| `####` | Concrete algorithm, operation, theorem, variant, or worked procedure | Enters reader outline/bookmarks; normally stays out of the formal TOC |
| Body blocks | Concept, table, figure, pseudocode, code, trace, practice | Do the explanation work; do not encode hierarchy by font size alone |

When a document becomes a full book or multi-unit reference, avoid promoting every algorithm to `##`. A stable long-form document usually has few H2 chapters, several H3 topic groups, and many H4 implementation items.

### H4 granularity

Use H4 for a complete teachable unit, not for every local teaching block.

- Keep one H4 when the blocks share the same operation, invariant, or algorithm.
- Merge adjacent H4s when one only adds the table, figure, trace, pseudocode, or code for the same topic.
- Do not make repeated local `小測驗` headings into H4; use a bold paragraph or exercise block unless the whole section is an assessment chapter.
- Prefer 3-7 H4 items under one H3. If an H3 needs many more, first check whether the H3 should split or whether the H4s are too granular.
- Keep terminology natural for programming / domain topics. Use names such as `Linked List`, `Linked Queue`, `Header Node`, or `BST` when those are clearer than forced translation.

### Hierarchy workflow

1. Identify the whole document scope from the user request and existing metadata.
2. Choose H2 chapters first. For source material already organized by chapters, one source chapter usually becomes one H2 (e.g. `CH4 Linked List`, `CH5 Tree`).
3. Group each H2 into H3 topic groups that belong in the public TOC.
4. Move named algorithms, operations, theorems, and implementation variants to H4.
5. Merge H4s that only separate conceptual explanation from the worked trace or implementation of the same operation.
6. Keep explanations, edge cases, teaching notes in body prose / tables / figures / code blocks — not as heading levels.
7. Put internal planning, style-pack rules, and agent guidance in `skills/`, `memory/`, or `document/design.md`, not in public chapter MDX.

### File strategy

open-press scans `document/chapters/<NN-slug>/content/*.mdx` in chapter/file order. Chapter directories are durable editing units; file boundaries inside a chapter are editing boundaries, not book hierarchy boundaries.

- A long H2 chapter may span multiple files.
- Only the first file of that chapter needs the `##` heading.
- Later files in the same chapter may start with `###` or `####`.
- Use filename prefixes for ordering, not for visible hierarchy.
- Frontmatter `title:` is an editor/source label; visible book structure is defined by Markdown headings.

For data-structures-style notes, see `references/data-structures-outline.md` for a worked example.

### Completion check (hierarchy)

Before declaring structure done:

- Scan headings (`rg -n '^#{1,4} ' document/chapters -g '*.mdx'`) and confirm the semantic structure matches the intended H2/H3/H4 model.
- Confirm public TOC is not overloaded with H4-level algorithm names.
- Confirm reader outline H4s are not dominated by tiny code fragments, figure labels, or repeated quiz labels.
- Confirm H2 chapters can scale when new units are added.

---

## Portable writing skill triggers

Load a portable skill when content matches these conditions:

| Content type | Load |
| --- | --- |
| Any Traditional Chinese professional content | `chinese-ai-writing-polish` |
| Learner-facing teaching notes, worksheets, study guides, tutorial chapters | `teaching-notes-writing` |
| (future) Business proposal / pitch / investor memo | dedicated portable skill |
| (future) Academic report / paper | dedicated portable skill |

Multiple portable skills may apply (e.g. 繁體中文 teaching notes load both). When two rules disagree, resolve in this order:

1. Explicit user instruction in the current conversation.
2. Workspace memory and preferences (e.g. `memory/AGENTS.md`, `document/design.md`).
3. Document brief or stated purpose.
4. `openpress-writing` structural decisions (audience, narrative, section order).
5. Portable skill rules.

If the conflict changes meaning or claims, ask the user.

## Workflow

1. Identify audience, goal, fixed facts, and missing facts.
2. If hierarchy will be touched, do a structure pass first (see Hierarchy above) before drafting prose.
3. Load portable writing skills per the trigger table.
4. Rewrite source content without adding unsupported claims.
5. Mark unresolved facts as `[TODO: ...]`, `[FIX: ...]`, or `[DRAFT: ...]`.
6. Ask `openpress` which validation depth and commands are needed after content edits.

## When To Read References

- Read `references/source-and-writing-rules.md` for frontmatter, metadata, unfinished markers, public-content boundaries, heading hygiene, formulas, captions, and starter document rules.
- Read `references/data-structures-outline.md` when working on data-structures or algorithm notes (preferred H2/H3/H4 model + chapter scaffolds).
