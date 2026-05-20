---
name: qdoc-apply-comments
description: Use when a QDoc workspace has pending @qdoc-comment markers from the inspector and the user asks to apply, resolve, review, clear, or manage those comments.
---

# QDoc Apply Comments

## Overview

Pending QDoc comments are source markers, not UI-only notes. Apply them as small source edits close to the marker, then remove the marker only after the comment is resolved or explicitly cleared.

## Scope

- Owns listing, applying, resolving, and clearing `@qdoc-comment` markers.
- Edits the source file that contains the marker: `document/index.tsx`, `document/chapters/**/*.mdx`, `document/chapters/**/chapter.tsx`, `document/chapters/**/components/**/*.tsx`, or `document/components/**/*.tsx`.
- Routes domain-heavy changes to the owning skill: writing, hierarchy, design, or diagram drawing.
- Does not rewrite unrelated sections while resolving one comment.

## Workflow

1. List pending markers with `rg "@qdoc-comment" document -n`.
2. Read nearby context around each marker before editing.
3. Apply the smallest source edit that satisfies the comment.
4. Remove only the resolved marker line.
5. Run `npm run qdoc:validate`; also run `npm run qdoc:render` when layout, visual output, or React/MDX structure changed.

## Operations

| Need | Action |
| --- | --- |
| See pending comments | `rg "@qdoc-comment" document -n` |
| Apply one comment | Edit nearby source, then delete that marker line |
| Clear one comment without applying | Delete that marker line only after the user asks |
| Clear all comments | Use the comments tab or delete all marker lines only after explicit confirmation |
| Comment is ambiguous | Ask for clarification and leave the marker in place |

## Common Mistakes

- Do not edit `public/qdoc/`; comments must be resolved in source.
- Do not clear a marker just because it was read.
- Do not batch unrelated rewrites under one comment.
