---
name: qdoc-document-hierarchy
description: Use when planning, restructuring, or extending a QDoc long-form document, handout, textbook, study guide, reference manual, or course note that needs a stable H1/H2/H3/H4 semantic hierarchy, table of contents depth, reader outline depth, chapter grouping, appendix placement, or multi-unit document structure.
---

# QDoc Document Hierarchy

Use this skill with `qdoc-writing` before changing the semantic hierarchy of a long-form QDoc document. It defines only the document skeleton: visible heading levels, formal TOC depth, reader outline depth, chapter grouping, and appendix placement.

This skill does not own learner-facing prose, visual style, figure design, or component implementation. `qdoc-writing` still owns document-level orchestration, `qdoc-design` owns visual style, diagram skills own diagram content rules, and subject-specific writing skills own the explanation strategy.

Use `qdoc` for CLI inspection, source search, and validation. This skill decides the heading model; it does not decide the command surface.

## Hierarchy Contract

Map document content to headings by semantic role:

| Level | Meaning | QDoc behavior |
| --- | --- | --- |
| `#` | Whole document title only | Use on cover or document identity; do not use inside normal content files |
| `##` | Formal chapter / document unit | Enters the formal TOC; starts a major reader section |
| `###` | Major topic group inside a chapter | Enters the formal TOC; use for concepts readers should scan before reading |
| `####` | Concrete algorithm, operation, theorem, variant, or worked procedure | Enters reader outline/bookmarks; normally stays out of the formal TOC |
| Body blocks | Concept, table, figure, pseudocode, code, trace, practice | Do the explanation work; do not encode hierarchy by font size alone |

When a document becomes a full book or multi-unit reference, avoid promoting every algorithm to `##`. A stable long-form document usually has few H2 chapters, several H3 topic groups, and many H4 implementation items.

## H4 Granularity

Use H4 for a complete teachable unit, not for every local teaching block.

- Keep one H4 when the blocks share the same operation, invariant, or algorithm.
- Merge adjacent H4s when one only adds the table, figure, trace, pseudocode, or C-like code for the same topic.
- Do not make repeated local `小測驗` headings into H4; use a bold paragraph or exercise block unless the whole section is an assessment chapter.
- Prefer 3-7 H4 items under one H3. If an H3 needs many more, first check whether the H3 should split or whether the H4s are too granular.
- Keep terminology natural for programming topics. Use names such as `Linked List`, `Linked Queue`, `Header Node`, or `BST` when those are clearer than forced translation.

## Authoring Workflow

1. Identify the whole document scope from the user request and existing metadata.
2. Choose H2 chapters first. For source material already organized by chapters or units, one source chapter usually becomes one H2, such as `CH4 Linked List`, `CH5 Tree`, `CH6 Graph`, `CH7 Sorting`.
3. Group each H2 into H3 topic groups that belong in the public TOC.
4. Move named algorithms, operations, theorem items, and implementation variants to H4.
5. Merge H4s that only separate conceptual explanation from the worked trace or implementation of the same operation.
6. Keep explanations, edge cases, teaching notes, and reasons in body prose, tables, figures, or code blocks.
7. Put internal planning, style-pack rules, and agent guidance in `skills/`, `memory/`, or `document/design.md`, not in public `document/content/`.
8. When hierarchy changes also affect explanation order, exercise design, captions, or student-facing wording, hand that part back to `qdoc-writing` and the appropriate portable writing skill.

## File Strategy

QDoc scans `document/content/*.md` as a flat sorted directory. File boundaries are editing boundaries, not necessarily book hierarchy boundaries.

- A long H2 chapter may span multiple files.
- Only the first file of that chapter needs the `##` heading.
- Later files in the same chapter may start with `###` or `####`.
- Use filename prefixes for ordering, not for visible hierarchy.
- Frontmatter `title:` is an editor/source label; visible book structure is defined by Markdown headings.

## Data Structures Notes

When the document is a data structures note, read `references/data-structures-outline.md` for the preferred H2/H3/H4 model. Treat it as structure memory, not public content.

## Completion Check

Before finishing a structure pass:

- scan headings with `rg -n '^#{1,4} ' document/content`;
- confirm public TOC is not overloaded with H4-level algorithm names;
- confirm reader outline H4s are not dominated by tiny code fragments, figure labels, or repeated quiz labels;
- confirm H2 chapters can scale when new units are added;
- run QDoc validate/render after content changes.
