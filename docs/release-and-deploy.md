# Release & deploy pipelines

Two automated pipelines back up `main`:

- **`.github/workflows/release.yml`** — npm publish on merge to main (changeset-driven)
- **Cloudflare Pages** — landing site auto-deploy (configured via Cloudflare dashboard)

## 1. npm release pipeline

### How it works

Built on [Changesets](https://github.com/changesets/changesets) + the official [`changesets/action`](https://github.com/changesets/action).

```
contributor commit              merged to main
─────────────────────────       ──────────────────
write code                      Release workflow runs
pnpm changeset → adds .md       │
push branch + open PR           ├─ pending changesets? → opens "chore: version packages" PR
                                │   (bumps versions, updates CHANGELOG, removes consumed .md files)
                                │
                                └─ no pending changesets (version PR just merged) →
                                    pnpm changeset publish → npm + git tags
```

Two cases the workflow handles automatically:

1. **You merged a feature PR that contains `.changeset/*.md` files** → workflow opens a `chore: version packages` PR. Review and merge to release.
2. **You merge the version PR** → workflow detects no pending changesets, runs `pnpm changeset publish`, pushes git tags. Both `@open-press/cli` and `@open-press/core` ship in lockstep.

### One-time setup

#### 1.1 Generate an npm publish token (bypass 2FA)

1. Go to https://www.npmjs.com/settings/quan0715/tokens/granular-access-tokens/new
2. Fill:
   - Name: `open-press-ci-publish`
   - Expiration: 365 days (longest)
   - **Two-Factor Authentication for publishing**: **uncheck**
   - Permissions: **Read and write**
   - Selected packages: scope `@open-press`
3. Generate token (`npm_xxx…`)

#### 1.2 Add the token to GitHub Secrets

1. Go to https://github.com/quan0715/open-press/settings/secrets/actions
2. **New repository secret**
3. Name: `NPM_TOKEN`
4. Value: paste the token
5. Save

That's all the workflow needs. `GITHUB_TOKEN` is auto-provided by GitHub Actions.

### Day-to-day flow

Every time you (or an agent) make a change worth releasing:

```bash
# from feature branch
pnpm changeset
# pick packages, pick bump (patch / minor / major), write a one-line summary
# commit the generated .changeset/<name>.md alongside your code
git add .changeset/<name>.md
git commit -m "[skill] thing"
```

Open PR → merge → release workflow does the rest.

For changes that **don't** need a release (docs, internal tooling, CI tweaks), skip `pnpm changeset` — no `.changeset/*.md` means no release.

### Manual override

If you ever need to publish manually (hotfix, dry run, etc.):

```bash
npm login  # or set up ~/.npmrc with the same token
pnpm changeset publish
```

The action and the manual command share the same token + the same `.changeset/config.json` lockstep rule.

---

## 2. Landing site auto-deploy (Cloudflare Pages)

The landing site lives in `apps/web/` (Astro). It needs a separate Cloudflare Pages project from the document showcase.

### One-time setup

1. Go to https://dash.cloudflare.com/?to=/:account/pages
2. **Create a project → Connect to Git → Select `quan0715/open-press`**
3. Configure build:

   | Field | Value |
   | --- | --- |
   | Project name | `open-press` (or similar — becomes `open-press.pages.dev` by default) |
   | Production branch | `main` |
   | Framework preset | Astro |
   | Build command | `pnpm install && pnpm --filter web build` |
   | Build output directory | `apps/web/dist` |
   | Root directory (advanced) | leave empty |

4. **Environment variables (advanced)**:
   - `NODE_VERSION=22`
   - `PNPM_VERSION=10`

5. **Save and Deploy**.

CF Pages will run the build on every push to `main`. PR builds produce preview URLs automatically (`<short-sha>.open-press.pages.dev`).

### Custom domain (later)

When you have a domain ready:

1. CF Pages project → **Custom domains** → **Set up a custom domain**
2. Add e.g. `open-press.dev` and follow the DNS instructions
3. Update `apps/web/astro.config.mjs`'s `site:` field to match

---

## Both pipelines verified by `.github/workflows/ci.yml`

CI runs on every push and PR:

- `pnpm --filter @open-press/core typecheck`
- `pnpm --filter @open-press/core test`
- `pnpm --filter @open-press/cli build`
- `pnpm --filter web build`

If CI fails on a PR, neither the release workflow nor the CF Pages deploy should be allowed to merge.
