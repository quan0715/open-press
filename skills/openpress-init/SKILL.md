---
name: openpress-init
description: Use when the user wants to start a new open-press project, invokes /create-press, sets up a fresh OpenPress workspace, bootstraps a proposal/whitepaper/paper/teaching-note/spec/book/deck/social campaign, or runs first-time initialization before content is written.
---

# open-press Init / Create Press SOP

Run this as a low-freedom setup workflow. Do not write document content during init.

## 0. Environment Preflight

Run:

```bash
node -v
npm -v
npx -v
```

Rules:

- If all commands work and Node is `>=20`: continue.
- If `node`, `npm`, or `npx` is missing: stop. Give the user the matching command below, tell them to install Node.js LTS, reopen the terminal, then rerun preflight.
- If Node is `<20`: stop. Tell the user to upgrade Node.js to an LTS version compatible with OpenPress, then rerun preflight.
- Do not run `init` until preflight passes.

Open Node.js LTS download page:

```bash
# macOS
open https://nodejs.org/en/download/

# Windows PowerShell
start https://nodejs.org/en/download/

# Linux desktop
xdg-open https://nodejs.org/en/download/ || printf '%s\n' 'https://nodejs.org/en/download/'
```

## 1. Target Check

Determine target:

- Use the user's target if provided.
- Use `.` only when the user explicitly wants current directory.
- If target exists, inspect it before init:
  ```bash
  TARGET="<target>"
  test -d "$TARGET" && find "$TARGET" -mindepth 1 -maxdepth 1 | sed -n '1,20p'
  ```
- If target contains `document/index.tsx`, route to existing-workspace skills instead of init.
- The CLI rejects non-empty targets automatically. A lone `.git/`, `.gitignore`, `.gitkeep`, or `.DS_Store` is OK (init treats those as harmless). If the target has real content, ask the user to clean it first — there is no `--force` flag.

## 2. Intake

Extract provided answers. Ask missing items in one batch only:

- document type
- audience
- primary language
- scope
- `title`
- `subtitle`
- `organization`
- `author`

Do not ask these by default. Ask only when the user's request mentions deploy, web-only output, scheduling, or delivery timing:

- public deploy intent
- PDF not needed
- deadline

## 3. Skill Handoff

OpenPress does not own starters or template selection. Resolve the next owner in this order:

1. If the user named a skill repo, install it with `npx -y skills@latest add <owner/repo>` and read its `SKILL.md` after init.
2. If the user wants a known flow already installed, route to that skill after init.
3. If no skill applies, create a minimal source tree only after confirming the user wants a blank OpenPress workspace.
4. If the user asks for visual design in an existing workspace, route post-init visual work to `openpress-design`.

## 4. Init Command

Prefer metadata flags. Quote values.

```bash
npx @open-press/cli init <target> \
  --title "<title>" \
  --subtitle "<subtitle>" \
  --organization "<organization>" \
  --author "<author>"
```

Omit empty metadata flags.

After init, the selected skill may copy or adapt its own starter/examples into `press/` or transitional `document/`. Do not ask OpenPress to fetch external starters.

## 5. Verify

Inside the new workspace, run:

```bash
npm run build
npm run dev -- --dry-run
```

If any command fails, fix setup issues before handoff.

## 6. Handoff

Report only:

- target path
- selected skill, if any
- metadata written
- verification result
- next editable paths: `press/` or `document/` source files added by the skill
- next owning skill: writing -> `openpress-writing`, design -> `openpress-design`, deploy -> `openpress-deploy`

## Do Not

- Do not explain Node/npm unless preflight fails.
- Do not use `nvm`, Homebrew, pnpm, or global installs in the default path.
- Do not run `init` before environment, target, intake, and skill handoff are settled.
- Do not hand-edit generated output.
- Do not write the first draft during init.
