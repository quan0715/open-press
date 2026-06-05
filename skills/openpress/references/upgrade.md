# Upgrade Workflow

Use this reference only when the user asks to upgrade open-press, check for a newer version, respond to an update notice, or verify a workspace after a framework pull.

## Detect

Run:

```bash
npx open-press doctor
```

Use `--json` when machine-readable output helps. Doctor is informational and exits 0 even when stale.

It reports:

- installed `@open-press/core` version vs latest npm version;
- installed skill count and lockfile source;
- pending migration notes.

## Apply

Ask the user before mutating the workspace. Then run:

```bash
npx open-press upgrade
```

`migrate` is an alias for the same workflow when the user's language is about
reading migration notes rather than upgrading dependencies:

```bash
npx open-press migrate --dry-run
```

Useful variants:

```bash
npx open-press upgrade --dry-run
npx open-press upgrade --no-skills
npx open-press upgrade --no-deps
```

The command updates dependencies/skills and surfaces migration notes. It does **not** rewrite `document/` content.

After the command completes, confirm to the user:
- Framework version: before → after (read from `node_modules/@open-press/core/package.json`).
- Skills updated to latest (unless `--no-skills` was used).

## Migration Notes

For each migration file printed by upgrade:

1. Read the migration file fully.
2. Look for **Document-level changes**.
3. Grep `document/` for the affected patterns.
4. Show the locations and apply document edits only after user confirmation.
5. If the migration note is missing or ambiguous, stop and ask.

Common document-level patterns:

| Change | Where |
| --- | --- |
| Runtime identifier rename, removed export, changed component signature | `press/*/press.tsx`, `press/<slug>/components/`, optional `press/shared/components/`, registered source implementation files |
| CSS class or token rename | `press/<slug>/theme/`, `press/shared/theme/`, `press/<slug>/components/` |
| Config schema change | `package.json` `"openpress"` field |
| MDX directive change | registered MDX files |
| Skill catalog rename/fold | `.agents/skills/`, `.claude/skills/`, user-authored skill references |

## Verify

After upgrade and any confirmed document edits:

```bash
npm run build              # validates + renders dist-react/
```

Run `npm run openpress:pdf` when PDF output is part of the user's delivery path.

## Do Not

- Do not skip migration notes.
- Do not bundle unrelated feature work with an upgrade.
- Do not use `--force` overwrites on workspace files.
- Do not auto-deploy after upgrade.
- Do not edit `document/` from migration notes without user confirmation.
