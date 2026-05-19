---
name: qdoc-writing
description: "Use when planning, restructuring, drafting, rewriting, or editing QDoc document content at the document level: audience, narrative, section order, table/figure captions, factual boundaries, and coordination with independent writing skills."
---

# QDoc Writing

QDoc writing owns the reader-facing document argument. It decides what the document should say, in what order, and what facts need confirmation.

## Responsibilities

- Define audience, purpose, narrative flow, and section order.
- Rewrite prose, tables, captions, and content transitions.
- Decide when prose should become a table, figure, chart, or callout.
- Preserve confirmed facts and mark missing facts explicitly.
- Load portable writing skills for tone, genre, language, or teaching needs.

## Boundaries

- `qdoc` owns CLI command choice, inspect/search/replace, and source/generated boundaries.
- `qdoc-document-hierarchy` owns H1/H2/H3/H4 structure and TOC depth.
- `qdoc-design` owns theme CSS, visual systems, and component styling.
- `qdoc-diagram-drawing` owns what diagrams show.
- Portable writing skills own language, tone, genre, and teaching-specific rules.

## Source Boundary

Edit canonical source files only:

- main content: `document/content/*.md`, or `content/*.md` in an initialized workspace;
- document identity: `qdoc.config.mjs`;
- generated output: do not hand-edit `public/qdoc/`, `dist-react/`, or `.deploy/`.

## Workflow

1. Identify audience, goal, fixed facts, and missing facts.
2. Choose any portable writing skills needed for the content type.
3. Rewrite source content without adding unsupported claims.
4. Mark unresolved facts as `[TODO: ...]`, `[FIX: ...]`, or `[DRAFT: ...]`.
5. Ask `qdoc` which validation depth is needed; normally run export and validate after content edits.

## When To Read References

- Read `references/source-and-writing-rules.md` for frontmatter, metadata, unfinished markers, public-content boundaries, heading hygiene, formulas, captions, and starter document rules.
- Read `references/writing-skill-registry.md` when choosing or resolving portable writing skills.
