---
name: qdoc-deploy
description: Use when preparing, configuring, checking, staging, or publishing a QDoc document to public hosting, especially Cloudflare Pages, deploy setup, deploy buttons, deploy status, public release checks, or safe deployment workflow.
---

# QDoc Deploy

QDoc deploy is a public-release workflow. It must be explicit, reviewable, and reversible.

Use this skill when the user asks to deploy, set up deployment, inspect deploy status, wire a deploy button, or prepare a QDoc document for public sharing.

## Responsibilities

- Inspect `qdoc.config.mjs` and the resolved document config.
- Check `deploy.adapter`, `deploy.source`, `deploy.projectName`, and `deploy.requiresConfirmation`.
- Run preflight validation before any public deploy.
- Ask for explicit confirmation before updating a public URL.
- Keep deploy secrets out of the repo and out of QDoc config.
- Route UI deploy buttons through the same QDoc CLI deploy path.

## Public Deploy Rule

Never publish without a clear user confirmation that names the target.

Good confirmation prompt:

```txt
This will publish the current QDoc build to Cloudflare Pages project `<projectName>` from `<deploy.source>`.
Do you want me to deploy now?
```

Do not treat a general request like "finish this" or "make it live" as permission if the target project is missing or ambiguous.

## Setup Workflow

1. Discover the workspace and load QDoc config.
2. Confirm this is a document the user wants to make public.
3. Inspect deploy config and derive a suggested project name:
   - prefer explicit `deploy.projectName`;
   - else use a user-confirmed slug if the current setup conversation provides one;
   - else suggest a slugified document title, but do not write it without user confirmation.
4. Ask whether to create a new Cloudflare Pages project or use an existing one.
5. Write the confirmed deploy target into config:

```js
deploy: {
  adapter: "cloudflare-pages",
  source: ".deploy/<name>",
  projectName: "<cloudflare-pages-project>",
  commitDirty: false,
  requiresConfirmation: true,
}
```

6. If the project does not exist and the user wants a new Pages project, ask before running:

```bash
npx wrangler pages project create <projectName> --production-branch main
```

7. Verify Wrangler authentication outside source control. Do not write API tokens into any QDoc file.
8. Run a dry run before real deploy:

```bash
npm run qdoc:deploy:dry-run
```

If the workspace lacks that script, use:

```bash
node engine/cli.mjs deploy . --confirm --dry-run
```

Useful user-facing prompts:

```txt
請使用 qdoc-deploy skill 幫我檢查目前 QDoc 文件缺少哪些部署設定。
先不要公開上線。
```

```txt
請使用 qdoc-deploy skill 幫我建立 Cloudflare Pages 部署設定。
如果 config 有 deploy.projectName 就沿用；如果沒有，請用我確認的 slug。
```

```txt
請使用 qdoc-deploy skill 先做 dry run，確認目標 project、輸出目錄和 PDF 都正確。
```

## Preflight Before Real Deploy

Run these before public deployment:

```bash
npm run qdoc:export
npm run qdoc:validate
npm run qdoc:render
npm run qdoc:pdf
```

Also scan for unfinished markers in public-facing source:

```bash
rg "\\[TODO:|\\[FIX:|\\[DRAFT:" document content design-system
```

If there are unresolved markers, ask whether to keep, remove, or resolve them before publishing.

## Deploy Command

After preflight and explicit confirmation:

```bash
npm run qdoc:deploy -- --confirm
```

If the script is unavailable:

```bash
node engine/cli.mjs deploy . --confirm
```

The deploy command renders the React reader, stages the build under `deploy.source`, writes deploy metadata, prints the PDF into the staged output, and runs Wrangler Pages deploy.

After a successful deploy, report the public URL and the PDF URL if available. If the command only completed a dry run, say clearly that nothing was published.

## UI Button Contract

The future frontend deploy button should not invent a second deployment path.

It should:

- show deploy target, source, and status before publishing;
- block when `deploy.projectName` is missing;
- require confirmation before POSTing to the deploy endpoint;
- call the same CLI-backed endpoint that runs `node engine/cli.mjs deploy . --confirm`;
- show success URL, PDF URL, failure output, and dirty status after deployment.

The button is a review surface over this skill's workflow, not a replacement for the workflow.
