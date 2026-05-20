# Programming Teaching Reference

Use this reference with `teaching-notes-writing` when the learning material teaches programming, algorithms, data structures, memory state, or code tracing.

## Long Code Teaching Flow

When a section introduces a long program, avoid dropping the full code block first. Use this order:

1. State the problem the code solves.
2. Show the data shape first, usually a `struct`, record, class, type definition, or table of variables.
3. Explain helper functions one at a time.
4. Present the core algorithm or function after students know the supporting pieces.
5. Add a complete version at the end, including `main` or an equivalent entry point when the language uses one.
6. Show a small expected output or state trace so students know how to verify the program.

## Heading Hierarchy For Course Notes

- Use `#` only for the whole document title, usually on the cover or in metadata.
- Use `##` for formal chapters such as `CH5 Tree`, `CH6 Graph`, or `CH7 Sorting`.
- Use `###` for major topic groups that should appear in the formal table of contents, such as `Traversal`, `BST`, `MST`, or `Sorting Algorithms`.
- Use `####` for concrete algorithms, operations, theorem items, or implementation variants, such as `BST delete`, `left rotate`, `quick sort (non-recursive)`, or `Theorem 1`.
- Do not promote every algorithm to `##`; a long course note needs stable hierarchy more than large titles.

## Code Block Rules

- A code block should have a clear local purpose before it appears.
- Prefer several short code blocks for teaching, then one complete code block for integration.
- Keep identifiers consistent across prose, tables, diagrams, and code.
- Use comments only when they explain a non-obvious step. Do not comment every assignment.
- When dynamic memory or external resources are involved, include cleanup in the complete version if the language requires it.
- If a simplified example omits error handling or cleanup, state the omission explicitly. Prefer not omitting them in final code.

## Pseudocode Rules

- Pseudocode should look like an algorithm, not a compressed prose note.
- Include `Algorithm`, `Input`, and `Output` when the block represents a complete procedure.
- Use indentation to show loops and branches.
- Name operations by intent, such as `append_term`, `poly_add`, `clear`, or `return`, instead of vague verbs.
- Keep pseudocode close enough to implementation that students can map it back to the final program.

## Programming Diagram And Table Pairing

- Use markdown tables for dense comparisons, coefficient tables, state traces, and step-by-step logs.
- Use custom open-press components for visual relationships: node links, pointer movement, memory layout, before/after states, and flow diagrams.
- Do not combine a large table and a large diagram into one oversized image. Split them so each surface has one reading job.
- Full-width figures are acceptable when a diagram contains multiple linked nodes or state rows.
- Use `openpress-diagram-drawing` for the rule that diagrams contain only visual information and explanations stay in prose.

## Technical Term Usage

- Do not force every programming term into Chinese.
- Use common English terms when students will also see them in code, exams, online judges, IDEs, or English documentation.
- For major concepts, use English first with a local-language bridge on first mention: `Linked List（鏈結串列）`, `Singly Linked List（單向鏈結串列）`, `Doubly Linked List（雙向鏈結串列）`, `Circular Linked List（環狀串列）`, `Header Node（開頭空白節點）`.
- After a concept is established, keep the English term in headings, tables, diagrams, and code-adjacent prose when that is what students will see elsewhere.
- Use the local language when explaining reasoning, constraints, and student-facing guidance.

## Completion Check

Before finishing a programming teaching pass:

- verify long code sections have both breakdown and complete integration;
- check that pseudocode, code, diagrams, and tables use the same identifiers;
- confirm examples include an expected output, final state, or trace when useful;
- check that simplified code does not silently omit cleanup or safety checks students need to learn.
