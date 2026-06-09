# Changelog

All notable changes to open-press are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The most recent 10 versions live in this file. Older versions move to `docs/changelog-archive/`.

## [2.0.0] — 2026-06-10

### Added

- **`@open-press/core/slides` export**: `DeckSlide`, `TitleSlide`, `StatementSlide`, `BlankSlide`, `TwoColumnSlide`, `CardGridSlide`, `ProcessSlide` — the full Slide Template Protocol now ships as a first-class export in `@open-press/core`. Import directly with `import { TitleSlide } from "@open-press/core/slides"`.
- **Slide Template Protocol**: compound-component interfaces for 6 standard slide layouts. Text always lives in JSX `children` (not props) so the Object Locator can track and write back text nodes. Each slot forwards `...props` to preserve injected `data-op-id`.
- **`op-*` slide design system**: Tailwind `@theme` tokens and `@layer components` classes scaled for 1920×1080 projection — `op-display` (96px), `op-title` (64px), `op-body` (32px), `op-card`, `op-callout`, and more.
- **Slide folder-per-slide architecture**: `press/<slug>/press.tsx` holds an ordered `<Slide id />` index; each slide lives in `press/<slug>/slides/<id>/slide.tsx` with `export const meta` and `export const notes`.

### Changed

- **Tailwind CSS v4**: full migration — `@import "tailwindcss"`, `@theme {}` token blocks, workbench and reader styles rewritten as Tailwind utilities. `@tailwind base/components/utilities` directives removed.
- **`npm create @open-press` starter**: new slides workspace now scaffolds a `BlankSlide` intro slide from `@open-press/core/slides` instead of a bare `<div>`.
- All packages bumped to `2.0.0`.

### Removed

- Removed `[Unreleased]` placeholder block (folded into this release).

## [0.3.0] — 2026-05-22

Initial monorepo release. Two packages published to npm in lockstep.

### Added

- **`@open-press/cli`** (new package): scaffolder shipped via `npx @open-press/cli init <target> --pack <pack>`. Bundles a framework snapshot in `template/` and copies it into the user workspace; supports `editorial-monograph` and `claude-document` style packs, metadata flags (`--title` / `--subtitle` / `--organization` / `--author`), and installs SKILL files under `.claude/skills/` and `.agents/skills/`.
- **`@open-press/core`** (new package): runtime primitives (`BasePage`, `BaseCoverPage`, `BaseTocPage`, `BaseBackCoverPage`, `BaseFigure`, `BaseCallout`), CLI engine, render pipeline. Bin: `open-press` (dev / build / preview / validate / pdf / deploy / export).
- Monorepo tooling: pnpm workspaces, turbo, changesets at repo root.
- `openpress-init` and `openpress-update` skills.

### Changed

- Repository restructured into a pnpm monorepo. `engine/` and `src/` moved into `packages/core/`. `skills/` stays at repo root for upstream consumption.
- Folded `openpress-apply-comments` into `openpress` as an Operations section.
- `openpress` SKILL is the single source of truth for source/generated boundary.
- `openpress-design` ↔ `openpress-style-pack-contributor` boundary split by path.
- README's start-in-30-seconds path is now `npx @open-press/cli init`.

### Removed

- Empty `skills/openpress-rounddev/` placeholder.
- `skills/openpress-writing/references/writing-skill-registry.md`; priority list inlined into `openpress-writing` SKILL.

## [Unreleased]

### Changed

- Split `openpress-apply-comments` back into a dedicated workflow skill for reading pending markers, applying source edits, clearing resolved comments, and verifying output.
- `openpress` SKILL is the single source of truth for the source / framework / generated path table. Other skills link instead of redefining.
- `openpress-design` ↔ `openpress-style-pack-contributor` boundary split by path (`document/theme/` vs `skills/<pack>/starter/document/theme/`) instead of by topic.
- `openpress-writing` owns the `<TableCaption>` placement rule; style packs no longer redefine it.
- Style pack apply flow unified to `node engine/cli.mjs init <target> --skill <pack>` across `claude-document` and `editorial-monograph`.
- AGENTS.md trimmed to current state; framework-boundary references to `core/` marked as planned with link to the template+SKILL spec.

### Removed

- Empty `skills/openpress-rounddev/` placeholder.
- `skills/openpress-writing/references/writing-skill-registry.md`; priority list inlined into `openpress-writing` SKILL.

## [0.2.0] — 2026-05-21

Initial public release under the **open-press** name (project was previously developed internally as QDoc).

### Added

- Template + SKILL distribution model.
- React/MDX rendering pipeline as the primary public surface.
- `BaseX` page primitives: `BasePage`, `BaseCoverPage`, `BaseTocPage`, `BaseBackCoverPage`, `BaseReportPage`, `BaseCallout`, `BaseFigure`.
- Build-time Puppeteer pagination with block-id bridge (AST-level, not HTML slicing).
- Bundled skills: `openpress`, `openpress-writing`, `openpress-design`, `openpress-document-hierarchy`, `openpress-diagram-drawing`, `openpress-deploy`, `openpress-style-pack-contributor`.
- Bundled style packs: `editorial-monograph` (hairline-driven long-form) and `claude-document` (warm working notes).
- Portable writing skills: `chinese-ai-writing-polish`, `teaching-notes-writing`.
- `openpress init <target> --skill <pack>` CLI for starter pack initialization.
- `@openpress-comment` inspector markers and apply/resolve workflow.

### Changed

- Project rebranded QDoc → open-press; all code identifiers, CSS classes, file paths, skill names, and config keys renamed.
- Repository scope broadened from "data structures notes" to general long-form documents (proposals, whitepapers, theses, books, manuals).
- Test suite consolidated; legacy framework-* tests removed in favor of React-pipeline tests under `tests/openpress-*.test.tsx`.

### Removed

- Legacy `<qdoc-component>` HTML bridge in the MDX compile pipeline.
- `data-qdoc-*` HTML attributes (renamed to `data-openpress-*`).
- npm-package distribution spec (`2026-05-21-qdoc-core-package-extraction.md`); superseded by the template+SKILL model.
