# OpenPress Create Pages / Create Slide Skill Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace lifecycle-oriented OpenPress skills with `openpress-create-pages` and `openpress-create-slide`, folding theme creation into both while keeping `openpress` responsible for CLI, upgrade, migration, and verification.

**Architecture:** The runtime stays unchanged: `Frame`, `Press`, and `Workspace` remain core primitives. The new create skills become authoring workflows that orchestrate CLI `init` for fresh workspaces, add page or slide Press trees, and generate workspace-level theme/component surfaces. `openpress` remains the system lifecycle owner for doctor/upgrade/migrate/build/render/PDF/deploy.

**Tech Stack:** Markdown skill files, OpenPress Press Tree JSX guidance, pnpm monorepo, Node test runner for package tests, `rg`-based routing verification.

---

## File Structure

- Create `skills/openpress-create-pages/SKILL.md`: pages artifact creation workflow; includes workspace bootstrap, page Press tree, writing hierarchy, theme generation, verification, and handoff.
- Create `skills/openpress-create-slide/SKILL.md`: slide artifact creation workflow; includes workspace bootstrap, slide Press tree, Frame-based slide component generation, slide theme rules, deck structure, verification, and handoff.
- Delete `skills/openpress-init/SKILL.md`, `skills/openpress-writing/SKILL.md`, `skills/openpress-design/SKILL.md`, and `skills/openpress-create-theme/SKILL.md`.
- Modify `skills/openpress/SKILL.md`: update routing table, source boundary, starting workspace section, and upgrade/migration lifecycle owner.
- Modify `skills/openpress-apply-comments/SKILL.md`: route comment edits to `openpress-create-pages` / `openpress-create-slide` based on artifact type instead of old writing/design skills.
- Modify portable and starter skills:
  - `skills/chinese-ai-writing-polish/SKILL.md`
  - `skills/teaching-notes-writing/SKILL.md`
  - `skills/openpress-diagram-drawing/SKILL.md`
  - `skills/editorial-monograph/SKILL.md`
  - `skills/claude-document/SKILL.md`
  - starter MDX under `skills/editorial-monograph/starter/press/chapters/**`
- Modify docs and package guidance:
  - `README.md`
  - `AGENTS.md`
  - `docs/skills.md`
  - `packages/core/AGENTS.md`
  - `packages/cli/src/init.ts`
- Create `packages/core/tests/openpress-skill-catalog.test.mjs`: repository-level test that enforces the new skill catalog and rejects deleted skill names outside approved historical files.
- Modify `docs/superpowers/specs/2026-06-03-openpress-create-pages-slide-skills-design.md`: add lifecycle ownership clarification if it is missing from the spec.

### Approved Historical Matches

The final `rg` verification can still find old skill names in:

- `docs/superpowers/specs/2026-06-03-openpress-create-pages-slide-skills-design.md`
- `docs/superpowers/plans/2026-06-03-openpress-create-pages-slide-skills.md`
- changelog/migration history files such as `CHANGELOG.md`, `packages/*/CHANGELOG.md`, `docs/migrations/0.4.0.md`

All current routing, active docs, active bundled skills, starter content, and package templates must use the new names.

---

### Task 1: Add Catalog Regression Test

**Files:**
- Create: `packages/core/tests/openpress-skill-catalog.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `packages/core/tests/openpress-skill-catalog.test.mjs`:

```js
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
const skillsRoot = path.join(repoRoot, "skills");

const deletedSkills = [
  "openpress-init",
  "openpress-writing",
  "openpress-design",
  "openpress-create-theme",
];

const requiredSkills = [
  "openpress",
  "openpress-create-pages",
  "openpress-create-slide",
  "openpress-apply-comments",
  "openpress-deploy",
];

const historicalPathPatterns = [
  /^CHANGELOG\.md$/,
  /^docs\/migrations\//,
  /^docs\/superpowers\/specs\//,
  /^docs\/superpowers\/plans\//,
  /^packages\/cli\/CHANGELOG\.md$/,
  /^packages\/cli\/template\/core\/CHANGELOG\.md$/,
  /^packages\/core\/CHANGELOG\.md$/,
];

