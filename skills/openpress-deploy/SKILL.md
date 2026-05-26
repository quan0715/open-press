---
name: openpress-deploy
description: Use when preparing, configuring, checking, staging, or publishing an open-press document to public hosting, especially Cloudflare Pages, deploy setup, deploy buttons, deploy status, public release checks, or safe deployment workflow.
---

# open-press Deploy

open-press deploy owns the public-release gate. Use it only when the user asks to configure, inspect, dry-run, or publish an open-press document.

## Responsibilities

- Inspect deploy config in `openpress.config.mjs`.
- Check target adapter, staging source, project name, and confirmation settings.
- Run deploy preflight and dry runs.
- Keep secrets out of source files.
- Require explicit confirmation before publishing.
- Report public URL and PDF URL after successful deploy.

## Boundaries

- `openpress` owns generic CLI usage, non-deploy validation, local review, and the source/generated boundary.
- `openpress-writing` and `openpress-design` own document content and visual readiness.
- This skill owns public target confirmation and deploy execution.

## Public Deploy Rule

Never publish without a clear confirmation that names the target project.

Good confirmation shape:

```txt
This will publish the current open-press build to Cloudflare Pages project `<projectName>` from `<deploy.source>`.
Do you want me to deploy now?
```

## Preflight

Before real deploy, run the commands that prove the output is ready:

```bash
npm run openpress:export
npm run openpress:validate
npm run openpress:render
npm run openpress:pdf
```

Also scan public-facing source for unfinished markers:

```bash
rg "\\[TODO:|\\[FIX:|\\[DRAFT:" document/chapters document/design.md
```

## Deploy Commands

Dry run:

```bash
npm run openpress:deploy:dry-run
```

Publish after explicit confirmation:

```bash
npm run openpress:deploy -- --confirm
```

## When To Read References

- Read `references/cloudflare-pages.md` when creating or repairing Cloudflare Pages config, project setup, Wrangler auth expectations, or UI deploy-button behavior.
