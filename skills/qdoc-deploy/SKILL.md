---
name: qdoc-deploy
description: Use when preparing, configuring, checking, staging, or publishing a QDoc document to public hosting, especially Cloudflare Pages, deploy setup, deploy buttons, deploy status, public release checks, or safe deployment workflow.
---

# QDoc Deploy

QDoc deploy owns the public-release gate. Use it only when the user asks to configure, inspect, dry-run, or publish a QDoc document.

## Responsibilities

- Inspect deploy config in `qdoc.config.mjs`.
- Check target adapter, staging source, project name, and confirmation settings.
- Run deploy preflight and dry runs.
- Keep secrets out of source files.
- Require explicit confirmation before publishing.
- Report public URL and PDF URL after successful deploy.

## Boundaries

- `qdoc` owns generic CLI usage and non-deploy validation.
- `qdoc` owns local review before publishing.
- `qdoc-writing` and `qdoc-design` own document content and visual readiness.
- This skill owns public target confirmation and deploy execution.

## Public Deploy Rule

Never publish without a clear confirmation that names the target project.

Good confirmation shape:

```txt
This will publish the current QDoc build to Cloudflare Pages project `<projectName>` from `<deploy.source>`.
Do you want me to deploy now?
```

## Preflight

Before real deploy, run the commands that prove the output is ready:

```bash
npm run qdoc:export
npm run qdoc:validate
npm run qdoc:render
npm run qdoc:pdf
```

Also scan public-facing source for unfinished markers:

```bash
rg "\\[TODO:|\\[FIX:|\\[DRAFT:" document content design-system
```

## Deploy Commands

Dry run:

```bash
npm run qdoc:deploy:dry-run
```

Publish after explicit confirmation:

```bash
npm run qdoc:deploy -- --confirm
```

## When To Read References

- Read `references/cloudflare-pages.md` when creating or repairing Cloudflare Pages config, project setup, Wrangler auth expectations, or UI deploy-button behavior.
