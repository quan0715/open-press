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
- installed skill count and lockfile source.

## Apply

Ask the user before mutating the workspace. Then run:

```bash
npx open-press upgrade
```

Useful variants:

```bash
npx open-press upgrade --dry-run
npx open-press upgrade --no-skills
npx open-press upgrade --no-deps
```

The command updates dependencies and skills. It does **not** rewrite workspace content.

After the command completes, confirm to the user:
- Framework version: before → after (read from `node_modules/@open-press/core/package.json`).
- Skills updated to latest (unless `--no-skills` was used).

## Verify

After upgrade:

```bash
npm run build              # validates + renders dist-react/
```

Run `npm run openpress:pdf` when PDF output is part of the user's delivery path.

## Do Not

- Do not bundle unrelated feature work with an upgrade.
- Do not use `--force` overwrites on workspace files.
- Do not auto-deploy after upgrade.
- Do not edit workspace content during upgrade unless the user explicitly asks for those source changes.
