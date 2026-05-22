---
"@open-press/cli": minor
"@open-press/core": minor
---

Consolidate internal skills (13 → 11).

- `openpress-update` folded into `openpress` as an "Updating An Existing Workspace" section. The release-upgrade flow, pre-flight checks, breaking-change reference, and do-not list are now part of the system-operation skill where they naturally belong.
- `openpress-document-hierarchy` folded into `openpress-writing` as a "Hierarchy" section. Hierarchy decisions (H2/H3/H4 model, TOC depth, appendix placement, H4 granularity) and prose decisions happen in the same workflow; one skill, one routing decision.
- `references/data-structures-outline.md` moved from the hierarchy skill into `openpress-writing/references/`.

Lower maintenance surface: 2 fewer SKILL.md files to keep in sync, ~5 fewer cross-references to police. No content lost — same rules, fewer files.

User impact: agents already in workspaces with `openpress-update` or `openpress-document-hierarchy` SKILL files installed should run `npx skills upgrade` to refresh the catalog.
