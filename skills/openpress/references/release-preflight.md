# Release Preflight

Use this reference when the user asks for release readiness, release inventory,
or final documentation/skill checks before publishing OpenPress.

## Scope

Release preflight checks the framework-facing surfaces that users and agents
consume after a package release:

- package source and tests under `packages/`;
- active docs under `docs/` and `apps/web/src/content/docs/`;
- bundled skills under `skills/`;
- dogfood source under `press/`;
- changesets for any package behavior change.

Do not rewrite historical records such as old changelog entries,
`docs/superpowers/specs/**`, or `docs/superpowers/plans/**` just because they
describe past architecture.

## Inventory Checklist

1. Confirm source boundaries:
   - no hand-edited generated output is part of the release;
   - dogfood source lives under `press/<slug>/`;
   - `press/shared/` appears only when it is an intentional shared asset pool.
2. Confirm CSS ownership:
   - framework owns generic page shell, print-route reset, measurement CSS, and
     default MDX prose behavior;
   - Press folders own local `theme/tokens.css` and `theme/fonts.css`;
   - new work does not ship `base/page-contract.css`, `base/print.css`, or
     `base/typography.css` in workspace/starter themes.
3. Confirm multi-Press isolation:
   - each Press has its own CSS chunks or local theme roots;
   - Tailwind v4 `@theme` values are generic or variable-backed;
   - artifact-specific values are scoped to the owning Press/component.
4. Confirm page geometry docs:
   - generic presets remain documented as presets;
   - project-specific formats use custom `<Press page={{ id, label, width, height }}>`.
5. Confirm starter policy:
   - retired bundled starter skills are not present in `skills/`;
   - active docs route users to `openpress-create-pages`, `openpress-create-slide`,
     or external starter-bearing skills;
   - CLI docs do not imply OpenPress fetches external starters.
6. Confirm package release metadata:
   - any runtime, CLI, or create-package behavior change has a changeset;
   - docs-only changes do not need a changeset unless they ship with package docs.

## Commands

Run the narrow checks that match the touched surface, then run the release gate:

```bash
node --test tests/press-lint.test.mjs
pnpm --filter @open-press/core test:node
pnpm run typecheck
pnpm --filter web build
```

For dogfood or CSS/runtime changes, also refresh export output before visual
review:

```bash
node packages/core/engine/cli.mjs export . --renderer react
```

When PDF or image export changed:

```bash
npm run openpress:pdf
npm run openpress:image
```

## Report

Report release readiness as a compact inventory:

- source boundary findings;
- docs and skill surfaces updated;
- changeset status;
- verification commands and results;
- remaining release risks or explicit skips.
