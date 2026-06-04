---
name: openpress-create-pages
description: Use when the user wants to create, draft, scaffold, or add a page-based OpenPress artifact such as a report, proposal, whitepaper, paper, book, teaching note, handbook, or long-form document. This skill owns fresh workspace bootstrap for pages, adding a pages Press to an existing Workspace, page-based Press Tree generation, first-pass theme intake, page components, hierarchy, prose structure, captions, factual boundaries, and portable writing skill routing.
---

# OpenPress Create Pages

This skill is the user-facing creation workflow for page-based OpenPress artifacts.

`openpress-create-pages` owns artifact creation. The `openpress` skill owns ongoing system lifecycle: CLI command choice, validation, render/PDF/image export, deploy, doctor, upgrade, and migrate. The CLI `npx @open-press/cli init <target> --type pages` remains the low-level workspace scaffolder for fresh page workspaces.

## Responsibilities

- Start a fresh page-based OpenPress workspace.
- Add a page-based Press to an existing Workspace.
- Decide page geometry and MDX source layout.
- Build the initial pages Press Tree.
- Create the first-pass page theme and page components.
- Define audience, purpose, H2/H3/H4 hierarchy, TOC depth, appendix placement, table/figure caption rules, and factual boundaries.
- Load portable writing skills for language or genre-specific rules.
- Verify the created artifact before handoff.

## Boundary

| Owner | Scope |
| --- | --- |
| `openpress-create-pages` | Create or add page-based artifacts, including initial structure, prose rules, theme, and components. |
| `openpress-create-slide` | Create or add slide decks. |
| `openpress` | CLI lifecycle, build/render/PDF/image/deploy, doctor, upgrade, migrate, source/generated boundary. |
| `openpress-deploy` | Public deploy workflow after explicit user confirmation. |
| `openpress-apply-comments` | Pending `@openpress-comment` markers. |

Source paths follow `openpress` > Source Boundary.

## 0. Environment Preflight

```bash
node -v
npm -v
npx -v
```

- All commands work and Node is >=20: continue.
- Missing `node`, `npm`, or `npx`: stop and tell the user to install Node.js LTS, reopen the terminal, then rerun.
- Node <20: stop and tell the user to upgrade Node.js LTS, then rerun.

## 1. Detect Workspace Branch

```bash
find press -mindepth 2 -maxdepth 2 -name press.tsx -print -quit 2>/dev/null | grep -q . && echo EXISTING_WORKSPACE || echo FRESH_WORKSPACE
```

- `FRESH_WORKSPACE`: scaffold a new workspace first.
- `EXISTING_WORKSPACE`: add a pages Press folder under `press/<slug>/`.
- If no `press/*/press.tsx` files exist, scaffold a folder-convention workspace first.

## 2. Intake

Gather these before writing files:

- Artifact type: report, proposal, whitepaper, paper, book, teaching note, handbook, or other page-based document.
- Audience.
- Primary language.
- Title.
- Page geometry. Defaults:
  - report, proposal, whitepaper, paper, book, teaching note, handbook: `a4`
  - user-specified custom geometry: ask for width and height with CSS absolute units.
- Brand/theme inputs: primary ink, accent, body font, display font, and optional reference aesthetic.
- Known source material and confirmed facts.

Do not ask for subtitle, organization, author, version, or footer as Press metadata. Those are rendered text in the cover/page components.

## 3. Fresh Workspace Flow

Run:

```bash
npx @open-press/cli init <target> --type pages --title "<title>"
```

Use `.` only when the user explicitly wants the current directory. The CLI rejects non-empty targets; do not use a force flag.

After init, continue with the pages Press Tree and theme steps below.

## 4. Existing Workspace Flow

Read `press/*/press.tsx` and identify existing slugs, page geometries, source roots, `componentsDir`, and `mediaDir`.

Create a new `press/<slug>/` folder for the pages Press. Do not modify sibling Press folders unless the user explicitly asks for shared assets or a migration.

## 5. Pages Press Tree Contract

Default generated shape:

```tsx
import { Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, Toc } from "@open-press/core/manuscript";

export default function ReportPress() {
  return (
    <Press
      slug="report"
      title="Report Title"
      type="pages"
      page="a4"
      sources={[
        mdxSource({ id: "report", preset: "section-folders", root: "report/chapters" }),
      ]}
    >
      <Cover />
      <Toc source="report" maxLevel={2} />
      <Sections source="report" />
      <BackCover />
    </Press>
  );
}
```

Use per-Press folders for multi-Press workspaces:

```txt
press/<slug>/chapters/
press/<slug>/components/
```

Use folder-local `press/<slug>/theme/` for artifact rules. Use `press/shared/theme/` only when multiple Press folders share a baseline.

Component and media lookup is path-declared, not hardwired to one folder. Defaults include folder-local `./components` / `./media` and `press/shared/*`; when a pages Press intentionally uses another folder, set `<Press componentsDir>` or `<Press mediaDir>` to a string or string array. Paths starting with `./` resolve relative to the owning Press folder; bare paths resolve relative to `press/`.

## 6. Hierarchy and Writing Rules

Decide structure before drafting prose:

- `#`: whole document title only; usually cover identity, not normal content files.
- `##`: formal chapter/document unit; enters formal TOC.
- `###`: major topic group; enters formal TOC.
- `####`: concrete algorithm, operation, theorem, variant, worked procedure, or local reference item; normally stays out of formal TOC.

Rules:

- Preserve confirmed facts.
- Mark missing facts as `[TODO: ...]`, `[FIX: ...]`, or `[DRAFT: ...]`.
- Use `<TableCaption>...</TableCaption>` before captioned tables.
- Do not hand-maintain figure/table numbers.
- Public content belongs in registered MDX sources. Internal planning belongs in `press/design.md`, `memory/`, or skills.

Portable skill triggers:

| Content | Load |
| --- | --- |
| Traditional Chinese professional content | `chinese-ai-writing-polish` |
| Teaching notes, worksheets, study guides, tutorials | `teaching-notes-writing` |

Resolve conflicts in this order: explicit user instruction, workspace memory/design.md, document brief, this skill's structural decisions, portable skill rules.

## 7. Theme and Page Components

Write or update:

```txt
press/design.md
press/shared/theme/tokens.css
press/shared/theme/fonts.css
press/shared/theme/base/page-contract.css
press/shared/theme/base/typography.css
press/shared/theme/base/print.css
press/shared/theme/page-surfaces/
press/shared/theme/shell/
press/<slug>/components/
```

Theme rules:

- Keep page geometry on `<Press page>`, not CSS.
- Use `press/design.md` as the shared user/agent design source.
- Keep PDF-safe fixed-layout CSS: no uncontrolled overflow, no local-only font dependency for public/PDF output.
- Use components as reading aids: definitions, figures, tables, KPI surfaces, callouts, and reusable page shells.
- Avoid interactive UI patterns inside formal documents.

## 8. Verify

Fresh or structural edit:

```bash
npm run build
```

When PDF readiness matters:

```bash
npm run openpress:pdf
```

Report:

- target path
- Press slug, title, and page geometry
- source root
- theme paths written
- next editable paths
- verification commands and results

## Do Not

- Do not route page creation to deleted lifecycle skills.
- Do not use `npx @open-press/cli init` as an upgrade/migration tool.
- Do not edit generated output.
- Do not publish.
- Do not write unsupported facts.
