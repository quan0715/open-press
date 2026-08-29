---
name: openpress-create-pages
description: Use when creating or extending a page-based OpenPress artifact such as a report, proposal, paper, book, teaching note, or handbook.
---

# OpenPress Create Pages

This skill owns page-artifact structure and content judgment. `openpress` owns CLI lifecycle and delivery; `openpress-collaborate` owns revision mode for existing authored content.

## Setup

OpenPress requires Node 20 or newer. Detect whether the workspace already has a Press:

```bash
node -v
find press -mindepth 2 -maxdepth 2 -name press.tsx -print -quit 2>/dev/null | grep -q . && echo EXISTING || echo FRESH
```

- Fresh empty folder: use `npm create @open-press <target> -- --type pages`, then extend the generated minimal pages Press. Do not force a non-empty target.
- Existing workspace: inspect `press/*/press.tsx`, choose a new slug, run `open-press create <slug> --type pages --title "<title>"`, then extend only the new `press/<slug>/`.

## Page Contract

Gather the document brief and confirmed source material before writing. OpenPress-specific defaults and constraints:

- Use `page="a4"` for reports, proposals, whitepapers, papers, books, teaching notes, and handbooks. Ask only when custom geometry is required.
- Keep geometry on `<Press page>`, not in CSS.
- Register public MDX sources in `press/<slug>/press.tsx`; keep internal planning in `press/design.md`, `memory/`, or skills.
- Keep artifact-local components, media, and theme under `press/<slug>/`; use `press/shared/` only for intentional cross-Press reuse.
- Use self-hosted licensed fonts or system fallbacks; final themes must not depend on remote font CSS.
- Preserve confirmed facts. Mark missing material as `[TODO: ...]`, `[DRAFT: ...]`, or `[FIX: ...]` instead of inventing it.

Read `references/press-tree.md` before creating the folder tree or Press TSX. Read `references/theme.md` before writing theme or page components.

## Document Structure

- `#`: document title or cover identity only.
- `##`: formal chapter or document unit; enters the TOC.
- `###`: major topic group; enters the TOC.
- `####`: local procedure, theorem, example, or reference item; normally stays out of the TOC.
- Put `<TableCaption>` before captioned tables; OpenPress owns figure/table numbering.
- When prose refers to a figure or table, give the target a stable semantic ID and write `@fig-stable-name` or `@tbl-stable-name` instead of a literal number. OpenPress resolves the current localized number during render. Read `references/press-tree.md` → **Caption Targets And Semantic References** before authoring these links.
- When the author explicitly wants the following content to start on a new page, put `<PageBreak />` immediately before it. Do not recreate that intent with spacer content or increasingly specific pagination CSS.

For learner-facing documents, show state-changing procedures and expected results where they aid verification. Load `openpress-plugins` when specialized diagrams, architecture figures, or visual tools are needed.

## Verify

Scan authored source before the shared review gate:

```bash
open-press search . "[TODO:" --scope all --json
open-press search . "[DRAFT:" --scope all --json
open-press search . "[FIX:" --scope all --json
```

Then follow `openpress` → **Review And Delivery Gate**. A successful build or PDF export alone is not page-layout verification.

Report the Press slug, title, geometry, source root, files written, unresolved inputs, and fresh verification results.

## Boundaries

- Do not use create commands for upgrades or migrations.
- Do not edit generated output or publish from this skill.
