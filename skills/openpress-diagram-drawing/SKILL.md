---
name: openpress-diagram-drawing
description: Use when drawing or revising open-press document diagrams, especially concept diagrams, comparison figures, process states, data-structure nodes, pointers, arrows, before/after states, linked lists, stacks, queues, trees, or memory relationship figures.
---

# open-press Diagram Drawing

This skill owns diagram semantics, not visual skin. It decides what the diagram should show and what text belongs inside the figure.

## Core Rule

Draw the relationship, not the explanation.

Figure bodies may contain only spatially meaningful information: object labels, pointer names, field names, axes, legends, short state labels, node values, `NULL`, and operation-order labels.

Move reasons, warnings, edge cases, teaching commentary, and interpretation into surrounding prose or captions.

## Responsibilities

- Choose whether a concept needs a diagram, table, code block, or prose.
- Define nodes, links, arrows, states, labels, and before/after relationships.
- Keep figure text lean and connected to position or direction.
- Prevent diagrams from containing answers, production notes, or caption-like sentences.

## Boundaries

- `openpress` owns validation/render command choice and the source/generated boundary.
- `openpress-create-pages` owns surrounding page explanation, caption wording, page visual skin, typography, CSS, and component implementation.
- `openpress-create-slide` owns slide visual skin, slide components, and deck-level narrative around slide diagrams.
- `teaching-notes-writing` (loaded by `openpress-create-pages`) owns learner-facing practice flow.

## Workflow

1. Identify the diagram job: comparison, process state, relationship snapshot, before/after, operation sequence, traversal trace, or data representation.
2. Choose the surface:
   - diagram for links, ownership, direction, state changes;
   - table for dense comparisons or many trace rows;
   - code block for exact syntax.
3. Draw from semantics first; let style follow.
4. Check whether the diagram can be understood without explanatory sentences inside the visual.

## When To Read References

- Read `references/diagram-patterns.md` for linked-list, circular-list, doubly-list, stack, queue, polynomial, sparse-structure, and tree drawing patterns.
