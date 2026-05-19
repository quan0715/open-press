# Writing Skill Registry

QDoc writing coordinates document-level decisions and loads Portable Writing Skill rules as needed.

## Portable Writing Skill

A portable writing skill can be used outside QDoc. Examples:

- `chinese-ai-writing-polish`
- `teaching-notes-writing`
- future business proposal writing skill
- future academic report writing skill
- future investor memo writing skill

Portable skills should define sentence-level, tone-level, domain, or genre rules. They should not assume QDoc files, renderers, or deploy adapters.

## QDoc Writing Role

QDoc writing decides:

- audience and document purpose;
- narrative structure;
- section order;
- paragraph density;
- table/figure/caption wording;
- factual confirmation gates.

It then applies enabled portable skills in registry priority order.

## Conflict Resolution

Priority:

1. explicit user instruction;
2. workspace memory and preferences;
3. document brief;
4. QDoc writing structure;
5. portable skill rules.

If two portable skills conflict, choose the rule that better serves the document brief. If the conflict changes meaning or claims, ask the user.

## Do Not Inline Portable Skills

Do not paste the full Chinese misuse rules into QDoc writing. Link or load that skill. This keeps QDoc extensible and prevents duplicate stale rules.

## Workspace Writing Memory

Reusable project decisions and domain-specific extensions can live in reference files:

- `skills/qdoc-document-hierarchy/SKILL.md` — long-form document hierarchy rules for QDoc documents: H1 document title, H2 formal chapter, H3 TOC topic, H4 algorithm/procedure outline item.
- `skills/teaching-notes-writing/references/programming.md` — programming-specific extension material for teaching notes: long-code teaching flow, pseudocode, diagram/table pairing, and terminology choices.
