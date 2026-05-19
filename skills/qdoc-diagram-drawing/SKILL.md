---
name: qdoc-diagram-drawing
description: Use when drawing or revising QDoc document diagrams, especially concept diagrams, comparison figures, process states, data-structure nodes, pointers, arrows, before/after states, linked lists, stacks, queues, trees, or memory relationship figures.
---

# QDoc Diagram Drawing

This skill governs diagram content, not visual skin. It decides what to draw, what labels belong inside the figure, how arrows express relationships or state, and when to move explanation into prose or tables. Rendering aesthetics belong to `qdoc-design`.

## Core Rule

Draw the relationship, not the explanation.

The figure body should contain only visual information needed to read the diagram: object labels, axes, state labels, pointer names, field names, node values, `NULL`, operation order, short role labels, or other labels tied to position, direction, grouping, or scale. Reasons, warnings, edge cases, teaching commentary, and interpretation belong in the paragraph before or after the figure.

This rule applies to all QDoc diagrams, not only programming diagrams.

## Workflow

1. Identify the diagram job:
   - comparison: what is different and what stays aligned;
   - process state: what changes between steps;
   - relationship snapshot: what points to what;
   - before/after state: what changed;
   - operation sequence: which pointer updates happen in what order;
   - traversal trace: where the cursor moves;
   - data representation: which fields store which values.
2. Choose the right surface:
   - use a diagram for links, direction, ownership, and state changes;
   - use a markdown table for dense comparisons, coefficient arrays, traces, or many rows;
   - use code blocks for exact statements;
   - split a complex image into table + diagram when either one becomes crowded.
3. Build from semantics:
   - nodes, fields, pointers, links, sentinels, and terminal states come first;
   - layout and style follow the data relationship.
4. Keep the figure body lean:
   - no explanatory sentences;
   - no duplicate paragraph text;
   - no visible `圖 N：`, `Figure N`, or caption-like prose inside the visual panel;
   - no answers or hidden hints inside review-question diagrams.
5. Verify by reading only the diagram:
   - the reader should see the objects, directions, groups, and changed relationships without reading a long caption.

## Generic Figure Text Rules

Use text inside a figure only when it anchors something spatial:

| Figure text | Keep inside the figure? | Reason |
| --- | --- | --- |
| `Before` / `After`, `插入前` / `插入後` | Yes | State labels tell the reader which row or panel they are reading. |
| `first`, `top`, `prev`, `curr`, `next`, `NULL` | Yes | These labels identify pointers, fields, or terminal states. |
| Axis labels, legends, field names, short role labels | Yes | They are part of decoding the visual structure. |
| "如果先改這條線會失去入口" | No | This is interpretation; put it in prose. |
| "同一組資料在兩種結構中的順序來源" | No | This is caption/body explanation; keep the visual pure. |
| "圖 1：..." | No | QDoc owns figure numbering and bottom-centered captions. |

If removing a sentence from the figure makes the figure unclear, the diagram is probably doing too much. Split it into a smaller figure plus a paragraph, table, or code block.

## Diagram Vocabulary

| Item | Draw As | Content Rule |
| --- | --- | --- |
| Data node | Box split into fields | Show value and pointer fields only. |
| Singly linked node | `data | next` | Arrow leaves the `next` field. |
| Doubly linked node | `prev | data | next` | Separate forward and backward links so they do not overlap. |
| Header / dummy node | A normal node with `head` / `dummy` role | Make clear it is an entry point, not data. |
| External pointer | Label with arrow to a node | Use names from code: `first`, `last`, `top`, `front`, `rear`, `prev`, `curr`, `next`. |
| Field link | Arrow from a field to a target node | The arrow means stored address, not movement. |
| Traversal | Pointer labels moving between states | Do not reuse the same arrow style to mean both storage and traversal unless labels distinguish them. |
| `NULL` | Terminal label or terminator mark | It is an endpoint, not another data node. |

## Linked List Patterns

### Basic Singly Linked List

Draw each node as `data | next`. The chain arrow should originate from the `next` field and enter the next node horizontally. The last `next` points to `NULL`.

Good figure labels:

- `first`
- `data`
- `next`
- `NULL`