test("active skill catalog exposes create pages and create slide", async () => {
  const skillDirs = await readdir(skillsRoot);

  for (const skill of requiredSkills) {
    assert.ok(skillDirs.includes(skill), `missing required skill directory: ${skill}`);
    assert.ok(existsSync(path.join(skillsRoot, skill, "SKILL.md")), `missing SKILL.md for ${skill}`);
  }

  for (const skill of deletedSkills) {
    assert.equal(skillDirs.includes(skill), false, `deleted skill directory still exists: ${skill}`);
  }
});

test("active repository text does not route to deleted lifecycle skills", async () => {
  const matches = [];
  await scan(repoRoot, matches);

  const badMatches = matches.filter((match) => !historicalPathPatterns.some((pattern) => pattern.test(match.path)));
  assert.deepEqual(badMatches, []);
});

async function scan(dir, matches) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist-react") continue;
    if (entry.name === "public" || entry.name === ".deploy" || entry.name === ".openpress") continue;

    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await scan(absolute, matches);
      continue;
    }

    if (!/\.(md|mdx|ts|tsx|mjs|json)$/.test(entry.name)) continue;

    const relative = path.relative(repoRoot, absolute).replaceAll(path.sep, "/");
    const text = await readFile(absolute, "utf8");
    for (const skill of deletedSkills) {
      if (text.includes(skill)) matches.push({ path: relative, skill });
    }
  }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @open-press/core test:node -- openpress-skill-catalog.test.mjs
```

Expected: FAIL because `openpress-create-pages` and `openpress-create-slide` do not exist yet, and deleted skill directories still exist.

- [ ] **Step 3: Commit test**

```bash
git add packages/core/tests/openpress-skill-catalog.test.mjs
git commit -m "[test] add OpenPress skill catalog regression"
```

---

### Task 2: Add `openpress-create-pages`

**Files:**
- Create: `skills/openpress-create-pages/SKILL.md`

- [ ] **Step 1: Create the skill**

Create `skills/openpress-create-pages/SKILL.md`:

```markdown
---
name: openpress-create-pages
description: Use when the user wants to create, draft, scaffold, or add a page-based OpenPress artifact such as a report, proposal, whitepaper, paper, book, teaching note, handbook, or long-form document. This skill owns fresh workspace bootstrap for pages, adding a pages Press to an existing Workspace, page-based Press Tree generation, first-pass theme intake, page components, hierarchy, prose structure, captions, factual boundaries, and portable writing skill routing.
---

# OpenPress Create Pages

This skill is the user-facing creation workflow for page-based OpenPress artifacts.

`openpress-create-pages` owns artifact creation. The `openpress` skill owns ongoing system lifecycle: CLI command choice, validation, render/PDF/image export, deploy, doctor, upgrade, and migrate. The CLI `npx @open-press/cli init <target>` remains the low-level workspace scaffolder; this skill calls it only when a fresh workspace is needed.

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
test -f press/index.tsx && grep -q "<Workspace" press/index.tsx && echo EXISTING_WORKSPACE || echo FRESH_WORKSPACE
```

- `FRESH_WORKSPACE`: scaffold a new workspace first.
- `EXISTING_WORKSPACE`: add a pages Press to the current Workspace.
- If `press/index.tsx` exists but does not use `<Workspace>`, route to `openpress` for upgrade/migration before creating new content.

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
npx @open-press/cli init <target> --title "<title>"
```

Use `.` only when the user explicitly wants the current directory. The CLI rejects non-empty targets; do not use a force flag.

After init, continue with the pages Press Tree and theme steps below.

## 4. Existing Workspace Flow

Read `press/index.tsx` and identify existing `<Press>` children, slugs, page geometries, and source roots.

