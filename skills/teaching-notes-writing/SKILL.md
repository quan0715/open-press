---
name: teaching-notes-writing
description: Use when drafting or revising learner-facing teaching notes, course handouts, worksheets, study guides, or tutorial chapters that need comparisons, step-by-step explanation, quick practice, worked examples, or answer appendices.
---

# Teaching Notes Writing

Teaching notes are written for learners who are still building the mental model. The job is to make comparison, sequence, and practice visible without turning the page into teacher notes or production notes.

## Core Pattern

Teach by controlled comparison:

1. Start from the learner's likely mental model.
2. Compare two nearby ideas, states, or representations.
3. Show the operation step by step.
4. Add a small check or practice task.
5. Put answers or full solutions after the learner has had a chance to try.

## When To Use

Use this skill for:

- technical or conceptual handouts;
- course notes that compare similar ideas;
- beginner-friendly explanations that need setup before formal notation;
- worked examples with diagrams, formulas, code, tables, or state traces;
- exercises, quizzes, bug-finding tasks, and answer appendices.

Do not use it for marketing copy, formal research argument, API reference, or internal implementation notes unless the task is explicitly to turn them into learner-facing material.

## Learner Boundary

Rendered teaching pages should speak to the learner, not the teacher or agent.

- Explain what the learner should notice, trace, calculate, compare, or try.
- Do not include teacher-only reminders, production notes, internal rationale, agent instructions, style-pack notes, or design-system commentary.
- When an internal rule matters, keep it in a skill, design document, or source reference instead of the student page.

QDoc-wide public-content boundaries belong to `qdoc-writing`; this skill adds learner-specific writing judgment.

## Comparison Writing

Use comparison when a concept is abstract, easily confused, or depends on representation.

Good comparison surfaces:

| Surface | Best for | Example |
| --- | --- | --- |
| Paragraph | One conceptual difference | Array stores by index; linked list stores by links. |
| Table | Several dimensions | entry pointer, insertion cost, deletion cost, traversal rule |
| Figure | Spatial or directional relationship | before/after links, memory layout, pointer movement |
| State trace | Repeated algorithm steps | loop variables, stack contents, polynomial merge |
| Code block | Exact syntax or implementation | `p = p->next`, not `p++` |

Avoid comparing too many things at once. If a table grows past one reading job, split it into a concept table and a step trace.

## Explanation Order

For a new concept, prefer this order:

1. Why the concept appears.
2. A small concrete example.
3. The representation or vocabulary.
4. A diagram or table showing the relationship.
5. The formal rule, formula, or code.
6. One common mistake and how to detect it.
7. A quick practice question.

For a procedure, prefer this order:

1. Initial state.
2. Each state-changing step.
3. Final state.
4. Reason the order matters.
5. Short code or formula that matches the steps.
6. Practice trace with a different input.

## Figures, Tables, And Prose

Do not make one visual do every job.

- Put visual relationships in diagrams.
- Put dense comparisons, repeated states, and many cases in tables.
- Put reasons, warnings, edge cases, and interpretation in prose.
- Put exact syntax, formulas, and runnable fragments in code or math blocks.
- Keep captions short; they name what to observe, not why it matters.

When a figure starts to need sentences inside the image, split the explanation out of the visual. Use `qdoc-diagram-drawing` for diagram-specific content rules.

## Code And Formula Teaching

When teaching a long program or derivation, do not drop the full version first.

1. State the problem the code or formula solves.
2. Show the data shape, variables, or notation first.
3. Explain helper functions or intermediate equations one at a time.
4. Present the core algorithm or transformation after the pieces are known.
5. Add the complete version at the end.
6. Show a small expected output, final value, or state trace.

Code comments should explain non-obvious intent, not restate every assignment.

## Practice Design

Each major chapter should end with a small practice surface when the document is meant for learning.

Useful question types:

- quick recall: definition, role, or stopping condition;
- comparison: choose which representation fits a case;
- trace: fill a state table or draw the next state;
- bug finding: identify the wrong order, missing update, or invalid assumption;
- implementation: write a short function or missing line;
- explanation: state why a step must happen before another step.

Answers can be inline only for tiny checks. For chapter quizzes, prefer an answer appendix before the back cover so students can try first and verify later.

## Terminology

- Introduce important terms once, then reuse them consistently.
- If learners will see an English term in code, exams, tools, or documentation, keep the English term and bridge it with the local language on first mention.
- Use the same variable names across prose, diagrams, tables, and code.
- Do not rename a pointer, variable, concept, or state label just for variety.

## When To Read References

- Read `references/programming.md` when the teaching material includes code, pseudocode, data structures, pointer/memory diagrams, program traces, or long implementation examples.

## Completion Check

Before finishing a teaching-writing pass:

- confirm every section has a learner-facing reason to exist;
- check that comparisons are not overloaded;
- check that diagrams, tables, prose, code, and math each have one job;
- confirm practice questions match the chapter content;
- keep answer material out of the learning flow unless the user asked for worked solutions inline;
- run the QDoc validation/render workflow when editing a QDoc document.
