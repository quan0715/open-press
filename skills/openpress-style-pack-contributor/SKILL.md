---
name: openpress-style-pack-contributor
description: Use when contributing, designing, creating, reviewing, or improving an OpenPress starter-bearing skill, especially the visual philosophy, starter workspace, design doc, theme tokens, page surfaces, components, and validation notes.
---

# OpenPress Starter Skill Contributor

This is a maintainer reference for **starter-bearing skills at the source** — everything under `skills/<skill>/starter/`. A starter-bearing skill is an opinionated document design system plus a runnable starter workspace. Use `openpress` for the exact init, validate, export, render, and scratch-workspace commands.

The split with `openpress-design` is by path, not by topic:

- `skills/<skill>/starter/document/…` → this skill (upstream starter files that agents can copy or adapt).
- `document/…` in an end-user workspace → `openpress-design` (downstream, one project's local edits).

## Responsibilities

- Define one clear visual philosophy for the starter.
- Edit only `skills/<skill>/` unless the framework lacks a generic capability.
- Provide a runnable `starter/` that an agent can copy or adapt after `@open-press/cli init`.
- Keep starter `design.md` public-readable.
- Preserve portable typography contracts: `theme/tokens.css` names `--openpress-font-*` tokens, `theme/fonts.css` loads faces, and `local(...)` alone is not enough for stable public output.
- Validate the starter through a scratch workspace (do not overwrite the user's current `document/`).

## Boundaries

- `openpress` owns CLI command choice and the source/generated boundary table.
- `openpress-design` owns the same visual concerns but in workspace `document/`, not skill `starter/`.
- `openpress-writing` owns starter content prose and factual boundaries.

## Starter Layout

```txt
skills/<skill>/
  SKILL.md            # visual signature, suitable-for, do/don't
  starter/
    openpress.config.mjs
    document/
      index.tsx
      chapters/
      design.md
      theme/
      components/
      media/
```

Do not put generated output, private content, customer data, secrets, or deployment artifacts in a starter-bearing skill.

## Workflow

1. Define intended document types, readers, and visual philosophy.
2. Keep the starter narrow; one starter should not serve every tone or industry.
3. Build or update `starter/`.
4. Ask `openpress` to choose and run the scratch-workspace validation workflow.
5. Ask `openpress` for broader framework checks only when shared code changes.

## Cross-Starter Discovery

When adding a new starter-bearing skill, also update sibling SKILLs that overlap in audience so users can choose between them. Each starter SKILL should at minimum list its **suitable / not suitable** scope.

## When To Read References

- Read `references/starter-contract.md` for starter file responsibilities, typography portability, validation expectations, and review checklist.
