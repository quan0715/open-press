# QDoc Validation Contract

Validation protects delivery boundaries. It should not police taste.

## Required Checks

- `qdoc.config.mjs` exists at the workspace root and parses.
- Configured `sourceDir` / `mediaDir` / `themeDir` / `designSystemDir` / `componentsDir` paths exist on disk.
- `design-system/` directory exists (even if empty).
- Public deploy adapters (`cloudflare-pages`, `github-pages`, `netlify`, `vercel`) must have `deploy.requiresConfirmation: true`. Other adapters are not gated.
- Content source directory exists and is non-empty (warning, not error, if no markdown files).
- PDF render succeeds before PDF delivery is claimed.
- Public deployment happens only after user confirmation.

Validation does NOT enforce:

- Which skills are loaded — `skills/` discovery is agent-driven; no registry file gates the list.
- Placeholder strings (`TODO` / `TBD` / `[必填]`) in generated output — `TBD` is legitimate prose in technical / financial documents; SKILLs guide the agent to use clearer markers like `[TODO: ...]` instead.
- Figure / table caption numbering — engine auto-normalises, no separate check.

## Optional Checks

- Style pack locked rules.
- PDF-safe CSS features.
- Image aspect ratios.
- Table density.
- Mobile responsive behavior or fixed-layout React workbench shell.

## Standard QDoc Workspace Commands

```bash
npm run test
npm run typecheck
npm run qdoc:validate
npm run qdoc:export
npm run qdoc:render
```

Only run Cloudflare deploy/update when the user asked for deployment or confirmed it:

```bash
npm run qdoc:deploy
```
