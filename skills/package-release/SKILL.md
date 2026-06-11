---
name: package-release
description: Use when preparing, unblocking, or completing OpenPress framework package releases, including local change inventory, docs/skill preflight, changeset/version PR handling, GitHub release workflow monitoring, npm publish verification, and release PR writing.
---

# Package Release

Framework-maintainer workflow for releasing OpenPress packages. Use this only in
the OpenPress framework repo, not downstream workspaces.

## Responsibilities

- Inventory local release-bound changes before staging or opening a PR.
- Check active docs and bundled skills for stale release-facing guidance.
- Confirm changeset coverage for package-affecting changes.
- Write release PRs with concrete scope and verification.
- Merge the generated Changesets version PR when the release is ready.
- Monitor GitHub Actions and verify npm/GitHub Releases after publish.

## Preflight

Run:

```bash
git status --short
git branch --show-current
git remote -v
gh auth status
gh repo view --json nameWithOwner,defaultBranchRef
```

If the worktree is mixed, stage explicit paths only. Do not stage generated
output such as `public/openpress/`, `dist-react/`, `.deploy/`, `.openpress/`, or
temporary scripts.

## Local Change Inventory

Classify the diff before writing a PR:

```bash
git diff --stat
git diff --name-only
find .changeset -maxdepth 1 -type f -name "*.md" ! -name README.md -print
```

Expected buckets:

- runtime/framework: `packages/core/`
- CLI/scaffold: `packages/cli/`, `packages/create/`
- landing/docs: `apps/web/`, `docs/`
- bundled skills: `skills/`
- dogfood verification: `press/`, `tests/press-lint.test.mjs`

Package-affecting changes need a changeset. Docs-only or skill-only changes may
skip npm release unless they are intentionally part of a package release note.

## Docs And Skill Preflight

Use the catalog test as the authority for retired lifecycle/starter skill names:

```bash
node --test packages/core/tests/openpress-skill-catalog.test.mjs
```

Then scan active docs and skills for stale CSS/source-boundary language,
excluding historical specs/plans/changelogs:

```bash
rg -n 'press/shared/theme|shared/theme|base/page-contract\.css|base/print\.css|base/typography\.css|theme must define|page contract' \
  docs skills apps/web/src/content/docs packages/cli/README.md README.md
```

Allowed hits:

- historical specs/plans/changelogs;
- text that explicitly says not to use a retired surface;
- type/reference entries for still-supported API values such as
  `social-square`.

Fix active docs/skills when they route users to removed lifecycle skills,
bundled starters, shared theme baselines, or workspace-owned page shell CSS.

## Verification Gate

Run the narrow checks first, then the release gate:

```bash
node --test packages/core/tests/openpress-skill-catalog.test.mjs
node --test tests/press-lint.test.mjs
pnpm --filter @open-press/core test:node
pnpm run typecheck
pnpm --filter web build
git diff --check
pnpm changeset status --since main
```

If `pnpm changeset status --since main` says no changesets but package files
changed, add or stage the missing changeset. If the changeset is untracked,
stage it before re-running the command.

## Release PR

Use a branch name like:

```bash
codex/release-<short-scope>
```

PR body must include:

- what changed;
- why it changed;
- user/developer impact;
- checks run;
- changeset status;
- explicit notes about intentionally unstaged files.

Open release-bound PRs as draft unless the user asks for ready review.

## Publishing

After the release PR merges to `main`, the first release workflow run opens a
Changesets version PR named `chore: version packages`. That PR does not publish.

To complete publish:

```bash
gh pr list --state open --json number,title,headRefName,baseRefName,url,statusCheckRollup
gh pr view <version-pr> --json files,body,statusCheckRollup,url
```

Confirm it only bumps package versions, updates changelogs, and removes consumed
changesets. Merge it when ready:

```bash
gh pr merge <version-pr> --merge --delete-branch
```

If branch policy blocks direct merge and auto-merge is disabled, use admin merge
only after confirming the PR is the generated version PR:

```bash
gh pr merge <version-pr> --merge --delete-branch --admin
```

Monitor publish:

```bash
gh run list --workflow release.yml --limit 5
gh run watch <run-id> --exit-status
```

Verify packages and releases:

```bash
npm view @open-press/core version
npm view @open-press/cli version
npm view @open-press/create version
gh release list --limit 8
```

Report the exact npm versions, release workflow URL, version PR number, and any
manual override used.
