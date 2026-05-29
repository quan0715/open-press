---
"@open-press/core": major
"@open-press/cli": major
---

1.0 contract release. Breaking changes:

- `<Workspace>` is now required at the root of `press/index.tsx`; `<Press>` lives as a child, and multi-Press workspaces are first-class (each `<Press>` exports to `/openpress/<slug>/document.json`).
- Document metadata (`title` / `subtitle` / `organization` / `page` / `sources` / `captionNumbering`) moves onto `<Press>` JSX props. `export const config` and `export const sources` are removed.
- `openpress.config.mjs` is removed. Operational settings (deploy / pdf) live in the workspace `package.json` under the `"openpress"` field; paths are convention (`press/`, `press/<slug>/chapters/`, `press/theme/`, `public/openpress/`, `dist-react/`).
- Workspace folder renamed from `document/` → `press/`. The dogfood and starter skills are migrated.
- Reader gains a workspace gallery for multi-Press projects, per-page PNG export, page thumbnails for canvas-style Press, and a back-to-workspace button.
- New built-in page presets `a4`, `social-square`, `slide-16-9` and improved init metadata propagation.
