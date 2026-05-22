---
name: teaching-notes-writing
description: Use when drafting or revising learner-facing teaching notes, course handouts, worksheets, study guides, or tutorial chapters that need comparisons, step-by-step explanation, quick practice, worked examples, or answer appendices.
---

# Teaching Notes Writing

This is a **portable writing skill**: usable standalone, and loaded by `openpress-writing` when content is learner-facing teaching material (handouts, worksheets, study guides, tutorial chapters). `openpress-writing` owns the trigger and conflict-resolution rules.

Teaching notes are for learners who are still building the mental model. This skill provides **suggested content skeletons**, explanation strategies, examples, practice ideas, and answer-flow guidance. It does not mandate one rigid chapter template.

## Responsibilities

- Start from the learner's likely mental model.
- Compare nearby ideas before introducing formal rules.
- Show procedures step by step with visible state changes.
- Put reasons, warnings, and interpretation in prose rather than overloading figures.
- Suggest practice surfaces that match the chapter content.
- Put answers after the learner has had a chance to try.
- Suggest when a structure, relationship, or state change should become a diagram; use `openpress-diagram-drawing` for the actual diagram semantics.

## Boundaries

- `openpress-writing` owns open-press source boundaries, public-content hygiene, and H1/H2/H3/H4 structure (hierarchy is a section within `openpress-writing`).
- `openpress-diagram-drawing` owns diagram semantics.
- `openpress-design` owns visual style and component implementation.
- `openpress` owns CLI, validation/export/render commands, and source/generated boundaries.
- This skill owns learner-facing explanation suggestions and exercise-design patterns only.

## Suggested Skeleton

Use this as a starting skeleton, not a required template:

1. Start from the learner's concrete problem or confusion.
2. Compare nearby concepts, states, or representations.
3. Show the operation or idea step by step.
4. Add one small check, trace, or practice task when it helps.
5. Put full answers after the learner has had a chance to attempt.

If the concept depends on spatial structure, ownership, arrows, state transitions, or before/after relationships, hand the visual semantics to `openpress-diagram-drawing`.

## Learner Boundary

Rendered teaching pages should speak to the learner, not the teacher or agent.

- Do not include teacher-only reminders, production notes, internal rationale, or style-pack commentary.
- Keep internal rules in skills, design docs, or source references.
- Use consistent terms and variable names across prose, diagrams, tables, and code.

## When To Read References

- Read `references/teaching-patterns.md` for comparison writing, explanation order, practice question types, and answer placement.
- Read `references/programming.md` when teaching code, pseudocode, data structures, pointer diagrams, memory state, or program traces.
