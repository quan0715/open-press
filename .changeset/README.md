# Changesets

This folder holds [Changesets](https://github.com/changesets/changesets) for the open-press monorepo.

## Adding a changeset

When you make a change that should produce a release, run:

```bash
pnpm changeset
```

Pick which packages changed, what kind of bump (patch / minor / major), and write a one-line summary. The CLI writes a markdown file into this folder.

## Releasing

`@open-press/cli` and `@open-press/core` ship in lockstep — bumping one bumps the other. Changeset config enforces this via the `fixed` group.

Releases are automated via `.github/workflows/release.yml` (added in Phase G of the migration spec).
