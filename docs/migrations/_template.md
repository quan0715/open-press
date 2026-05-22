# Migration: vX.Y.Z

> Replace `X.Y.Z` with the actual version. Rename this file to `<version>.md`
> (e.g. `0.5.0.md`). Delete unused sections; keep the headings the agent looks
> for. Brief, agent-readable.

## Summary

One-paragraph "what's the user-visible change" — the kind of sentence an agent
can read aloud to the user when they ask "what changed in v0.5.0?"

## Document-level changes

Edits that may need to land in the user's `document/` content. Each entry
should be runnable: a grep that finds the affected pattern, a clear rewrite
rule. Agents read this section and apply edits with user confirmation.

- (none) **— if no document edits needed, say so explicitly.**

Otherwise, list per change:

### `<old-thing>` → `<new-thing>`

- **Find**: `rg '<old-thing>' document/`
- **Replace**: rewrite each match to `<new-thing>`
- **Why**: <one-line rationale, e.g. "the table caption component was renamed">

## SKILL catalog changes

- Skills folded / renamed / removed. `npx skills upgrade` cleans up the
  `.agents/skills/` directory automatically.
- (none)

## CLI changes

- Renamed commands, removed flags, behavioural changes the user might notice
  when running `npm run openpress:<thing>`.
- (none)

## Runtime / API changes

- For users with custom `document/components/` that import from
  `@open-press/core` — renamed exports, changed prop names, removed types.
- (none)

## Manual steps

Anything the agent cannot automate that the user must do (e.g. log into a new
deploy provider, regenerate a token, accept a new `package.json` peer
dependency).

- (none)
