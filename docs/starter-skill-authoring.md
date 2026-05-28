# Authoring a Starter-Bearing Skill

OpenPress keeps starter content in skills so agents can read the rules, examples, and files together. The CLI initializes the OpenPress runtime; the skill guides the agent to copy or adapt its own starter into the workspace.

Skills such as `editorial-monograph`, `academic-paper`, and external domain skills like `openpress-social-card-skill` are normal skills that happen to include `starter/` files.

## Recommended model

| Layer | Owns |
| --- | --- |
| OpenPress CLI/runtime | Empty workspace scaffold, workbench, source model, validation, rendering, PDF/deploy commands |
| Skill | Intake, judgment, design rules, starter files, examples, domain validation |
| Agent | Reads the skill, initializes OpenPress, copies/adapts the starter, renders and verifies |

## Skill layout

Use a normal skill repo layout:

```txt
your-skill-repo/
├── README.md
├── LICENSE
└── skills/
    └── your-skill/
        ├── SKILL.md
        ├── references/
        ├── scripts/
        └── starter/
            └── document/   # transitional source root until press/ is universal
                ├── index.tsx
                ├── chapters/ or cards/
                ├── components/
                ├── design.md
                ├── media/
                └── theme/
```

The starter should be runnable after it is copied into an OpenPress workspace. During the 1.0 transition, `starter/document/index.tsx` may use `<Workspace><Press ... /></Workspace>` and mirror metadata through `<Press>` props, while keeping transitional `export const config` and `export const sources` if the current engine still needs them.

## User flow

Install the skill first:

```bash
npx -y skills@latest add <owner>/<repo>
```

Then let the agent follow the skill. A typical bootstrap is:

```bash
npx @open-press/cli@next init my-doc
cd my-doc

SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/your-skill"
rm -rf document
cp -R "$SKILL_DIR/starter/document" document

npm run build
npm run dev
```

For Claude Code, the installed skill path may live under `~/.claude/skills/<skill-name>` instead. The skill should document both harness conventions when it gives copy commands.

## What not to do

- Do not ask OpenPress to fetch `github:owner/repo` starters.
- Do not ask the OpenPress CLI to fetch starters; it should not know external skill layouts.
- Do not make OpenPress responsible for a template marketplace.
- Do not duplicate OpenPress runtime behavior in the skill.