If adding a second Press to an implicit single-Press workspace, add a slug to the existing Press in the same edit. Ask the user for the new page Press slug; do not invent it when there is already more than one Press.

## 5. Pages Press Tree Contract

Default generated shape:

```tsx
import { Press, Workspace } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";

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
  <Toc />
  <Sections source="report" />
  <BackCover />
</Press>
```

Use per-Press folders for multi-Press workspaces:

```txt
press/<slug>/chapters/
press/<slug>/components/
```

Use shared `press/theme/` unless the user explicitly asks for a per-Press theme.

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
press/theme/tokens.css
press/theme/fonts.css
press/theme/base/page-contract.css
press/theme/base/typography.css
press/theme/base/print.css
press/theme/page-surfaces/
press/theme/shell/
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
```

- [ ] **Step 2: Run catalog test**

Run:

```bash
pnpm --filter @open-press/core test:node -- openpress-skill-catalog.test.mjs
```

Expected: still FAIL because `openpress-create-slide` is missing and deleted skills remain.

- [ ] **Step 3: Commit**

```bash
git add skills/openpress-create-pages/SKILL.md
git commit -m "[skill] add create pages workflow"
```

---

### Task 3: Add `openpress-create-slide`

**Files:**
- Create: `skills/openpress-create-slide/SKILL.md`

- [ ] **Step 1: Create the skill**

Create `skills/openpress-create-slide/SKILL.md`:

```markdown
---
name: openpress-create-slide
description: Use when the user wants to create, draft, scaffold, or add an OpenPress slide deck or presentation. This skill owns fresh workspace bootstrap for slides, adding a slides Press to an existing Workspace, slide Press Tree generation, first-pass slide theme intake, Frame-based slide component templates, deck narrative, slide density, assets, motion discipline, and verification.
---

# OpenPress Create Slide

This skill is the user-facing creation workflow for OpenPress slide decks.

`openpress-create-slide` owns artifact creation. The `openpress` skill owns ongoing system lifecycle: CLI command choice, validation, render/PDF/image export, deploy, doctor, upgrade, and migrate. The CLI `npx @open-press/cli init <target>` remains the low-level workspace scaffolder; this skill calls it only when a fresh workspace is needed.

## Responsibilities

- Start a fresh slide-based OpenPress workspace.
- Add a slide Press to an existing Workspace.
- Generate a slide Press Tree with `type="slides"` and `page="slide-16-9"` by default.
- Generate Frame-based slide components.
- Gather theme inputs and write the first slide visual system.
- Plan deck structure and slide roles.
- Enforce fixed-canvas slide authoring rules.
- Verify the deck before handoff.

## Boundary

| Owner | Scope |
| --- | --- |
| `openpress-create-slide` | Create or add slide decks, including structure, theme, slide components, assets, and deck narrative. |
| `openpress-create-pages` | Create or add page-based documents. |
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
test -f press/index.tsx && grep -q "<Workspace" press/index.tsx && echo EXISTING_WORKSPACE || echo FRESH_WORKSPACE
```

- `FRESH_WORKSPACE`: scaffold a new workspace first.
- `EXISTING_WORKSPACE`: add a slide Press to the current Workspace.
- If `press/index.tsx` exists but does not use `<Workspace>`, route to `openpress` for upgrade/migration before creating new content.

## 2. Intake

Gather these before writing files:

- Topic and audience.
- Title.
- Page count: 3-5, 6-10, 11-20, or custom.
- Text density: minimal, light, standard, or dense.
- Motion: static, subtle, or rich.
- Visual direction: three topic-specific options, unless the user supplied a brand/theme.
- Required assets: screenshots, logos, product images, team photos, charts.
- Target slug when adding to an existing multi-Press workspace.

Default page geometry is `slide-16-9`. Ask before using custom geometry.

## 3. Fresh Workspace Flow

Run:

```bash
npx @open-press/cli init <target> --title "<title>"
```

Use `.` only when the user explicitly wants the current directory. The CLI rejects non-empty targets; do not use a force flag.

After init, continue with the slide Press Tree and component steps below.

## 4. Existing Workspace Flow

Read `press/index.tsx` and identify existing `<Press>` children, slugs, page geometries, and source roots.

If adding a second Press to an implicit single-Press workspace, add a slug to the existing Press in the same edit. Ask the user for the new slide Press slug; do not invent it when there is already more than one Press.

## 5. Slide Press Tree Contract

Default generated shape:

```tsx
import { Press, Workspace } from "@open-press/core";
import Deck from "./slides";

