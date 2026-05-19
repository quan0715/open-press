# Cloudflare Pages Deploy

## Config Shape

Write confirmed deploy settings into `qdoc.config.mjs`:

```js
deploy: {
  adapter: "cloudflare-pages",
  source: ".deploy/<name>",
  projectName: "<cloudflare-pages-project>",
  commitDirty: false,
  requiresConfirmation: true,
}
```

Prefer an explicit `deploy.projectName`. If it is missing, ask the user to confirm the project name before writing config or creating a Cloudflare Pages project.

## Setup Workflow

1. Discover the workspace and load QDoc config.
2. Confirm the document is intended for public hosting.
3. Inspect deploy config and derive the target:
   - use explicit `deploy.projectName`;
   - otherwise use a user-confirmed slug;
   - do not invent and write a public target silently.
4. Ask whether to create a new Cloudflare Pages project or use an existing one.
5. Verify Wrangler auth outside source control.
6. Run dry run before real deploy.

If creating a new project, ask before running:

```bash
npx wrangler pages project create <projectName> --production-branch main
```

## Secrets

Do not write API tokens or secrets into QDoc config, Markdown, design-system files, or skill files.

## UI Deploy Button Contract

A UI deploy button is a review surface over the CLI workflow. It should:

- show target, source, and status before publishing;
- block when `deploy.projectName` is missing;
- require confirmation before posting to the deploy endpoint;
- call the same CLI-backed deploy path;
- show success URL, PDF URL, failure output, and dirty status.

It must not create a second hidden deployment behavior.
