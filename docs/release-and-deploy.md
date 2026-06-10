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
2. **You merge the version PR** → workflow detects no pending changesets, runs `pnpm changeset publish`, pushes git tags. `@open-press/create`, `@open-press/cli`, and `@open-press/core` should ship together for major framework releases.

### One-time setup

#### 1.1 Configure npm Trusted Publishing

The release workflow publishes through npm Trusted Publishing (GitHub OIDC), not a long-lived `NPM_TOKEN`.

1. In npm, open each package under the `@open-press` scope:
   - `@open-press/create`
   - `@open-press/cli`
   - `@open-press/core`
2. Configure Trusted Publisher for repository `quan0715/open-press`, workflow `.github/workflows/release.yml`, and environment `main` / production according to npm's current UI.
3. Keep the workflow on Node 24 with npm `>=11.5.1`; lower Node/npm versions cannot complete the OIDC token exchange.

`GITHUB_TOKEN` is auto-provided by GitHub Actions, and the workflow grants `id-token: write` so npm can exchange the OIDC token at publish time.

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
npm login
pnpm changeset publish
```

Manual publishing uses your local npm login. The automated action uses Trusted Publishing plus the same `.changeset/config.json` lockstep rule.

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
   - `NODE_VERSION=24` (or rely on the repo `.node-version`)
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
- `pnpm --filter @open-press/create test`
- `pnpm --filter web build`

If CI fails on a PR, neither the release workflow nor the CF Pages deploy should be allowed to merge.
