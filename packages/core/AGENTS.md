# Working on this open-press workspace

This directory is an **open-press workspace** scaffolded by
`@open-press/cli`. You (the agent) own:

- `press/` — one `press/<slug>/press.tsx` per Press, plus local chapters, components, theme, and media.
- `package.json` — workspace scripts and the `"openpress"` operation config.
- `.agents/skills/` — agent skills installed by `npx skills` (auto-refreshed via the local OpenPress CLI `upgrade` command).

The rest of the tree is the open-press framework copied at scaffold time
(`engine/`, `src/`, `vite.config.ts`, etc). Treat it as vendored — don't
hand-edit unless the user explicitly asks; the next local OpenPress CLI upgrade
will rewrite it.

## Quick reference

```bash
npm run dev                  # workbench at http://127.0.0.1:5173/workspace
npm run build                # validate + render dist-react/
npm run openpress:image      # write dist-react/images/page-*.png
npm run openpress:pdf        # write document.pdf
npm run openpress:deploy     # deploy via the configured adapter
node node_modules/@open-press/core/engine/cli.mjs doctor .   # current vs latest version
node node_modules/@open-press/core/engine/cli.mjs upgrade .  # apply the upgrade flow (see below)
```

The intermediate engine steps live behind `node engine/cli.mjs` if you
need them directly (rarely): `validate` (source-level checks only,
fast), `export` (write `public/openpress/workspace.json` and per-Press document JSON without
bundling), `inspect` (post-render geometry + comment markers).

## When the user asks to upgrade

Triggers: "升級 / 套件更新 / upgrade open-press / apply latest design /
update to vX.Y.Z" etc.

**Use the `openpress-upgrade` skill. Do NOT manually diff template versions:**

1. `node node_modules/@open-press/core/engine/cli.mjs doctor . --json` — confirm current vs latest.
2. `node node_modules/@open-press/core/engine/cli.mjs upgrade . --dry-run` — preview dependency and skill updates.
3. Ask the user before mutating dependencies, skills, or source.
4. `node node_modules/@open-press/core/engine/cli.mjs upgrade .` — refreshes `@open-press/core` and installed skills.
5. Read applicable `docs/migrations/<version>.md` files from the OpenPress repo
   where `currentVersion < version <= targetVersion`.
6. Scan `press/`, `package.json`, local skills, and relevant config using the
   migration docs' `Find` rules.
7. Apply confirmed source edits only.
8. Run the migration docs' Migration QA checkpoints, fixing and re-running until
   all pass or a blocker needs user input.
9. Report to the user: starting version → ending version, what was applied,
   which QA checkpoints passed, and anything that needed manual judgement.

**Anti-pattern**: running `npm create @open-press@latest` somewhere
and manually diffing against the workspace. The migration notes are the
authoritative source for what changed; fresh templates ship default
content that does not apply to a customised workspace.

## When the user says "I changed X but the page didn't update"

Common cause: **the reader renders from static `public/openpress/<slug>/document.json`,
not from your live MDX / theme files.** Vite Hot Reload covers React UI
chrome (workbench panels, inspector, navigation) but it does **not**
regenerate `document.json`. So edits to:

- `press/<slug>/chapters/**/*.mdx` (prose)
- `press/<slug>/press.tsx` (Press tree, Cover/BackCover JSX)
- `press/<slug>/components/**/*.tsx` (Page, openers, custom components)
- `press/<slug>/theme/**` style files that affect pagination capacity
- `package.json` `"openpress"` metadata (deploy/captionNumbering)

…all need a re-export before the workbench / public viewer reflect
the change:

```bash
npm run build              # validate + render (includes the export step)
# then refresh the browser
# — or, for the inner export only, without the full Vite bundle step:
node engine/cli.mjs export .
```

Quick rules of thumb:

- Pure CSS edits under `press/<slug>/theme/` that don't move blocks → HMR
  is enough (CSS is hot-replaced).
- Anything that affects content, pagination, or metadata → re-build (or
  call `node engine/cli.mjs export .` for just the JSON refresh).

**Agent SOP**: after applying any non-CSS edit to `press/`, run
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
  PDF, deploy, search/replace, comments, doctor, routing).
- `openpress-upgrade` — package upgrades, migration plans, source migrations,
  and Migration QA loops.
- `openpress-create-pages` — create or restructure page-based documents.
- `openpress-create-slide` — create or restructure slide decks.
- `openpress-deploy` — deployment workflows.
- Plus any style-pack-specific or portable writing skills installed by the user.

Skills are kept in sync by:

```bash
node node_modules/@open-press/core/engine/cli.mjs skills:sync .
```

The same refresh is run automatically inside the local OpenPress CLI `upgrade`
command.

## Reporting issues

- Issues / questions: https://github.com/quan0715/open-press/issues
- Source: https://github.com/quan0715/open-press