Move this kind of text to prose:

- why `p != NULL` is the stopping condition;
- why `p++` is wrong for linked nodes;
- what happens if a pointer is not checked.

### Insert After

Use two aligned states:

- `插入前`: `p -> q`
- `插入後`: `p -> x -> q`

Preserve `p` and `q` positions between states when possible. Put `x` between them in the after state. If showing update order, number only the two changed links:

1. `x->next = q`
2. `p->next = x`

Do not put the reason inside the figure. Explain in prose that reversing the order may lose the original `q` entry.

### Delete After

Use two aligned states:

- `刪除前`: `p -> q -> r`
- `刪除後`: `p -> r`

If the removed node remains visible, mark it as removed or ghosted and stop its arrow from implying it is still reachable. Explain `free(q)` timing outside the diagram.

### Reverse

Show `prev`, `curr`, and `next` as pointer labels, not as new data nodes. Use a short sequence or table for repeated loop iterations. The diagram should show the current iteration only.

## Circular Links

Circular return links should be visibly intentional and should not look like a stray diagonal line.

Use an orthogonal or rounded U-shaped return path:

- leave the last node horizontally;
- route outside the node group;
- return horizontally into the first node or `head`;
- keep the return path away from labels and node text.

For a one-node circular list, draw a small self-loop that exits and re-enters the same node without covering the label.

When using `last` as the entry pointer, draw both:

- `last` pointing to the tail node;
- `last->next` pointing to the first data node.

## Doubly Linked Lists

Draw forward and backward links as two separated lanes. Never place both arrows on exactly the same line.

Insertion between `x` and `y` should make four relationships visible:

- `p->prev = x`
- `p->next = y`
- `x->next = p`
- `y->prev = p`

Deletion should show the neighboring nodes reconnecting around `x`. The figure may label `x` as removed, but the reason for reconnecting before `free(x)` belongs in prose.

## Stack And Queue Diagrams

For a linked stack:

- `top` points to the first node;
- push is an insert-at-front state change;
- pop is a remove-at-front state change.

For a linked queue:

- `front` points to the next node to delete;
- `rear` points to the last node;
- enqueue changes the tail link and `rear`;
- dequeue changes `front`, and may also change `rear` when the queue becomes empty.

Show `front` and `rear` simultaneously when both are part of the invariant.

## Polynomial And Sparse Structures

Do not draw dense coefficient tables as node diagrams. Use a markdown table for array or matrix positions, then use a diagram only for stored nonzero nodes.

For polynomial linked lists, each node should show:

- `coef`
- `expo`
- `next`

If a term cancels to zero, show the resulting node sequence without that term; explain the cancellation in prose or in the state-trace table.

## Component Data Shape

Prefer component data that describes program semantics, not pixels:

```json
{
  "states": [
    {
      "label": "插入前",
      "nodes": [{ "id": "p", "label": "p" }, { "id": "q", "label": "q" }],
      "links": [{ "from": "p.next", "to": "q" }],
      "pointers": [{ "label": "p", "node": "p" }]
    }
  ]
}
```

Good fields:

- `nodes`, `fields`, `links`, `pointers`, `states`, `steps`, `role`, `loopToFirst`, `leftNull`, `rightNull`.

Avoid making authors specify `x`, `y`, `left`, or `top` unless the renderer truly needs an escape hatch.

## Geometry Checks

- Arrows should terminate at the object or field they mean.
- Arrowheads must not cover text, node dots, or field dividers.
- Return loops must not cross through nodes.
- Multiple pointer labels should be staggered vertically.
- Same logical node should keep the same label across before/after states.
- Before/after rows should be aligned unless the operation itself changes order.
- The figure should not depend on styling alone; labels, arrow direction, and object positions must carry the meaning.

## Public Document Boundary

Keep internal design rationale out of rendered content. The student-facing page may say what changed and how to trace it; it should not describe why the diagram component was designed that way.

## Completion Check

Before finishing a diagram pass:

- inspect every figure for explanatory sentences inside the visual body;
- confirm captions are short and do not duplicate body prose;
- check that loops and arrows do not cross labels or nodes;
- verify tables and diagrams are split when density is high;
- run QDoc validation and render the document.
