---
name: openpress-deploy
description: Use when preparing, configuring, checking, staging, or publishing an open-press document to public hosting, especially Cloudflare Pages, deploy setup, deploy buttons, deploy status, public release checks, or safe deployment workflow.
---

# open-press Deploy

open-press deploy owns the public-release gate. Use it only when the user asks to configure, inspect, dry-run, or publish an open-press document.

## Responsibilities

- Inspect deploy config in the workspace `package.json` under the `"openpress.deploy"` field.
- Check target adapter, staging source, project name, and confirmation settings.
- Run deploy preflight and dry runs.
- Keep secrets out of source files.
- Require explicit confirmation before publishing.
- Report public URL and PDF URL after successful deploy.

## Boundaries

- `openpress` owns generic CLI usage, non-deploy validation, local review, and the source/generated boundary.
- `openpress-create-pages` owns page artifact content and visual readiness.
- `openpress-create-slide` owns slide deck content and visual readiness.
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
npm run build              # validates + renders dist-react/
```

Also scan public-facing source for unfinished markers:

```bash
rg "\\[TODO:|\\[FIX:|\\[DRAFT:" "press/*/chapters" press/design.md
```

### PDF Size Limit

Cloudflare Pages rejects any single file larger than 25 MB. A multi-press or image-heavy PDF commonly exceeds this limit.

Before including the PDF step, check the size:

```bash
du -sh .deploy/**/*.pdf 2>/dev/null || echo "No PDF in deploy folder"
```

If the PDF is over 25 MB (or if the user hasn't explicitly asked for PDF deploy):

- **Skip** `npm run openpress:pdf` and do not include the PDF in the deploy source.
- Tell the user: "The PDF is excluded from deploy to avoid the 25 MB per-file limit. You can download it locally with `npm run openpress:pdf` instead."
- If the user wants the PDF hosted publicly, recommend a separate host (Cloudflare R2, S3, etc.) and set `deploymentInfo.pdf` to the external URL in the workspace config.

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
