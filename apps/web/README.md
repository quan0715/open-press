# open-press landing

Astro site for [open-press.dev](https://open-press.dev).

## Local dev

```bash
pnpm --filter web dev      # http://localhost:4321
pnpm --filter web build    # → apps/web/dist/
pnpm --filter web preview  # serve the build
```

## Brand source of truth

`src/styles/tokens.css` defines the open-press visual system (color, type, spacing, layout). Style packs and any future open-press surface should reference these tokens.

## Deploy to Cloudflare Pages

1. Create a new CF Pages project pointing at this repo
2. Build settings:
   - **Framework preset**: Astro
   - **Build command**: `pnpm install && pnpm --filter web build`
   - **Build output directory**: `apps/web/dist`
   - **Root directory**: leave empty (monorepo root)
   - **Environment variable**: `NODE_VERSION=22`, `PNPM_VERSION=10`
3. Connect domain `open-press.dev` (or `open-press.pages.dev` subdomain by default)
