---
name: openpress-writing
description: "Use when planning, restructuring, drafting, rewriting, or editing open-press document content at the document level: audience, narrative, section order, table/figure captions, factual boundaries, and coordination with independent writing skills."
---

# open-press Writing

open-press writing owns the **reader-facing document argument**. It decides what the document should say, in what order, and what facts need confirmation. It is also the **entry point for portable writing skills** (tone, language, genre, teaching).

## Responsibilities

- Define audience, purpose, narrative flow, and section order.
- Rewrite prose, tables, captions, and content transitions.
- Own the `<TableCaption>...</TableCaption>` placement rule (single authoritative definition; style packs link to this skill, not redefine it).
- Decide when prose should become a table, figure, chart, or callout.
- Preserve confirmed facts and mark missing facts explicitly.
- Load portable writing skills based on content type (see triggers below).
- Reference `openpress` for system operations, source/generated boundaries, and verification commands instead of defining them here.

## Boundaries

| Owns | Boundary |
| --- | --- |
| `openpress` | CLI, inspect/search/replace, source/generated boundary |
| `openpress-document-hierarchy` | H1/H2/H3/H4 structure, TOC depth, appendix placement |
| `openpress-design` | theme CSS, visual systems, component styling |
| `openpress-diagram-drawing` | what diagrams show |
| Portable writing skills | language, tone, genre, teaching-specific rules |

Source paths follow `openpress` > Source Boundary. Do not redefine them here.

## Coordination With Hierarchy

When work might change `##` chapter splits, TOC depth, or H4 outline density, **route to `openpress-document-hierarchy` first**, then return here to write the prose. When writing reveals a need to split or merge headings, hand the structural change back to hierarchy.

## Portable Writing Skill Triggers

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
2. Check if hierarchy is affected; if so, coordinate with `openpress-document-hierarchy` first.
3. Load portable writing skills per the trigger table.
4. Rewrite source content without adding unsupported claims.
5. Mark unresolved facts as `[TODO: ...]`, `[FIX: ...]`, or `[DRAFT: ...]`.
6. Ask `openpress` which validation depth and commands are needed after content edits.

## When To Read References

- Read `references/source-and-writing-rules.md` for frontmatter, metadata, unfinished markers, public-content boundaries, heading hygiene, formulas, captions, and starter document rules.
- Read `references/writing-skill-registry.md` when choosing portable writing skills or checking that a writing skill stays out of system operations.
