# Migration: vX.Y.Z

> Replace `X.Y.Z` with the actual version. Rename this file to `<version>.md`
> (e.g. `0.5.0.md`). Delete unused sections; keep the headings the agent looks
> for. Brief, agent-readable.

## Summary

One-paragraph "what's the user-visible change" — the kind of sentence an agent
can read aloud to the user when they ask "what changed in v0.5.0?"

## Workspace source changes

Edits that may need to land in the user's `press/` source. Each entry
should be runnable: a grep that finds the affected pattern, a clear rewrite
rule. Agents read this section and apply edits with user confirmation.

- (none) **— if no workspace source edits are needed, say so explicitly.**

Otherwise, list per change:

### `<old-thing>` → `<new-thing>`

- **Find**: `rg '<old-thing>' press/`
- **Replace**: rewrite each match to `<new-thing>`
- **Why**: <one-line rationale, e.g. "the table caption component was renamed">

## SKILL catalog changes

- Skills folded / renamed / removed. `npx open-press skills:sync` refreshes the
  `.agents/skills/` directory automatically.
- (none)

## CLI changes

- Renamed commands, removed flags, behavioural changes the user might notice
  when running `npm run openpress:<thing>`.
- (none)

## Runtime / API changes

- For users with custom `press/<slug>/components/` that import from
  `@open-press/core` — renamed exports, changed prop names, removed types.
- (none)

## Manual steps

Anything the agent cannot automate that the user must do (e.g. log into a new
deploy provider, regenerate a token, accept a new `package.json` peer
dependency).

- (none)

## Migration QA

Every new migration doc must include checkpoints. Each checkpoint needs a
command or inspection step, the expected result, and what failure means. The
`openpress-upgrade` skill loops through these checkpoints until all pass or a
real blocker needs user input.

- **Checkpoint**: Workspace renders.
  - **Run**: `npm run build`
  - **Expected**: exits 0.
  - **If failing**: fix the failure using this migration doc before continuing.
