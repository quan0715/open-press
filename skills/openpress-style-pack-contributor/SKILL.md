---
name: openpress-style-pack-contributor
description: Use when contributing, designing, creating, reviewing, or improving a open-press style pack, especially the visual philosophy, starter workspace, design doc, theme tokens, page surfaces, components, and validation for skills/<pack>/starter.
---

# open-press Style Pack Contributor

This skill owns **bundled style packs at the source** — everything under `skills/<pack>/`. A style pack is an opinionated document design system plus a runnable starter workspace. Use `openpress` for the exact init, validate, export, render, and scratch-workspace commands.

The split with `openpress-design` is by path, not by topic:

- `skills/<pack>/starter/document/…` → this skill (upstream, ships to every new workspace).
- `document/…` in an end-user workspace → `openpress-design` (downstream, one project's local edits).

## Responsibilities

- Define one clear visual philosophy for the pack.
- Edit only `skills/<pack>/` unless the framework lacks a generic capability.
- Provide a runnable `starter/` that the system-level `openpress` skill can initialize into a fresh target.
- Keep starter `design.md` public-readable.
- Preserve portable typography contracts: `theme/tokens.css` names `--openpress-font-*` tokens, `theme/fonts.css` loads faces, and `local(...)` alone is not enough for stable public output.
- Validate the pack through a scratch workspace (do not overwrite the user's current `document/`).

## Boundaries

- `openpress` owns CLI command choice and the source/generated boundary table.
- `openpress-design` owns the same visual concerns but in workspace `document/`, not pack `starter/`.
- `openpress-writing` owns starter content prose and factual boundaries.

## Pack Layout

```txt
skills/<pack>/
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

Do not put generated output, private content, customer data, secrets, or deployment artifacts in a style pack.

## Workflow

1. Define intended document types, readers, and visual philosophy.
2. Keep the pack narrow; one pack should not serve every tone or industry.
3. Build or update `starter/`.
4. Ask `openpress` to choose and run the scratch-workspace validation workflow.
5. Ask `openpress` for broader framework checks only when shared code changes.

## Cross-Pack Discovery

When adding a new pack, also update sibling pack SKILLs that overlap in audience so users can choose between them. Each pack SKILL should at minimum list its **suitable / not suitable** scope.

## When To Read References

- Read `references/starter-contract.md` for starter file responsibilities, typography portability, validation expectations, and review checklist.