<Press
  slug="slides"
  title="Deck Title"
  type="slides"
  page="slide-16-9"
  componentsDir="./slides/components"
  theme="./slides/theme"
>
  <Deck />
</Press>
```

Recommended folder layout:

```txt
press/slides/index.tsx
press/slides/components/SlideFrame.tsx
press/slides/components/TitleSlide.tsx
press/slides/components/SectionSlide.tsx
press/slides/components/AgendaSlide.tsx
press/slides/components/ContentSlide.tsx
press/slides/components/TwoColumnSlide.tsx
press/slides/components/QuoteSlide.tsx
press/slides/components/ImageSlide.tsx
press/slides/components/ClosingSlide.tsx
press/slides/theme/tokens.css
press/slides/theme/slides.css
press/slides/media/
```

## 6. Frame-Based Slide Component Contract

`Frame` is the engine primitive. Generated slide components are workspace authoring components.

`SlideFrame` must wrap `Frame`:

```tsx
import { Frame } from "@open-press/core";
import type { ReactNode } from "react";

export function SlideFrame({
  id,
  variant,
  children,
}: {
  id: string;
  variant: string;
  children: ReactNode;
}) {
  return (
    <Frame
      frameKey={id}
      role="canvas.slide"
      chrome={false}
      className={`op-slide op-slide--${variant}`}
    >
      <div className="op-slide__surface">
        <div className="op-slide__grid" aria-hidden="true" />
        <main className="op-slide__content">{children}</main>
      </div>
    </Frame>
  );
}
```

Initial template components:

- `TitleSlide`
- `SectionSlide`
- `AgendaSlide`
- `ContentSlide`
- `TwoColumnSlide`
- `QuoteSlide`
- `ImageSlide`
- `ClosingSlide`

Use `Text` from `@open-press/core` for source-backed text where inspector/comment editing should work.

## 7. Deck Structure Rules

Common roles:

| Role | Purpose |
| --- | --- |
| Cover | Title, subtitle, strong visual identity. |
| Agenda | Three to five promised sections. |
| Section | Chapter divider. |
| Content | One idea with 2-5 bullets or one visual. |
| Comparison | Two-column before/after or A/B. |
| Quote | Pull quote and attribution. |
| Image | One concrete visual with minimal text. |
| Closing | CTA, thank you, next step, or contact. |

One idea per slide. If a slide needs both a paragraph and a long bullet list, split it.

## 8. Slide Authoring Rules

- Design against a fixed 1920 x 1080 canvas.
- Use absolute pixel thinking for type, spacing, and image slots.
- Use 100-160 px content padding unless a slide is deliberately full-bleed.
- Keep body text large enough for projection.
- Do vertical budget math before writing dense slides.
- Never use scrollable slide content.
- Keep one coherent visual direction across the deck.
- Prefer explicit repeated component instances over `array.map` when inspector editability matters.
- Use real assets only when required by the deck topic.
- Static decks are valid. Use motion sparingly and keep one transition family if motion is used.

## 9. Theme Rules

Write or update:

```txt
press/slides/theme/tokens.css
press/slides/theme/slides.css
press/slides/components/
press/design.md or press/slides/design.md
```

Theme inputs:

- primary background
- primary text
- accent
- muted color
- display font
- body font
- brand mark or logo if supplied
- visual direction

Page geometry stays on `<Press page>`, not CSS.

## 10. Verify

Run:

```bash
npm run build
```

When image/PDF export matters:

```bash
npm run openpress:image
npm run openpress:pdf
```

Report:

- target path
- Press slug, title, and page geometry
- generated slide components
- theme paths written
- assets required from the user
- verification commands and results

## Do Not

- Do not route slide creation to deleted lifecycle skills.
- Do not use `npx @open-press/cli init` as an upgrade/migration tool.
- Do not edit generated output.
- Do not publish.
- Do not install dependencies for slide authoring.
```

