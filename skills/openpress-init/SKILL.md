---
name: openpress-init
description: Use when the user wants to start a new open-press project, invokes /create-press, sets up a fresh OpenPress workspace, adds another Press document to an existing workspace, bootstraps a proposal/whitepaper/paper/teaching-note/spec/book/deck/social campaign, or runs first-time initialization before content is written.
---

# /create-press SOP

One skill, two branches. Run **detect** first. The branch decides whether the agent is bootstrapping a fresh workspace (Branch A) or adding another Press to one that already exists (Branch B).

Run as a low-freedom setup workflow. Do not write document content during this skill — that belongs to writing / design skills downstream.

## 0. Environment Preflight

```bash
node -v
npm -v
npx -v
```

- All commands work + Node ≥20 → continue.
- Missing `node` / `npm` / `npx` → stop, instruct user to install Node.js LTS, reopen terminal, rerun preflight.
- Node <20 → stop, instruct user to upgrade Node.js LTS, rerun preflight.

## 1. Detect the Branch

```bash
test -f press/index.tsx && grep -q "<Workspace" press/index.tsx && echo BRANCH_B || echo BRANCH_A
```

- `BRANCH_A` (no workspace) → bootstrap a fresh one. Go to §A.
- `BRANCH_B` (`<Workspace>` already in `press/index.tsx`) → add a new Press to it. Go to §B.

If `press/index.tsx` exists but does not wrap children in `<Workspace>` (legacy v0.x shape), tell the user to run `npx open-press upgrade` first, then re-invoke `/create-press`.

---

## A — Bootstrap a fresh workspace

### A.1 Target Check

- Use the user's target if provided. Use `.` only when the user explicitly wants the current directory.
- The CLI rejects non-empty targets automatically. A lone `.git/`, `.gitignore`, `.gitkeep`, or `.DS_Store` is fine. If the target has real content, ask the user to clean it first — there is no `--force` flag.

### A.2 Intake (one batch)

Required:

- **Document type** (proposal / whitepaper / paper / teaching note / book / slide deck / social campaign / etc.)
- **Audience**
- **Primary language**
- **Title** (written into `<Press title="...">`)

Page geometry:

- Most document types map to an obvious page preset. Show the default, let the user override with one short answer:

  | Document type | Default page | Override examples |
  | --- | --- | --- |
  | report / paper / book | `a4` | `us-letter` (custom), `a5` |
  | slide deck | `slide-16-9` | `slide-4-3` (custom) |
  | social post | `social-square` | story card (custom `1080×1350`) |
  | hybrid (e.g. A4 report + 16:9 hero) | use a multi-Press Workspace, one Press per geometry | — |

- If custom geometry, ask for `width` and `height` with explicit units (mm / cm / in / pt / pc / px). Build a `{ id, label, width, height }` object.

Do NOT ask for subtitle / organization / author / version / footer. Those are rendered text — they live in the Cover JSX, not on Press props.

### A.3 Downstream Skill Handoff

OpenPress does not own starters or template selection. Resolve the next owner in this order:

1. If the user named an external skill repo → `npx -y skills@latest add <owner/repo>` after init, then read its `SKILL.md`.
2. If the user wants a known flow already installed → route to that skill after init.
3. If no skill applies → create a minimal `press/index.tsx` only after confirming the user wants a blank workspace.

### A.4 Init Command

```bash
npx @open-press/cli init <target> --title "<title>"
```

Omit `--title` only if the user did not provide one. The init flow also installs framework agent skills automatically.

### A.5 Verify

Inside the new workspace:

```bash
npm run build
npm run dev -- --dry-run
```

Surface any failure before handoff.

### A.6 Handoff Report

- target path
- workspace name (if you set one on `<Workspace name="...">`)
- the Press's `title` and `page` you wired
- selected next-owner skill
- next editable paths: `press/index.tsx`, `press/chapters/`, `press/theme/`, `press/components/`
- next owning skill: writing → `openpress-writing`, design → `openpress-design`, deploy → `openpress-deploy`

---

## B — Add a Press to an existing workspace

### B.1 Read the workspace

- Open `press/index.tsx`. Parse the `<Workspace>` block to identify existing Press children, their slugs, page geometries, and source roots.
- If only one Press exists and it has no `slug` prop, the workspace is in implicit single-Press mode. Adding a second Press promotes the project to multi-Press; the existing Press now needs a `slug` too (use the document type as a slug, e.g. `proposal`).

### B.2 Intake (one batch)

Required:

- **`slug`** — URL segment + per-Press directory name. Slug-shaped (`a-z`, `0-9`, hyphens). Ask the user explicitly; do not autogenerate.
- **`title`** — for `<Press title="...">`.
- **`page` geometry** — same intake as Branch A; preset or custom geometry.
- **Source layout** — does this Press want its own MDX root (`press/<slug>/chapters/`) or share an existing source registered on another Press? Default: its own root.

Optional follow-up only when the user mentions it:

- domain skill to drive starter content for this Press

### B.3 Modify `press/index.tsx`

- Add a new `<Press slug="..." title="..." page="..." sources={[ mdxSource({ id: "<slug>", preset: "section-folders", root: "<slug>/chapters" }) ]}>` child to the `<Workspace>` block.
- Preserve existing children — never reorder or rewrite siblings while adding.
- If the workspace's first Press had no `slug` (implicit single-Press mode), add the appropriate `slug` to it in the same edit so the routing model is consistent.

### B.4 Create Per-Press Folder Structure

```bash
mkdir -p press/<slug>/chapters/01-intro/content
mkdir -p press/<slug>/components
```

Theme is shared at `press/theme/` unless the user explicitly asked for per-Press theme override. In that case, add `theme="./<slug>/theme"` to the `<Press>` props and `mkdir press/<slug>/theme`.

### B.5 Downstream Skill Handoff

Same routing as Branch A — if the user named a skill repo, install it; otherwise route to writing / design / deploy as appropriate.

### B.6 Verify

```bash
npm run build
```

Confirm both Press documents render (the count from build output should match the number of `<Press>` children in `press/index.tsx`).

### B.7 Handoff Report

- new slug
- new Press title + page
- folder structure created
- whether the prior Press got a slug added (`true` / `false`)
- next editable paths
- next owning skill

---

## Do Not

- Do not write the first draft during this skill.
- Do not explain Node/npm unless preflight fails.
- Do not use `nvm`, Homebrew, pnpm, or global installs in the default path.
- Do not run `init` before Branch A's preflight + target + intake are settled.
- Do not modify `press/index.tsx` siblings when adding a new Press in Branch B.
- Do not hand-edit generated output (`public/openpress/`, `dist-react/`).
- Do not ask for subtitle / organization / author — those belong in Cover JSX.
