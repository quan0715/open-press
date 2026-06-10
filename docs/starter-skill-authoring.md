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
                ├── <slug>/
                │   ├── press.tsx
                │   ├── chapters/ or cards/
                │   ├── components/
                │   ├── media/
                │   └── theme/
                ├── shared/
                │   └── theme/
                ├── design.md
```

`starter/press/<slug>/press.tsx` should render one `<Press>` with `slug`, `<Press sources>`, and explicit `page` geometry when the starter has a fixed format.

## Starter Responsibilities

| Path | Responsibility |
| --- | --- |
| `starter/press/<slug>/press.tsx` | React entry: `<Press>`, source registration, fixed page helpers |
| `starter/press/<slug>/chapters/` or `starter/press/<slug>/cards/` | Default MDX source convention for starter content |
| `starter/press/design.md` | Public-readable design brief: style positioning, tokens, components, review rules |
| `starter/press/shared/theme/` | Shared CSS tokens, fonts, base typography, page surfaces, shell rules, print safeguards |
| `starter/press/<slug>/theme/` | Artifact-specific theme rules |
| `starter/press/<slug>/components/` | Reusable structured visual units |
| `starter/press/<slug>/media/` | Assets safe to ship with the starter, plus provenance notes |

Do not include generated output, private content, customer data, secrets, or deployment artifacts in a starter.

## Theme Contract

Starter-bearing skills own typography and visual defaults. A starter theme should include the runtime-required theme floor unless it deliberately depends on an existing workspace theme:

```txt
starter/press/shared/theme/
├── tokens.css
├── fonts.css
├── base/
│   ├── page-contract.css
│   ├── typography.css
│   └── print.css
```

Put cover, back-cover, TOC, reader shell affordances, chart frames, image grids, and design specimens in React components with Tailwind classes by default. Use `page-surfaces/`, `shell/`, or `patterns/` only as legacy compatibility folders when a starter has existing CSS that cannot be moved safely yet.

Typography must be portable:

- `tokens.css` names font tokens and portable font stacks.
- `fonts.css` loads the actual font faces.
- `local(...)` alone is not enough for public, mobile, iPad, or PDF-stable output. If a starter uses system fonts, document that output is not pixel-identical across devices.

## User Flow

Install the skill first:

```bash
npx -y skills@latest add <owner>/<repo>
```

Then let the agent follow the skill. A typical bootstrap is:

```bash
npm create @open-press my-doc -- --type slides
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
npm create @open-press /tmp/openpress-starter-smoke -- --type slides --no-git
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