- [ ] **Step 2: Run catalog test**

Run:

```bash
pnpm --filter @open-press/core test:node -- openpress-skill-catalog.test.mjs
```

Expected: still FAIL because deleted skill directories remain and active docs still reference them.

- [ ] **Step 3: Commit**

```bash
git add skills/openpress-create-slide/SKILL.md
git commit -m "[skill] add create slide workflow"
```

---

### Task 4: Delete Old Lifecycle Skill Directories

**Files:**
- Delete: `skills/openpress-init/SKILL.md`
- Delete: `skills/openpress-writing/SKILL.md`
- Delete: `skills/openpress-design/SKILL.md`
- Delete: `skills/openpress-create-theme/SKILL.md`
- Delete directories under:
  - `skills/openpress-writing/references/`
  - `skills/openpress-design/references/`

- [ ] **Step 1: Remove old skill files**

Run:

```bash
rm -rf skills/openpress-init skills/openpress-writing skills/openpress-design skills/openpress-create-theme
```

- [ ] **Step 2: Run catalog test**

Run:

```bash
pnpm --filter @open-press/core test:node -- openpress-skill-catalog.test.mjs
```

Expected: still FAIL because active docs and active skills still contain old routing text.

- [ ] **Step 3: Commit**

```bash
git add -A skills/openpress-init skills/openpress-writing skills/openpress-design skills/openpress-create-theme
git commit -m "[skill] remove lifecycle skill files"
```

---

### Task 5: Update Core Routing Skills

**Files:**
- Modify: `skills/openpress/SKILL.md`
- Modify: `skills/openpress-apply-comments/SKILL.md`
- Modify: `skills/openpress-deploy/SKILL.md`
- Modify: `skills/openpress-diagram-drawing/SKILL.md`
- Modify: `skills/chinese-ai-writing-polish/SKILL.md`
- Modify: `skills/teaching-notes-writing/SKILL.md`

- [ ] **Step 1: Update `skills/openpress/SKILL.md` routing table**

Replace the `## Skill Routing` table with:

```markdown
## Skill Routing

| Skill | Owns |
| --- | --- |
| `openpress` | CLI, inspect/search/replace, source/generated boundary, validation/export/render/PDF command choice, framework doctor/upgrade/migrate, skill routing |
| `openpress-create-pages` | Creating or adding page-based artifacts: reports, proposals, papers, books, teaching notes, page Press Tree, first-pass theme, hierarchy, prose structure, captions, portable writing skill loading |
| `openpress-create-slide` | Creating or adding slide decks: slide Press Tree, `slide-16-9` defaults, Frame-based slide components, deck structure, slide theme, motion/assets discipline |
| `openpress-apply-comments` | Pending `@openpress-comment` marker workflow: list, apply, resolve, clear, verify |
| `openpress-diagram-drawing` | Diagram semantics: nodes, arrows, labels, states, figure text |
| `openpress-deploy` | Deploy config, preflight, dry run, public publish confirmation |
| Portable writing skills (`chinese-ai-writing-polish`, `teaching-notes-writing`, …) | Language, tone, genre, learner-facing rules. Loaded by `openpress-create-pages` when page content requires them. |
```

- [ ] **Step 2: Update `skills/openpress/SKILL.md` missing workspace routing**

Replace:

```markdown
If a workspace lacks `press/index.tsx`, it has runtime files but no Press Tree source yet. Route to `openpress-create-press` or ask whether to initialize source files manually.
```

with:

