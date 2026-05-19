---
name: teaching-notes-writing
description: Use when drafting or revising learner-facing teaching notes, course handouts, worksheets, study guides, or tutorial chapters that need comparisons, step-by-step explanation, quick practice, worked examples, or answer appendices.
---

# Teaching Notes Writing

Teaching notes are for learners who are still building the mental model. This skill owns explanation strategy, examples, practice design, and answer flow.

## Responsibilities

- Start from the learner's likely mental model.
- Compare nearby ideas before introducing formal rules.
- Show procedures step by step with visible state changes.
- Put reasons, warnings, and interpretation in prose rather than overloading figures.
- Add practice surfaces that match the chapter content.
- Put answers after the learner has had a chance to try.

## Boundaries

- `qdoc-writing` owns QDoc source boundaries and public-content hygiene.
- `qdoc-document-hierarchy` owns H1/H2/H3/H4 structure for long-form QDoc notes.
- `qdoc-diagram-drawing` owns diagram semantics.
- `qdoc-design` owns visual style and component implementation.
- This skill owns learner-facing explanation and exercise design.

## Core Pattern

1. Begin from a concrete learner problem.
2. Compare two nearby concepts, states, or representations.
3. Show the operation or idea step by step.
4. Add a small check, trace, or practice task.
5. Place answers or full solutions after the attempt surface.

## Learner Boundary

Rendered teaching pages should speak to the learner, not the teacher or agent.

- Do not include teacher-only reminders, production notes, internal rationale, or style-pack commentary.
- Keep internal rules in skills, design docs, or source references.
- Use consistent terms and variable names across prose, diagrams, tables, and code.

## When To Read References

- Read `references/teaching-patterns.md` for comparison writing, explanation order, practice question types, and answer placement.
- Read `references/programming.md` when teaching code, pseudocode, data structures, pointer diagrams, memory state, or program traces.
