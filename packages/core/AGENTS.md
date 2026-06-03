# Working on this open-press workspace

This directory is an **open-press workspace** scaffolded by
`@open-press/cli`. You (the agent) own:

- `document/` — chapters (MDX), components, theme, media. The actual content.
- `package.json` / `openpress.config.mjs` — project metadata + build config.
- `.agents/skills/` — agent skills installed by `npx skills` (auto-refreshed via `npx open-press upgrade`).

The rest of the tree is the open-press framework copied at scaffold time
(`engine/`, `src/`, `vite.config.ts`, etc). Treat it as vendored — don't
hand-edit unless the user explicitly asks; the next `npx open-press upgrade`
will rewrite it.

## Quick reference

```bash
npm run dev                  # workbench at http://127.0.0.1:5173/workspace
npm run build                # validate + render dist-react/
npm run openpress:image      # write dist-react/images/page-*.png
npm run openpress:pdf        # write document.pdf
npm run openpress:deploy     # deploy via the configured adapter
npx open-press doctor        # current vs latest version + pending migrations
npx open-press upgrade       # apply the upgrade flow (see below)
```

The intermediate engine steps live behind `node engine/cli.mjs` if you
need them directly (rarely): `validate` (source-level checks only,
fast), `export` (write `public/openpress/document.json` without
bundling), `inspect` (post-render geometry + comment markers).

## When the user asks to upgrade

Triggers: "升級 / 套件更新 / upgrade open-press / apply latest design /
update to vX.Y.Z" etc.

**Follow the upgrade SOP, do NOT manually diff template versions:**

1. `npx open-press doctor` — confirm current vs latest, count pending
   migrations.
2. Ask the user "go ahead?" — briefly mention what will change (deps,
   skills, migrations to read).
3. `npx open-press upgrade` — refreshes `@open-press/core`, refreshes
   installed skills, **fetches migration notes for each pending version
   into `.openpress/migrations/<version>.md`** and lists the paths.
4. For each migration file listed, read it fully. Each has a
   `Document-level changes` section with `rg` find + rewrite rules.
   Apply to `document/` with user confirmation.
5. Verify:
   ```bash
   npm run build
   ```
   Fix anything broken using the migration notes.
6. Report to the user: starting version → ending version, what was
   applied, anything that needed manual judgement.

**Anti-pattern**: running `npx @open-press/cli@latest init` somewhere
and manually diffing against the workspace. The migration notes are the
authoritative source for what changed; fresh templates ship default
content that does not apply to a customised workspace.

## When the user says "I changed X but the page didn't update"

Common cause: **the reader renders from a static `public/openpress/document.json`,
not from your live MDX / theme files.** Vite Hot Reload covers React UI
chrome (workbench panels, inspector, navigation) but it does **not**
regenerate `document.json`. So edits to:

- `document/chapters/**/*.mdx` (prose)
- `document/index.tsx` (Press tree, Cover/BackCover JSX)
- `document/components/**/*.tsx` (Page, openers, custom components)
- `document/theme/**` style files that affect pagination capacity
- `openpress.config.mjs` metadata (title, captionNumbering, …)

…all need a re-export before the workbench / public viewer reflect
the change:

```bash
npm run build              # validate + render (includes the export step)
# then refresh the browser
# — or, for the inner export only, without the full Vite bundle step:
node engine/cli.mjs export .
```

Quick rules of thumb:

- Pure CSS edits under `document/theme/` that don't move blocks → HMR
  is enough (CSS is hot-replaced).
- Anything that affects content, pagination, or metadata → re-build (or
  call `node engine/cli.mjs export .` for just the JSON refresh).

**Agent SOP**: after applying any non-CSS edit to `document/`, run
`npm run build` before telling the user "done". If they ask "why
didn't my change show up?", check whether `document.json` was
regenerated since the edit.

## When the user reports a render / paginate issue

Press Tree paginates at build time. Common things to check:

1. `npm run build` then inspect
   `public/openpress/document.json` for `source.warnings` (chain
   overflow, missing chains, etc.).
2. `node engine/cli.mjs validate .` for structural issues
   (missing entries, broken anchors) — faster than a full build.
3. `npm run dev` and use the workbench inspector to find which MDX
   block / Frame element is misbehaving — comments and inline
   annotations work directly from there.

## Skills

This workspace ships agent skills under `.agents/skills/`. If your
platform supports skills (Claude Code, Cursor, Codex, Cline, Gemini
CLI, …), prefer invoking them over re-reading this file:

- `openpress` — operate the workspace (CLI, validate, export, render,
  PDF, deploy, search/replace, comments, upgrades, migrations, routing).
- `openpress-create-pages` — create or restructure page-based documents.
- `openpress-create-slide` — create or restructure slide decks.
- `openpress-deploy` — deployment workflows.
- Plus any style-pack-specific or portable writing skills installed by the user.

Skills are kept in sync by `npx skills upgrade` (run automatically
inside `npx open-press upgrade`).

## Reporting issues

- Issues / questions: https://github.com/quan0715/open-press/issues
- Source: https://github.com/quan0715/open-press
