---
name: openpress-upgrade
description: Use when upgrading an OpenPress workspace, checking or applying a newer framework version, responding to update notices, preparing before migration, reading migration notes, generating or implementing a migration plan, or looping through migration QA checkpoints until the workspace passes.
---

# OpenPress Upgrade

`openpress-upgrade` owns framework package upgrades and workspace migrations.
Use `openpress` for command/source-boundary routing, then use this skill for
the upgrade and migration workflow.

## Responsibilities

- Detect installed and target OpenPress versions.
- Refresh framework packages and installed OpenPress skills after confirmation.
- Select applicable migration docs from the OpenPress repo.
- Scan workspace source before editing.
- Generate and implement migration plans from the docs.
- Run migration QA checkpoints in a loop until all pass or a blocker needs user input.

## Source Boundaries

Use the source/generated boundary from `openpress`. During migration, edit only:

- `press/`
- root `package.json`, especially the `"openpress"` field
- local skill files in `.agents/skills/` or `.claude/skills/`
- project config explicitly named by a migration doc

Do not hand-edit `node_modules/`, `public/openpress/`, `dist-react/`,
`.deploy/`, `.openpress/`, or `.turbo/cache/`.

## Workflow

### 1. Inspect

Run:

```bash
git status --short
npx open-press doctor --json
```

Record:

- current `@open-press/core` version;
- target/latest version from doctor;
- installed OpenPress skills and lockfile source;
- unrelated dirty files that must not be touched.

Doctor is informational and exits 0 even when stale. If latest version cannot
be checked, report the network limitation and do not guess the migration range.

### 2. Preview

Run:

```bash
npx open-press upgrade --dry-run
```

Explain that `npx open-press upgrade` updates dependencies and skills. It does
not rewrite workspace content.

### 3. Confirm Before Mutation

Ask before running commands or edits that mutate dependencies, skills, or
workspace source.

After confirmation, run:

```bash
npx open-press upgrade
```

Useful variants when the user asks for a narrower update:

```bash
npx open-press upgrade --no-skills
npx open-press upgrade --no-deps
```

After the command completes, confirm:

- framework version before -> after, reading from
  `node_modules/@open-press/core/package.json` when available;
- skills updated to latest, unless `--no-skills` was used.

### 4. Select Migration Docs

Migration docs live in the OpenPress repo under `docs/migrations/<version>.md`.
Select each doc where:

```txt
currentVersion < version <= targetVersion
```

If a release has no migration doc, treat it as no workspace migration required.
Do not invent migration steps from changelog text.

### 5. Scan Workspace Source

For each selected migration doc, run every `Find` command or pattern against
the current workspace source. Prefer the migration doc's exact command; adapt
only old `document/` paths to the current `press/` tree when the workspace uses
the modern source layout.

Scan at least:

```bash
rg '<pattern-from-migration-doc>' press package.json .agents/skills .claude/skills
```

Skip missing optional directories without treating them as failure.

### 6. Generate And Apply Plan

Summarize matched migration work before editing:

- affected migration versions;
- matched files and patterns;
- proposed source edits;
- manual steps the agent cannot perform;
- QA checkpoints that must pass.

Apply workspace source edits only after the user confirms the migration plan.
Keep edits limited to the migration doc. Do not bundle unrelated refactors,
design changes, content rewrites, or deploy work.

### 7. Migration QA Loop

Run every checkpoint in each selected migration doc's `## Migration QA`
section. A checkpoint must include a command or inspection, expected result,
and what failure means.

If a checkpoint fails:

1. Diagnose the failure against the migration doc.
2. Apply the smallest source fix that satisfies the checkpoint.
3. Re-run the failed checkpoint.
4. Re-run any later checkpoints that could be affected by the fix.

Do not report migration complete until every applicable checkpoint passes.
If a checkpoint cannot pass without user input or an external change, report
the blocker with the exact failing command and output.

For older migration docs without `## Migration QA`, fall back to:

- all `Manual steps`;
- checks implied by `Runtime / API changes`;
- default build verification:

```bash
npm run build
```

Run `npm run openpress:pdf` only when PDF output is part of the user's delivery
path or a migration doc explicitly requires it.

## Migration Doc Policy

Create `docs/migrations/<version>.md` only when a release affects existing
workspaces. A migration doc is required for:

- `press/` source layout changes;
- `package.json` or `"openpress"` config changes;
- public `@open-press/core` API changes;
- CLI command, flag, or behavior changes;
- bundled skill catalog or routing changes;
- generated workspace/document schema changes;
- deploy, PDF, render, pagination, or page-contract behavior that may require
  source edits or output verification.

A migration doc is not required for:

- internal system bug fixes with no workspace action;
- workbench-only UI polish;
- docs-only changes;
- tests or package metadata;
- new-template-only design updates that do not change existing workspaces.

If a release can visually shift existing output without requiring a source
rewrite, write a verify-only migration doc with QA checkpoints.

## Do Not

- Do not use `npm create @open-press` or a fresh template diff as the source of
  migration truth.
- Do not auto-deploy after upgrade.
- Do not use force overwrites on workspace files.
- Do not edit generated output.
- Do not claim upgrade or migration readiness without fresh command output.
