---
"@open-press/cli": minor
"@open-press/core": minor
---

`@open-press/cli init` accepts third-party style packs via `--pack github:owner/repo`.

```bash
# bundled (unchanged)
npx @open-press/cli init my-doc --pack editorial-monograph

# third-party (new)
npx @open-press/cli init my-thesis --pack github:quan0715/openpress-pack-nycu-thesis
npx @open-press/cli init my-paper --pack github:foo/their-pack#v1.2
```

The cli fetches `starter/document/` from the named repo (default branch, or `#ref` for a specific branch/tag) and copies it into the new workspace. If the pack repo also publishes SKILL files at `skills/<name>/`, they're installed via `npx skills add <owner>/<repo>` after the framework skills, so the agent picks them up automatically.

Repo layout convention for third-party packs is documented in `docs/style-pack-authoring.md`. Empty-result extraction (the named repo exists but has no `starter/document/` at root) fails with a clear error pointing at the expected layout.

The two bundled packs (`editorial-monograph`, `claude-document`) keep their current short-name behaviour; only the cli's validator widened to accept the `github:` prefix.
