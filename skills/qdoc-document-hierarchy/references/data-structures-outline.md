# Data Structures Document Outline

Use this outline when expanding a QDoc document from one data-structure topic into a full data structures note. Keep it as authoring memory; do not copy it into public pages as an internal plan.

## Heading Model

- `## CH4 Linked List`
  - `### List、Node 與 Pointer`
  - `### Singly Linked List`
    - `#### Insert`
    - `#### Delete`
    - `#### Search`
    - `#### Reverse`
    - `#### Concatenate`
  - `### Linked Stack 與 Linked Queue`
    - `#### Linked Stack push / pop`
    - `#### Linked Queue add / delete`
  - `### Circular Linked List 與 Header Node`
    - `#### first / last entry design`
    - `#### Circular delete`
    - `#### Header Node operations`
    - `#### Josephus problem`
  - `### Polynomial 與 Sparse Matrix`
    - `#### Polynomial add`
    - `#### Polynomial multiply`
    - `#### Sparse matrix representation`
  - `### Doubly Linked List`
    - `#### Insert`
    - `#### Delete`
    - `#### Circular Doubly Linked List`
  - `### Practice`

Keep chapter-local exercises and mock quizzes inside `### Practice` unless the assessment is large enough to become its own chapter. When the document grows into a multi-chapter book, prefer one of these patterns:

- chapter-local practice inside each H2 chapter;
- a global `## Practice` chapter for cumulative exercises;
- a global `## Answer Appendix` chapter with H3 groups per source chapter.

- `## CH5 Tree`
  - `### Tree Theorems`
    - `#### Theorem 1`
    - `#### Theorem 2`
    - `#### Theorem 3`
  - `### Traversal`
    - `#### Recursive traversal`
    - `#### Non-recursive traversal`
    - `#### Level-order traversal`
  - `### Heap`
    - `#### insert heap`
    - `#### delete heap`
  - `### Binary Search Tree`
    - `#### BST search`
    - `#### BST insert`
    - `#### BST delete`
    - `#### Copy tree`
    - `#### Verify equal trees`
    - `#### Count nodes`
    - `#### Count leaves`
  - `### AVL Tree`
    - `#### Left rotate`
    - `#### Right rotate`
    - `#### AVL insert`
    - `#### AVL delete`
  - `### Expression Conversion`
    - `#### Infix to prefix`
    - `#### Infix to postfix`

- `## CH6 Graph`
  - `### DFS 與 BFS`
    - `#### DFS`
    - `#### DFS non-recursive`
    - `#### BFS`
  - `### Minimum Spanning Tree`
    - `#### Kruskal`
    - `#### Cycle detection by mask`
    - `#### Union and Find`
    - `#### Prim`
  - `### Shortest Path`
    - `#### Single-source shortest path Dijkstra`
    - `#### All pairs shortest paths`
  - `### Transitive Closure`

- `## CH7 Sorting`
  - `### Elementary Sorts`
    - `#### Selection sort`
    - `#### Bubble sort`
    - `#### Insertion sort`
  - `### Quick Sort`
    - `#### Recursive quick sort`
    - `#### Non-recursive quick sort`
  - `### Merge Sort`
    - `#### Recursive merge sort`
    - `#### Non-recursive merge sort`
  - `### Heap Sort`

- `## Appendix A: C/C++ Programming Notes`
  - `### Pointer Basics`
  - `### Arrays and Strings`
  - `### Function Parameters`

Keep C/C++ syntax and programming-language refreshers in an appendix when they are reused across multiple data-structure chapters. Do not attach them to `CH4 Linked List` unless the note is intentionally a single-chapter handout.

## Teaching Block Pattern

For an H4 algorithm/procedure, prefer this order:

1. Problem statement with input and output.
2. Data representation or invariant.
3. Pseudocode.
4. Worked trace or diagram.
5. C-like implementation.
6. Complexity and common mistake.
7. One practice prompt when useful.

Keep these blocks inside the same H4 when they teach the same operation. For example, a trace table and the final C-like code for `Polynomial add` should not become separate H4 headings unless they are genuinely different topics.
