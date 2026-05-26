---
name: openpress-init
description: Use when the user wants to start a new open-press project, set up a fresh document workspace, pick a style pack for a new document, bootstrap a proposal/whitepaper/paper/teaching-note/spec/book, or run first-time initialization before content is written.
---

# open-press Init SOP

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
- If target is non-empty, do not use `--force` unless the user explicitly confirms overwriting/scaffolding into that directory.

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

## 3. Pack Choice

Resolve pack in this order:

1. If the user explicitly asks for blank/empty/minimal/no style: omit `--pack`.
2. If the user names a bundled pack: use it.
3. If the user gives a GitHub pack spec (`github:owner/repo` or `github:owner/repo#ref`): use it.
4. If the user asks for a custom style but no pack exists: choose the closest bundled pack, then route post-init visual changes to `openpress-design`.
5. If the user says "default" or gives no style preference: use `editorial-monograph` for formal long-form docs; otherwise use `claude-document`.
6. If still ambiguous, give at most two options and ask the user to choose.

Bundled pack map:

| Signal | Pack |
| --- | --- |
| proposal, whitepaper, report, product spec, long-form manuscript, book | `editorial-monograph` |
| working note, brief, memo, research summary, teaching note, medium document | `claude-document` |
| academic paper, conference-style article, abstract/references, numbered paper | `academic-paper` |

## 4. Init Command

Prefer metadata flags. Quote values.

```bash
npx @open-press/cli init <target> \
  --pack <pack> \
  --title "<title>" \
  --subtitle "<subtitle>" \
  --organization "<organization>" \
  --author "<author>"
```

Omit empty metadata flags. Add `--force` only after explicit confirmation from Step 1.

## 5. Verify

Inside the new workspace, run:

```bash
npm run openpress:validate
npm run openpress:export
npm run dev -- --dry-run
```

If any command fails, fix setup issues before handoff.

## 6. Handoff

Report only:

- target path
- selected pack
- metadata written
- verification result
- next editable paths: `document/chapters/`, `document/index.tsx`, `document/theme/`, `document/components/`
- next owning skill: writing -> `openpress-writing`, design -> `openpress-design`, deploy -> `openpress-deploy`

## Do Not

- Do not explain Node/npm unless preflight fails.
- Do not use `nvm`, Homebrew, pnpm, or global installs in the default path.
- Do not run `init` before environment, target, intake, and pack choice are settled.
- Do not hand-edit generated output.
- Do not write the first draft during init.
