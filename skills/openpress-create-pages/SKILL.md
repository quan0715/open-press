---
name: openpress-create-pages
description: Use when the user wants to create, draft, scaffold, or add a page-based OpenPress artifact such as a report, proposal, whitepaper, paper, book, teaching note, handbook, or long-form document. This skill owns fresh workspace bootstrap for pages, adding a pages Press to an existing Workspace, page-based Press Tree generation, first-pass theme intake, page components, hierarchy, prose structure, captions, factual boundaries, and portable writing skill routing.
---

# OpenPress Create Pages

`openpress-create-pages` owns artifact creation. The `openpress` skill owns CLI lifecycle: build, render, PDF, image, deploy, doctor, upgrade, migrate.

## Boundary

| Owner | Scope |
| --- | --- |
| `openpress-create-pages` | Create or add page-based artifacts: structure, prose rules, theme, components. |
| `openpress-create-slide` | Slide decks. |
| `openpress` | CLI lifecycle. |
| `openpress-deploy` | Public deploy after explicit user confirmation. |
| `openpress-apply-comments` | Pending `@openpress-comment` markers. |

---

## Setup

**1. Environment check:**

```bash
node -v && npm -v && npx -v
```

Node ≥ 20 required. If missing or outdated, stop and ask the user to install Node.js LTS.

**2. Detect workspace branch:**

```bash
find press -mindepth 2 -maxdepth 2 -name press.tsx -print -quit 2>/dev/null | grep -q . && echo EXISTING || echo FRESH
```

**3a. Fresh workspace:**

```bash
npx @open-press/cli init <target> --type pages --title "<title>"
```

Use `.` only when the user explicitly wants the current directory. CLI rejects non-empty targets — do not use a force flag.

**3b. Existing workspace:**

Read `press/*/press.tsx` to identify existing slugs, geometries, `componentsDir`, and `mediaDir`. Create a new `press/<slug>/` folder. Do not touch sibling Press folders unless the user asks.

---

## Intake

Gather before writing files:

- Artifact type: report / proposal / whitepaper / paper / book / teaching note / handbook / other
- Audience
- Primary language
- Title
- Page geometry:
  - report, proposal, whitepaper, paper, book, teaching note, handbook → `a4`
  - custom: ask for width and height in CSS absolute units
- Theme inputs: primary ink, accent, body font, display font, optional reference aesthetic
- Known source material and confirmed facts

Do not ask for subtitle, organization, author, version, or footer as Press metadata — those are rendered text in cover/page components.

---

## Hierarchy and Writing Rules

Decide structure before drafting prose.

**Heading levels:**

- `#`: whole document title only; cover identity, not normal content files
- `##`: formal chapter/document unit; enters formal TOC
- `###`: major topic group; enters formal TOC
- `####`: concrete algorithm, operation, theorem, variant, worked procedure, or local reference item; normally stays out of formal TOC

**Rules:**

- Preserve confirmed facts.
- Mark missing facts as `[TODO: ...]`, `[FIX: ...]`, or `[DRAFT: ...]`.
- Use `<TableCaption>...</TableCaption>` before captioned tables.
- Do not hand-maintain figure/table numbers.
- Public content belongs in registered MDX sources. Internal planning belongs in `press/design.md`, `memory/`, or skills.

Use `open-press search` to locate content before editing:

```bash
# 找哪個章節提到某個關鍵字，回傳 page id + 行號
open-press search . "<query>" --json

# 含 components / theme / design.md 一起搜
open-press search . "<query>" --scope all --json
```

**Portable skill triggers:**

| Content | Load |
| --- | --- |
| Traditional Chinese professional content | `chinese-ai-writing-polish` |
| Teaching notes, worksheets, study guides, tutorials | `teaching-notes-writing` |

Resolve conflicts in this order: explicit user instruction → workspace memory/design.md → document brief → this skill's structural decisions → portable skill rules.

---

## Verify

Draft marker scan before build:

```bash
# 確認沒有未完成標記殘留
open-press search . "[TODO:" --scope all --json
open-press search . "[DRAFT:" --scope all --json
open-press search . "[FIX:" --scope all --json
```

Fresh or structural edit:

```bash
npm run build
```

When PDF readiness matters:

```bash
npm run openpress:pdf
```

Report: Press slug, title, geometry, source root, theme paths written, next editable paths, verification result.

---

## When to Read References

- **Press Tree & folder layout**: read `references/press-tree.md` — canonical folder structure, Press Tree TSX example, path resolution rules.
- **Theme & page components**: read `references/theme.md` — paths to write, theme rules, CSS constraints.

---

## Do Not

- Do not use `npx @open-press/cli init` as an upgrade or migration tool.
- Do not edit generated output.
- Do not publish.
- Do not write unsupported facts.
