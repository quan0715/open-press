# Writing Skill Registry

`openpress-writing` coordinates document-level decisions and loads portable writing skills as needed.

## Portable Writing Skills

A portable writing skill provides sentence-level, tone-level, domain, genre, or learner-facing rules. It may suggest content skeletons, examples, exercise flow, and language choices.

Portable writing skills do not own CLI commands, source/generated boundaries, validation depth, export/render steps, deploy behavior, or style pack initialization. Route those questions back to `openpress`.

## Active Skills

| Skill | Trigger | Owns |
| --- | --- | --- |
| `chinese-ai-writing-polish` | Traditional Chinese professional content | AI-talk sentence patterns, subject continuation, table cell concision, passive/reverse phrasing |
| `teaching-notes-writing` | Learner-facing teaching notes, worksheets, study guides, tutorial chapters | Suggested explanation skeletons, examples, practice ideas, answer flow, learner boundary |

## Loading Rules

- In open-press workspaces, enter through `openpress-writing`; layer portable writing skills on top.
- Multiple portable skills may apply, such as Traditional Chinese plus teaching notes.
- Writing skills do not change facts, claims, hierarchy, visual style, or system operations by themselves.

## Cross-References

- `skills/openpress-document-hierarchy/SKILL.md` — heading model and TOC/outline structure.
- `skills/openpress-diagram-drawing/SKILL.md` — structural visuals, state changes, arrows, nodes, and relationships.
- `skills/teaching-notes-writing/references/programming.md` — programming-specific teaching patterns.
