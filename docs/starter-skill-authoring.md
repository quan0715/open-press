# Authoring a Starter-Bearing Skill

OpenPress keeps opinionated starter content in skills. The CLI initializes a package-based workspace; the skill provides intake, taste, examples, starter files, and domain rules that an agent can copy or adapt into that workspace.

This is documentation, not an installed agent skill. Use it when maintaining built-in starter skills such as `editorial-monograph`, `academic-paper`, or external skills such as `openpress-social-card-skill`.

## Responsibility Split

| Layer | Owns |
| --- | --- |
| OpenPress CLI/runtime | Empty workspace scaffold, workbench, source model, validation, rendering, PDF/deploy/export commands |
| Starter-bearing skill | Intake, judgment, visual philosophy, starter files, examples, domain validation rules |
| Agent | Reads the skill, initializes OpenPress, copies/adapts the starter, renders, validates, and reports gaps |

OpenPress does not discover, fetch, or resolve external starter packages. A skill owns its own starter files.

## Skill Layout

Use a normal skill repo layout:

```txt
your-skill-repo/
├── README.md
├── LICENSE
└── skills/
    └── your-skill/
        ├── SKILL.md
        ├── references/
        └── starter/
            ├── package.openpress.json # optional settings snippet to merge into package.json
            └── press/
                ├── index.tsx
                ├── chapters/ or cards/
                ├── components/
                ├── design.md
                ├── media/
                └── theme/
```

`starter/press/index.tsx` should use the 1.0 authoring surface: `<Workspace>`, one or more `<Press>` children, `<Press sources>`, and explicit `page` geometry when the starter has a fixed format. Transitional exports such as `export const config` and `export const sources` may stay only when the currently validated runtime still needs them.

## Starter Responsibilities

| Path | Responsibility |
| --- | --- |
| `starter/press/index.tsx` | React entry: `<Workspace>`, `<Press>`, source registration, fixed page helpers |
| `starter/press/chapters/` or `starter/press/cards/` | Default MDX source convention for starter content |
| `starter/press/design.md` | Public-readable design brief: style positioning, tokens, components, review rules |
| `starter/press/theme/` | CSS tokens, fonts, base typography, page surfaces, shell rules, print safeguards |
| `starter/press/theme/fonts.css` | Font imports or self-hosted font rules |
| `starter/press/theme/fonts/` | Optional self-hosted `.woff2` files |
| `starter/press/components/` | Reusable structured visual units |
| `starter/press/media/` | Assets safe to ship with the starter, plus provenance notes |

Do not include generated output, private content, customer data, secrets, or deployment artifacts in a starter.

## Theme Contract

Starter-bearing skills own typography and visual defaults. A starter theme should include the runtime-required theme floor unless it deliberately depends on an existing workspace theme:

```txt
starter/press/theme/
├── tokens.css
├── fonts.css
├── base/
│   ├── page-contract.css
│   ├── typography.css
│   └── print.css
├── page-surfaces/
│   ├── cover.css
│   ├── toc.css
│   └── back-cover.css
└── shell/
    └── reader-controls.css
```

Use `patterns/` only when starter MDX or components actually depend on reusable utilities such as figure grids, chart frames, or table helpers.

Typography must be portable:

- `tokens.css` names font tokens and fallback stacks.
- `fonts.css` loads the actual font faces.
- `local(...)` alone is not enough for public, mobile, iPad, or PDF-stable output. If a starter uses system fonts, document that output is not pixel-identical across devices.

## User Flow

Install the skill first:

```bash
npx -y skills@latest add <owner>/<repo>
```

Then let the agent follow the skill. A typical bootstrap is:

```bash
npx @open-press/cli init my-doc
cd my-doc

SKILL_DIR="./.agents/skills/your-skill"
rm -rf press
cp -R "$SKILL_DIR/starter/press" press

npm run build
npm run dev
```

Installed skill paths differ by agent harness. Prefer checking local project paths first, then user-level paths:

```txt
./.agents/skills/<skill-name>
${CODEX_HOME:-$HOME/.codex}/skills/<skill-name>
$HOME/.claude/skills/<skill-name>
```

## Validation Expectations

Validate through a scratch workspace. Do not overwrite a user's current `press/` tree while testing a starter.

Recommended smoke:

```bash
npx @open-press/cli init /tmp/openpress-starter-smoke --no-git
cd /tmp/openpress-starter-smoke
npx -y skills@latest add <owner>/<repo>
rm -rf press
cp -R .agents/skills/<skill-name>/starter/press press
npm install
npm run build
open-press validate .
open-press inspect . --json --no-build
```

Run PDF/export checks when the current OpenPress runtime provides the needed command. If a command is missing, report it as an OpenPress substrate gap; do not build a skill-local renderer or validator to hide the missing capability.

## Review Checklist

Before calling the starter ready, confirm:

- one narrow, describable visual philosophy;
- starter renders without missing theme files, assets, or fonts;
- `design.md` explains how users and agents should review the starter;
- dense paragraphs, tables, figures, captions, and long headings remain readable;
- generated output is not committed into the starter;
- no private content, customer data, tokens, or deploy secrets are included;
- framework gaps are reported back instead of patched inside the skill.

## What Not To Do

- Do not ask OpenPress to fetch `github:owner/repo` starters.
- Do not ask the OpenPress CLI to fetch starters; it should not know external skill layouts.
- Do not make OpenPress responsible for a template marketplace.
- Do not duplicate OpenPress runtime behavior in the skill.
