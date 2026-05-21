---
name: openpress-style-pack-contributor
description: Use when contributing, designing, creating, reviewing, or improving a open-press style pack, especially the visual philosophy, starter workspace, design doc, theme tokens, page surfaces, components, and validation for skills/<pack>/starter.
---

# open-press Style Pack Contributor

This skill owns bundled style packs. A style pack is an opinionated document design system plus a runnable starter workspace.

## Responsibilities

- Define one clear visual philosophy for the pack.
- Edit only `skills/<pack>/` unless the framework lacks a generic capability.
- Provide a runnable `starter/`.
- Keep starter `design.md` public-readable.
- Preserve portable typography contracts: `theme/tokens.css` names `--openpress-font-*` tokens, `theme/fonts.css` loads faces, and `local(...)` alone is not enough for stable public output.
- Validate the pack through a scratch workspace.

## Boundaries

- `openpress` owns CLI command choice and source/generated boundaries.
- `openpress-design` owns detailed theme, CSS, component, and PDF-safe visual work.
- `openpress-writing` owns starter content prose and factual boundaries.
- This skill owns the packaged starter contract and contribution checklist.

## Pack Scope

```txt
skills/<pack>/
  SKILL.md
  starter/
    openpress.config.mjs
    content/
    design.md
    theme/
    components/
    media/
```

Do not put generated output, private content, customer data, secrets, or deployment artifacts in a style pack.

## Workflow

1. Define intended document types, readers, and visual philosophy.
2. Keep the pack narrow; one pack should not serve every tone or industry.
3. Build or update `starter/`.
4. Validate through a scratch workspace, not by overwriting the user's current `document/`.
5. Run broader framework checks only when shared code changes.

## When To Read References

- Read `references/starter-contract.md` for starter file responsibilities, typography portability, validation commands, and review checklist.
