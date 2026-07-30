# open-press CLI Commands

Prefer package scripts. For commands without a script wrapper, use the `open-press` binary:

```bash
open-press <command> [path] [options]
```

In the framework repo (monorepo), use `node packages/core/engine/cli.mjs` instead — the binary is not built locally.

| Need | Command |
| --- | --- |
| Top-level usage | `open-press --help` |
| Build (validate + render React reader) | `npm run build` |
| Validate structure without rendering | `open-press validate .` |
| Export source to open-press JSON only | `open-press export .` |
| Open local workbench | `npm run dev` |
| Preview production build | `npm run preview` |
| Generate one PNG per page | `npm run openpress:image` |
| Generate PDF | `npm run openpress:pdf` |
| Generate Word DOCX for a page Press | `npm run openpress:word` |
| Inspect structure/issues as JSON | `open-press inspect . --json` |
| Search public source text | `open-press search . "<query>" --json` |
| Search all workspace source classes | `open-press search . "<query>" --json --scope all` |
| List pending inspector comments | `rg "@openpress-comment" press -n` |
| Preview replacement without writing | `open-press replace . "<from>" "<to>" --json` |
| Apply replacement after preview | `open-press replace . "<from>" "<to>" --apply` |
| Dry-run deploy workflow | `npm run openpress:deploy:dry-run` |
| Publish after confirmation | use `openpress-deploy` |

Command notes:

- `search` and `replace` default to `--scope content`.
- Add `--scope all` to also include `press/design.md`, component, media, and theme source.
- Add `--case-sensitive` only when casing matters.
- `replace` previews by default and writes only with `--apply`.
- `replace` does not touch code blocks unless `--include-code` is provided.
- Per-command `--help` may be sparse; use top-level usage and command error messages.
- Applying pending comment markers is an agent workflow, not a deterministic CLI replacement; use the `openpress-apply-comments` skill.
