# Changesets

This folder holds [Changesets](https://github.com/changesets/changesets) for the open-press monorepo.

## Adding a changeset

When you make a change that should produce a release, run:

```bash
pnpm changeset
```

Pick which packages changed, what kind of bump (patch / minor / major), and write a one-line summary. The CLI writes a markdown file into this folder.

## Releasing

`@open-press/create`, `@open-press/cli`, and `@open-press/core` ship together.
Changeset config enforces this through the `fixed` group.

Feature pull requests target `dev`, where Changesets accumulate. Dispatch
`.github/workflows/prepare-release.yml` to version `dev` and open a draft
`release/<version>` pull request to production-only `main`. Merging that pull
request runs `.github/workflows/release.yml` to publish the pre-versioned
packages.
