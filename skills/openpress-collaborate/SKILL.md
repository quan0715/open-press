---
name: openpress-collaborate
description: Use when analyzing, proposing, reviewing, or changing existing authored OpenPress MDX/TSX content.
---

# OpenPress Collaborate

This skill selects how an agent and user review authored-content changes. The Agent GUI carries instructions; Workbench renders Current and Proposed pages and collects Proposal feedback.

## Choose A Mode

| Mode | Trigger | Source mutation |
| --- | --- | --- |
| Answer | analysis or review without a requested change | none |
| Propose | non-trivial edit, preview, or writing judgment | review handoff only |
| Apply | explicit request to apply the current Preview | exact reviewed replacements |
| Direct | explicit review bypass, or a small mechanical edit | direct source edit |

Initial creation belongs to the format skill because new files have no useful `before` text. Use Propose for later revision.

## Propose

1. Read current source, workspace instructions, relevant writing/format skills, and related pending `@openpress-comment` markers.
2. Do not edit authored `press/` source.
3. Replace `.openpress/review/current.json` with the complete current proposal set:

```json
{
  "proposals": [
    {
      "path": "press/book/chapters/intro.mdx",
      "before": "Exact current source text.",
      "after": "Exact replacement text.",
      "note": "Short reason for this change"
    }
  ]
}
```

Each Proposal must target authored `.mdx` or `.tsx` under `press/`, use a non-empty exact unique `before`, contain the complete `after` replacement, and include one plain-language `note`. For insertion, include stable neighboring text in both values. Use an empty `after` for deletion. Order by path and source position.

Write only `path`, `before`, `after`, and `note`; Workbench may add `feedback`. Replace the whole handoff each pass—do not preserve ids, history, hashes, or superseded feedback.

Tell the user to open **Changes** in Workbench. Current and Proposed markers share the same note and feedback. Stop before editing source.

## Refresh From Feedback

Read the current handoff before replacing it. Treat `accept`, `reject`, `more-info`, and free-text feedback as input, re-read current source, reconsider the complete change set, then write a fresh proposal file without copying old feedback.

## Apply

Apply only after an explicit instruction such as「套用目前 Preview」or「開始修改」.

1. Read the handoff and every target file fresh.
2. If any Proposal has `reject` or `more-info`, refresh or answer instead.
3. Before changing any file, verify every `before` occurs exactly once. If any is missing or ambiguous, change nothing.
4. Apply every replacement exactly; add no unreviewed wording.
5. Remove only `@openpress-comment` markers actually satisfied by the applied change.
6. Delete the handoff after all edits succeed.
7. Follow `openpress` → **Review And Delivery Gate** when visual or delivery readiness is part of the request.

Never partially apply a Preview.

## Direct

Follow the owning format skill and normal OpenPress source boundary. For comment markers, use `openpress-apply-comments`. Use the shared review gate when the result must be visually verified or delivered.

When editing prose with semantic figure/table references:

- Preserve existing `fig-*` and `tbl-*` target IDs unless the requested change requires renaming the target.
- Cite targets with `@fig-stable-name` and `@tbl-stable-name`; never rewrite resolved labels such as `圖 2` or `表 3` into source.
- When adding, removing, moving, or renaming a captioned target, inspect and update all matching mentions in the same proposal or direct edit.
- For React figures, verify the stable ID reaches the root `<figure>`; for Markdown tables, keep it on the immediately preceding `<TableCaption id="tbl-...">`.
- After applying the change, build the Press so missing, duplicate, malformed, or cross-kind targets fail before delivery, then click a representative cross-page reference in Workbench.

## Safety

- `openpress` owns CLI lifecycle and source/generated boundaries.
- Format and writing skills own content judgment.
- `openpress-apply-comments` owns marker mechanics.
- Never publish; route publishing to `openpress-deploy`.