```markdown
If a workspace lacks `press/index.tsx`, it has runtime files but no Press Tree source yet. Route to `openpress-create-pages` for page-based artifacts or `openpress-create-slide` for slide decks. Do not use `init` as a user-facing skill route.
```

- [ ] **Step 3: Update `skills/openpress/SKILL.md` starting workspace section**

Replace the `## Starting A New Workspace` section body with:

```markdown
Starting a new artifact is owned by `openpress-create-pages` or `openpress-create-slide`.

The CLI itself is still the low-level scaffolder:

```bash
npx @open-press/cli init <target>
```

Creation skills call that command when they need a fresh workspace, then add the appropriate Press Tree, theme, source folders, and components. `openpress` does not own intake for new artifacts.

Use `openpress` for system lifecycle work on existing workspaces: `doctor`, `upgrade`, `migrate`, validation, render, PDF/image export, deploy dry-runs, and source search/replace.
```

- [ ] **Step 4: Update `skills/openpress-apply-comments/SKILL.md` routing**

Replace old lines that say:

```markdown
  - `openpress-writing` for prose, hierarchy, captions, claims, tone, and narrative.
  - `openpress-design` for theme, layout, visual rhythm, and components.
```

with:

```markdown
  - `openpress-create-pages` for page prose, hierarchy, captions, claims, tone, narrative, page theme, and page components.
  - `openpress-create-slide` for deck narrative, slide density, slide theme, and Frame-based slide components.
```

- [ ] **Step 5: Update portable/specialist skill boundary text**

Use these replacements:

```txt
openpress-writing -> openpress-create-pages
openpress-design -> openpress-create-pages or openpress-create-slide, depending on artifact type
loaded via `openpress-writing` -> loaded by `openpress-create-pages`
```

Apply them manually to:

```txt
skills/openpress-deploy/SKILL.md
skills/openpress-diagram-drawing/SKILL.md
skills/chinese-ai-writing-polish/SKILL.md
skills/teaching-notes-writing/SKILL.md
```

- [ ] **Step 6: Run catalog test**

Run:

```bash
pnpm --filter @open-press/core test:node -- openpress-skill-catalog.test.mjs
```

Expected: still FAIL if docs/starter files still reference deleted skills.

- [ ] **Step 7: Commit**

```bash
git add skills/openpress/SKILL.md skills/openpress-apply-comments/SKILL.md skills/openpress-deploy/SKILL.md skills/openpress-diagram-drawing/SKILL.md skills/chinese-ai-writing-polish/SKILL.md skills/teaching-notes-writing/SKILL.md
git commit -m "[skill] update OpenPress routing ownership"
```

---

### Task 6: Update Starter Skills and Starter Content

**Files:**
- Modify: `skills/editorial-monograph/SKILL.md`
- Modify: `skills/claude-document/SKILL.md`
- Modify: `skills/editorial-monograph/starter/press/chapters/02-workflow/content/01-workflow.mdx`
- Modify: `skills/editorial-monograph/starter/press/chapters/03-agent-skills-contributors/content/01-agent-skills-contributors.mdx`

- [ ] **Step 1: Update starter skill boundary text**

Replace:

```markdown
Content rules (table captions, figure numbering, etc.) live in `openpress-writing`; this skill does not redefine them.
```

with:

```markdown
Page content rules (hierarchy, table captions, figure numbering, factual boundaries) live in `openpress-create-pages`; this skill does not redefine them.
```

in:

```txt
skills/editorial-monograph/SKILL.md
skills/claude-document/SKILL.md
```

- [ ] **Step 2: Update starter workflow examples**

In `skills/editorial-monograph/starter/press/chapters/02-workflow/content/01-workflow.mdx`, replace visible examples:

```txt
openpress-writing skill -> openpress-create-pages skill
```

and update the sentence explaining the workflow so it says `create-pages` owns page creation and `openpress` owns validation/export/deploy.

- [ ] **Step 3: Update contributor chapter routing table**

