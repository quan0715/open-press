# Changelog

All notable changes to open-press are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The most recent 10 versions live in this file. Older versions move to `docs/changelog-archive/`.

## [Unreleased]

### Added

- `openpress-init` skill: first-time intake conversation that gathers doc type, audience, language, scope, and metadata before running `init`.
- `openpress-update` skill: release upgrade flow with CHANGELOG-driven migrations and post-upgrade verification.

### Changed

- Folded `openpress-apply-comments` into `openpress` as an Operations section; `@openpress-comment` is now part of the core operation surface.
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

- Template + SKILL distribution model spec (`docs/superpowers/specs/2026-05-21-open-press-template-and-skill-init.md`).
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
