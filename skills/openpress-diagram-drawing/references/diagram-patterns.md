# Diagram Patterns

## Figure Text

Keep text inside a figure only when it anchors something spatial:

| Keep Inside | Move To Prose |
| --- | --- |
| `Before`, `After`, `插入前`, `插入後` | reasons a step matters |
| `first`, `top`, `prev`, `curr`, `next`, `NULL` | warnings and edge cases |
| field names, axis labels, legends | figure numbering or caption prose |
| short role labels | answers or hidden hints |

## Vocabulary

| Item | Draw As |
| --- | --- |
| data node | box split into fields |
| singly linked node | `data | next`, arrow leaves `next` |
| doubly linked node | `prev | data | next`, forward and backward lanes separated |
| header/dummy node | normal node with `head` or `dummy` role |
| external pointer | label with arrow to a node |
| field link | arrow from field to target node |
| traversal | pointer labels moving between states |
| `NULL` | terminal label or terminator mark |

## Linked List Patterns

Basic list:

- Draw each node as `data | next`.
- Last `next` points to `NULL`.
- Use `first`, `data`, `next`, and `NULL` as figure labels.

Insert after:

- Use two aligned states: `p -> q` and `p -> x -> q`.
- If showing update order, number only changed links:
  1. `x->next = q`
  2. `p->next = x`

Delete after:

- Use two aligned states: `p -> q -> r` and `p -> r`.
- If the removed node remains visible, ghost it or mark it removed.

Reverse:

- Show `prev`, `curr`, and `next` as pointer labels, not data nodes.
- Use a short sequence or table for repeated iterations.

## Circular And Doubly Linked Lists

Circular return links should look intentional:

- route return links outside the node group;
- avoid diagonal clutter over labels;
- for one-node circular lists, draw a small self-loop.

When using `last` as the entry pointer, show both `last` and `last->next`.

Doubly linked lists:

- separate forward and backward lanes;
- insertion between `x` and `y` shows four relationships:
  - `p->prev = x`
  - `p->next = y`
  - `x->next = p`
  - `y->prev = p`

## Stack, Queue, Polynomial, Sparse, Tree

Linked stack:

- `top` points to the first node.
- push is insert-at-front; pop is remove-at-front.

Linked queue:

- `front` points to the next node to delete.
- `rear` points to the last node.
- show both when the invariant depends on both.

Polynomial and sparse structures:

- use tables for dense coefficient arrays or matrix positions;
- use diagrams only for stored nonzero nodes.

Trees:

- label parent/child relationships clearly;
- use traversal diagrams only when node order or pointer movement is the point;
- avoid turning a tree diagram into a paragraph.
