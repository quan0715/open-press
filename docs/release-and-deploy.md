# Release & deploy pipelines

`dev` is the integration branch. `main` is the production branch and must only
contain released, pre-versioned code.

- **`.github/workflows/prepare-release.yml`** — versions `dev` and opens a draft
  `release/<version>` pull request to `main`
- **`.github/workflows/release.yml`** — publishes the pre-versioned packages
  after that release pull request merges
- **Cloudflare Pages** — deploys the landing site from `main`

## 1. npm release pipeline

### Branch model

```text
feature/* → dev → release/<version> → main → npm and GitHub Releases
                                 published main → sync PR → dev
```

- Feature and fix pull requests target `dev`, never `main`.
- Changesets accumulate on `dev`.
- A manually dispatched Prepare release workflow checks out `dev`, runs
  `pnpm changeset version`, validates the generated metadata, and opens a draft
  release pull request to `main`.
- Pull requests to `main` fail CI unless their branch is named `release/*` and
  all pending Changesets have been consumed.
- Merging a release pull request runs `pnpm changeset publish`; it does not open
  another version pull request.
- After publication, the workflow opens a `main` → `dev` pull request so version
  metadata, changelogs, and consumed Changesets return to the integration line.

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

### Day-to-day development

Every time you (or an agent) make a change worth releasing:

```bash
# start from the integration branch
git switch dev
git pull --ff-only
git switch -c codex/<change>

pnpm changeset
# pick packages, pick bump (patch / minor / major), write a one-line summary
# commit the generated .changeset/<name>.md alongside your code
git add .changeset/<name>.md
git commit -m "[skill] thing"

# feature PRs always target dev
gh pr create --base dev
```

For changes that **don't** need a release (docs, internal tooling, CI tweaks), skip `pnpm changeset` — no `.changeset/*.md` means no release.

### Prepare and publish a release

After the desired changes have merged into `dev`:

```bash
gh workflow run prepare-release.yml --ref main
```

The workflow derives the version from Changesets and opens a draft
`release/<version>` pull request. Review its full diff, wait for CI, perform any
manual staging checks, then mark it ready and merge it normally. The merge to
`main` publishes npm packages and creates GitHub Releases.

Do not merge more feature work into a release branch. New work continues on
`dev` and waits for the next release.

After publication, review and merge the generated `main` → `dev`
synchronization pull request before preparing another release.

### First-release bootstrap

`workflow_dispatch` workflows must already exist on the default branch. The
first release that introduces this branch model therefore needs one manual
release branch. First merge this infrastructure PR and at least one
release-bearing feature PR into `dev`; the current 3.1.1 feature Changeset is a
valid first payload. Stop if the following inventory prints nothing:

```bash
git switch dev
git pull --ff-only
find .changeset -maxdepth 1 -type f -name "*.md" ! -name README.md -print

git switch -c release/next
pnpm changeset version
pnpm install --lockfile-only
version=$(node -p "require('./packages/core/package.json').version")
git branch -m "release/${version}"
git add .changeset packages/create packages/cli packages/core pnpm-lock.yaml
git commit -m "release: ${version}"
git push -u origin "release/${version}"
gh pr create --base main --head "release/${version}" --draft
```

Once that release reaches `main`, use the Prepare release workflow for future
releases.

### Required GitHub branch rules

After the first release installs these workflows on `main`, configure:

- `main`: require pull requests and the `release-policy` and `test` checks;
  block force pushes and direct pushes.
- `dev`: require pull requests and the `test` check; block force pushes.

The repository can remain defaulted to `main`; specifying `--base dev` for
feature pull requests avoids accidentally targeting production.

### Pre-release inventory

Before merging a feature PR to `dev`, run a short inventory across the user-facing
surfaces that ship with the packages:

1. **Source boundary** — release source changes belong in `packages/`, `apps/`,
   `skills/`, `docs/`, or dogfood `press/`; do not hand-edit
   `public/openpress/`, `dist-react/`, `.deploy/`, or `.openpress/`.
2. **Docs and skills** — active docs and bundled skills should agree on the
   current architecture: per-Press source folders, framework-owned page shell /
   print reset / default prose, Tailwind-first React components, optional
   `press/shared/`, and external starter-bearing skills.
3. **Starter policy** — retired bundled starters must stay out of `skills/`.
   Route new work to `openpress-create-pages`, `openpress-create-slide`, or an
   installed external starter skill.
4. **Page geometry** — generic formats may use presets; project-specific formats
   should show custom `<Press page={{ id, label, width, height }}>` objects.
5. **Changeset coverage** — runtime, CLI, or create-package behavior changes need
   a changeset. Docs-only changes can skip changesets unless they are part of a
   package-facing release note.

Local state checklist:

```bash
git status --short
git branch --show-current
gh auth status
find .changeset -maxdepth 1 -type f -name "*.md" ! -name README.md -print
```

Release gate:

```bash
node --test tests/press-lint.test.mjs
pnpm --filter @open-press/core test:node
pnpm run typecheck
pnpm --filter web build
git diff --check
pnpm changeset status --since origin/dev
```

For dogfood, CSS, or runtime rendering changes, refresh the exported dogfood
documents before visual review:

```bash
node packages/core/engine/cli.mjs export . --renderer react
```

### Emergency manual publish

Prefer the same `dev` → `release/*` → `main` path for hotfixes. If npm must be
recovered after a release commit already reached `main`:

```bash
npm login
pnpm changeset publish
```

Manual publishing uses your local npm login. The automated workflow uses
Trusted Publishing plus the same `.changeset/config.json` lockstep rule.

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

CI runs on pushes and pull requests for both `dev` and `main`:

- repository branch and release workflow contract tests
- `pnpm --filter @open-press/core typecheck`
- `pnpm --filter @open-press/core test`
- reader browser tests
- `pnpm --filter @open-press/cli build`
- `pnpm --filter @open-press/create test`
- `pnpm --filter web build`

If CI fails, do not merge the feature or release pull request.
