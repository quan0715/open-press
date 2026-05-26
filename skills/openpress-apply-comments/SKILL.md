---
name: openpress-apply-comments
description: Use when applying, resolving, clearing, or inspecting pending open-press @openpress-comment markers, including requests like /apply-comments, apply comment, resolve comments, read comments and modify the document, or remove resolved comment markers.
---

# open-press Apply Comments

This is the workflow skill for turning pending `@openpress-comment` markers into source edits. A comment is resolved only when the requested source change has been made and the marker has been removed.

## Responsibilities

- List pending `@openpress-comment` markers.
- Read the decoded comment note, hint, source path, and nearby source.
- Apply the requested edit as a small source change.
- Remove the marker after the edit is complete.
- Leave ambiguous or failed comments in place.
- Verify before reporting completion.

## Boundary

- Use `openpress` for the canonical source/generated path table when unsure.
- Edit source, not generated output.
- Default to editing the source file that contains the marker.
- Route domain-heavy work to the owning skill:
  - `openpress-writing` for prose, hierarchy, captions, claims, tone, and narrative.
  - `openpress-design` for theme, layout, visual rhythm, and components.
  - `openpress-diagram-drawing` for diagram semantics.
- Do not rewrite unrelated sections while resolving one comment.

## Workflow

1. Discover comments.

   ```bash
   rg "@openpress-comment" document -n
   ```

   If decoded notes are needed and the framework helper exists, use it:

   ```bash
   node --input-type=module -e 'import { listCommentMarkers } from "./packages/core/engine/react/comment-marker.mjs"; console.log(JSON.stringify(await listCommentMarkers({ root: process.cwd() }), null, 2));'
   ```

   In older workspaces, the helper may be at `engine/react/comment-marker.mjs`.

2. Pick the requested scope.

   - If the user names one comment, resolve only that comment.
   - If the user says apply comments without an id, process pending comments in source order.
   - Handle comments one at a time; do not batch unrelated rewrites under one marker.

3. Inspect the target.

   - Read the source file that contains the marker.
   - Inspect nearby lines before editing.
   - Use the marker hint and rendered-object metadata when present, but verify against source.

4. Apply the edit.

   - Make the smallest source change that satisfies the comment.
   - Preserve local style, component APIs, and MDX structure.
   - If the request is ambiguous, ask for clarification and leave the marker in place.

5. Remove the resolved marker.

   - Delete the `@openpress-comment` marker only after the source edit is complete.
   - Do not clear a marker just because it was read.
   - Clear a marker without applying only when the user explicitly asks.

6. Verify.

   ```bash
   npm run openpress:validate
   ```

   Also run:

   ```bash
   npm run openpress:export
   ```

   when `document/`, React components, MDX, or document metadata changed and the workbench/public reader needs refreshed output.

   Run:

   ```bash
   npm run openpress:render
   ```

   when layout, visual output, React/MDX structure, or public build behavior changed.

## Completion Report

Report:

- which comment ids were resolved,
- which files changed,
- which comments remain because they were ambiguous or failed,
- which verification commands ran and whether they passed.

## Common Mistakes

- Do not edit `public/openpress/`, `dist-react/`, `.deploy/`, or `.openpress/`.
- Do not remove unresolved comments.
- Do not rewrite broad sections unless the comment explicitly asks for that.
- Do not claim the browser changed until the source has been exported when export is required.
