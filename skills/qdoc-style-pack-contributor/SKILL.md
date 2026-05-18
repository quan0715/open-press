---
name: qdoc-style-pack-contributor
description: Use when contributing, designing, creating, reviewing, or improving a QDoc style pack, especially the visual philosophy, starter workspace, design-system docs, theme tokens, page surfaces, components, and validation for skills/<pack>/starter.
---

# QDoc Style Pack Contributor

Use this skill when the user wants to add or improve a QDoc style pack. A style pack is an opinionated document design system plus a runnable starter workspace.

## Goal

Create a pack that gives agents a clear visual direction and gives users a working starting point.

A good pack has one recognizable editorial position. Do not make one pack try to cover every tone, industry, or aesthetic.

## Scope

Edit only the pack and related docs unless the framework itself is missing a generic capability:

```txt
skills/<pack>/
  SKILL.md
  starter/
    qdoc.config.mjs
    content/
    design-system/
    theme/
    media/
    components/        # optional
```

The engine discovers a style pack by the presence of `starter/`.

## Design First

Before editing files, define:

- intended document types and readers;
- visual philosophy and what the pack should avoid;
- typography, color, spacing, page rhythm, cover, TOC, chapter, table, figure, and chart treatment;
- what agents may customize per document;
- what reviewers should inspect before shipping.

Use `qdoc-design` for detailed theme, PDF-safe CSS, component, and design-system work.

## Starter Contract

The starter must be runnable after copying or initializing from the pack:

- `qdoc.config.mjs` defines document identity and workspace paths.
- `content/` contains a minimal coherent document: cover, TOC when useful, at least one chapter, and optional back cover.
- `design-system/` is public-readable. It should explain the pack's design rules and serve as the user/agent review surface.
- `theme/` implements the design with CSS tokens, base typography, page surfaces, patterns, shell rules, and print safeguards.
- `components/` contains only reusable or structured visual units. Keep component data, renderer, schema, style, and README together.
- `media/` contains only assets that are safe to ship with the pack.

Do not put generated outputs in the pack. Do not commit `public/qdoc/`, `dist-react/`, `.deploy/`, or local scratch documents.

## Writing The Pack Skill

`skills/<pack>/SKILL.md` should tell an agent:

- when to choose this pack;
- what the visual style is;
- what kinds of documents it fits;
- which design decisions are flexible;
- what to verify after edits.

Keep it short. Put runnable examples in `starter/`, not in long prose.

## Validation

After creating or editing a style pack, validate it through a scratch workspace instead of only inspecting files. Do not overwrite the user's current `document/` working copy just to test a pack.

For a fresh temporary workspace:

```bash
scratch="$(mktemp -d /tmp/qdoc-pack-XXXXXX)"
node engine/cli.mjs init "$scratch" --skill <pack>
node engine/cli.mjs export "$scratch"
node engine/cli.mjs validate "$scratch"
node engine/cli.mjs pdf "$scratch"
```

Run broader framework checks when the change touches shared code:

```bash
npm run typecheck
npm test
```

## Review Checklist

Before calling the pack ready, confirm:

- the pack has a narrow, describable design philosophy;
- the starter renders without missing assets or fonts;
- long headings, dense paragraphs, tables, figures, and captions remain readable;
- PDF output does not overflow fixed pages;
- the design-system document teaches both users and agents how to review the pack;
- no private business content, customer data, tokens, or deployment secrets are included.
