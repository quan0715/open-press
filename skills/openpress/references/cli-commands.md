# open-press CLI Commands

Prefer package scripts in the framework checkout. Use direct `node engine/cli.mjs ...` when a downstream workspace lacks scripts or when a command has no script wrapper.

| Need | Command |
| --- | --- |
| Top-level usage | `node engine/cli.mjs --help` |
| Migrate legacy Markdown workspace to React/MDX | `node engine/cli.mjs migrate-to-react . --dry-run` |
| Validate structure and delivery gates | `npm run openpress:validate` |
| Export source to open-press JSON | `npm run openpress:export` |
| Build React reader | `npm run openpress:render` |
| Open local workbench | `npm run dev` |
| Preview production build | `npm run openpress:preview` |
| Generate PDF | `npm run openpress:pdf` |
| Inspect structure/issues as JSON | `node engine/cli.mjs inspect . --json` |
| Search public source text | `node engine/cli.mjs search . "<query>" --json` |
| Search all workspace source classes | `node engine/cli.mjs search . "<query>" --json --scope all` |
| List pending inspector comments | `rg "@openpress-comment" document -n` |
| Preview replacement without writing | `node engine/cli.mjs replace . "<from>" "<to>" --json` |
| Apply replacement after preview | `node engine/cli.mjs replace . "<from>" "<to>" --apply` |
| Dry-run deploy workflow | `npm run openpress:deploy:dry-run` |
| Publish after confirmation | use `openpress-deploy` |

Command notes:

- `search` and `replace` default to `--scope content`.
- Add `--scope all` to also include `document/design.md`, component, media, and theme source.
- Add `--case-sensitive` only when casing matters.
- `replace` previews by default and writes only with `--apply`.
- `replace` does not touch code blocks unless `--include-code` is provided.
- Per-command `--help` is not implemented yet; use top-level usage and command error messages.