In `skills/editorial-monograph/starter/press/chapters/03-agent-skills-contributors/content/01-agent-skills-contributors.mdx`, replace the old routing rows with:

```markdown
| `openpress-create-pages` | 長文 Press 起手、章節順序、敘事結構、表格與 caption 文案、H1/H2/H3/H4 結構、TOC 深度、附錄位置、初始 theme 與 page components | 建立或重整報告、提案、講義、書籍 |
| `openpress-create-slide` | slide Press 起手、deck narrative、slide density、Frame-based slide components、slide theme | 建立或重整簡報 |
| `chinese-ai-writing-polish` | 繁體中文專業潤飾、去除 AI 腔 | 公開文件、提案、網站與報告文案 |
```

- [ ] **Step 4: Run catalog test**

Run:

```bash
pnpm --filter @open-press/core test:node -- openpress-skill-catalog.test.mjs
```

Expected: still FAIL if repo docs still reference deleted skill names.

- [ ] **Step 5: Commit**

```bash
git add skills/editorial-monograph/SKILL.md skills/claude-document/SKILL.md skills/editorial-monograph/starter/press/chapters/02-workflow/content/01-workflow.mdx skills/editorial-monograph/starter/press/chapters/03-agent-skills-contributors/content/01-agent-skills-contributors.mdx
git commit -m "[skill] update starter routing examples"
```

---

### Task 7: Update Docs, AGENTS, and CLI Next Steps

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/skills.md`
- Modify: `packages/core/AGENTS.md`
- Modify: `packages/cli/src/init.ts`
- Modify: `docs/superpowers/specs/2026-06-03-openpress-create-pages-slide-skills-design.md`

- [ ] **Step 1: Update README skill references**

Replace:

```markdown
Claude Code auto-loads `skills/openpress-init/SKILL.md` and walks you through intake.
```

with:

```markdown
Claude Code auto-loads the relevant creation skill: `skills/openpress-create-pages/SKILL.md` for page-based documents or `skills/openpress-create-slide/SKILL.md` for slide decks.
```

Replace:

```markdown
- H1/H2/H3/H4 hierarchy / TOC depth → see the "Hierarchy" section in `.agents/skills/openpress-writing/SKILL.md`.
```

with:

```markdown
- H1/H2/H3/H4 hierarchy / TOC depth → use `.agents/skills/openpress-create-pages/SKILL.md`.
```

Update the Copilot system prompt section so fresh starts say:

```txt
Starting from an EMPTY directory:
- First run `node -v`, `npm -v`, and `npx -v`. If missing, stop and tell me to install Node.js LTS, reopen the terminal, then retry.
- If I want a report, proposal, paper, book, teaching note, or other page-based artifact, follow `openpress-create-pages`.
- If I want a slide deck, follow `openpress-create-slide`.
- The create skill may run `npx @open-press/cli init .` after intake. Do not run init as an upgrade/migration tool.
```

- [ ] **Step 2: Update root `AGENTS.md`**

Replace:

```markdown
- **Skills carry opinions**: starter-bearing skills, writing skills, design skills.
```

with:

```markdown
- **Skills carry opinions**: create skills, starter-bearing skills, and portable language/genre skills.
```

Replace:

```markdown
Read it first to find the right specialist (writing, hierarchy, design, diagram, deploy, apply-comments).
```

with:

```markdown
Read it first to find the right specialist (create-pages, create-slide, diagram, deploy, apply-comments).
```

- [ ] **Step 3: Rewrite `docs/skills.md` catalog**

Update the catalog so it lists:

```markdown
| `openpress` | Operating the CLI, inspecting status, searching/replacing source text, validating/exporting/rendering, local workbench review, upgrading or migrating a workspace, choosing which specialist owns a task. |
| `openpress-create-pages` | Creating page-based artifacts: workspace bootstrap when needed, pages Press Tree, MDX source roots, hierarchy, prose structure, captions, factual boundaries, initial theme, page components. |
| `openpress-create-slide` | Creating slide decks: workspace bootstrap when needed, slide Press Tree, Frame-based slide components, deck structure, slide density, assets, motion discipline, initial slide theme. |
```

Remove active catalog rows for deleted skills.

- [ ] **Step 4: Update downstream template AGENTS**

In `packages/core/AGENTS.md`, replace the skills list with:

```markdown
- `openpress` — operate the workspace (CLI, validate, export, render, PDF, deploy, search/replace, comments, upgrades, migrations, routing).
- `openpress-create-pages` — create or restructure page-based documents.
- `openpress-create-slide` — create or restructure slide decks.
- `openpress-deploy` — deployment workflows.
- Plus any style-pack-specific or portable writing skills installed by the user.
```

Also update the upgrade section to keep `npx open-press upgrade` as the lifecycle owner and remove any reference to deleted skills.

- [ ] **Step 5: Update CLI next-step text**

In `packages/cli/src/init.ts`, replace:

```ts
"Use an OpenPress-ready skill to add or adapt the press source tree.",
```

with:

```ts
"Use openpress-create-pages for a page-based artifact or openpress-create-slide for a deck.",
```

- [ ] **Step 6: Add lifecycle clarification to spec**

In `docs/superpowers/specs/2026-06-03-openpress-create-pages-slide-skills-design.md`, add a section:

```markdown
## Lifecycle Ownership

`@open-press/cli init` remains the low-level workspace scaffolder. `openpress-create-pages` and `openpress-create-slide` are the user-facing artifact creation workflows that may call `init` for fresh workspaces.

`openpress` owns existing-workspace lifecycle operations: `doctor`, `upgrade`, `migrate`, validation, render, PDF/image export, deploy dry-runs, search/replace, and source/generated boundaries.
```

- [ ] **Step 7: Run catalog test**

Run:

```bash
pnpm --filter @open-press/core test:node -- openpress-skill-catalog.test.mjs
```

Expected: PASS or only historical changelog/migration/spec/plan references remain.

- [ ] **Step 8: Commit**

```bash
git add README.md AGENTS.md docs/skills.md packages/core/AGENTS.md packages/cli/src/init.ts docs/superpowers/specs/2026-06-03-openpress-create-pages-slide-skills-design.md
git commit -m "[doc] update create skill routing docs"
```

---

### Task 8: Final Verification and Cleanup

**Files:**
- No new files unless verification exposes a missing current reference.

- [ ] **Step 1: Run active deleted-name scan**

Run:

```bash
rg -n "openpress-init|openpress-writing|openpress-design|openpress-create-theme|/create-theme|openpress-create-press" README.md AGENTS.md docs packages skills press -g '!**/node_modules/**'
```

Expected: matches only in historical specs/plans/changelog/migration files. No matches in active skills, current docs, active starters, README, AGENTS, or package guidance.

- [ ] **Step 2: Run package tests**

Run:

```bash
pnpm --filter @open-press/core test:node
pnpm --filter @open-press/cli test
```

Expected: PASS.

- [ ] **Step 3: Run typecheck if package tests pass**

Run:

```bash
pnpm --filter @open-press/core typecheck
pnpm --filter @open-press/cli typecheck
```

Expected: PASS.

- [ ] **Step 4: Run build if typecheck passes**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Commit any cleanup**

If verification required fixes:

```bash
git add <fixed-files>
git commit -m "[skill] finish create skill split"
```

If no fixes were needed, do not create an empty commit.

## Self-Review

- Spec coverage: Tasks 2 and 3 add the new create skills; Task 4 deletes the old skills; Tasks 5-7 update routing, docs, starters, CLI next steps, and lifecycle ownership; Task 8 verifies repository-wide references and package health.
- Placeholder scan: The plan uses concrete paths, replacement text, and commands. It contains no implementation placeholders.
- Type consistency: The new skill names are consistently `openpress-create-pages` and `openpress-create-slide`; lifecycle ownership stays with `openpress`; CLI scaffolding remains `npx @open-press/cli init <target>`.
