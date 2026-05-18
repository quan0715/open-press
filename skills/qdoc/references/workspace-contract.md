# QDoc Workspace Contract

QDoc workspaces are file-based. Agents should be able to inspect, edit, validate, and render them without hidden state.

## Required

```txt
qdoc.config.mjs        # workspace marker; engine walks up from cwd to find it
```

Nothing else is required. `skills/` lists available agent skills; agents discover them by directory and read each `SKILL.md` description.

## Common Directories

```txt
document/content/
               document source
document/media/
               images and binary assets
document/components/<name>/
               every inline visual unit is a self-contained package.
               Markdown calls `<qdoc-component name="<package>" />`.
               Two shapes:
                 Workspace renderer: component.mjs / schema.json /
                   style.css / README.md / data.json
                   (+ optional data.<variant>.json for reuse)
                 Built-in chart: data.json (with chartType: bar|line|donut) /
                   style.css / README.md
                   used for chart variants and named figure treatments.
document/theme/
               document visual system. Layers:
                 tokens.css       CSS variables only
                 base/            global rules (page contract, typography, print)
                 page-surfaces/   whole-page surfaces routed by kind: frontmatter
                                  (cover.css, back-cover.css, toc.css, ...)
                 patterns/        generic, shared class-based patterns that
                                  any chapter can invoke (_chart-frame,
                                  figure-grid, table-utilities). No one-off
                                  or instance-scoped CSS here — those go to
                                  document/components/<name>/style.css.
                 shell/           reader controls; not document typography.
document/design-system/
               public-readable design configuration document
src/           root React/Vite QDoc app source
public/qdoc/
               generated QDoc JSON and public reader assets; do not hand edit
engine/     primary Node-first QDoc CLI and adapters
skills/        local skills and style packs
dist-react/    generated React/Vite app output; do not hand edit
.deploy/      deployment sync output
```

## Registry Rules

- Keep portable skills independent.
- Do not copy a portable skill's full rules into QDoc core.
- Use priority order to resolve conflicts.
- Public deployment must require confirmation.

## Content Adapter

QDoc uses a Node QDoc markdown source pipeline as a content adapter:

```txt
document/content/*.md -> engine/cli.mjs export -> public/qdoc/document.json
```

Do not replace the canonical source format unless the user explicitly asks.

Document identity (title / subtitle / organization / workspaceLabel) lives in `qdoc.config.mjs`. The workspace shell reads it from there and does not infer project identity from folder names or split document titles:

```js
// qdoc.config.mjs (or document/qdoc.config.mjs in a nested layout)
export default {
  title: "Document title",        // required
  subtitle: "Project subtitle",   // optional
  organization: "Project name",   // optional
  workspaceLabel: "QDoc Workspace", // optional; falls back to title
  // ...path keys, deploy, etc.
};
```

`content/*.md` files are scanned by filename order; each file's frontmatter `kind:` (`cover` / `toc` / `chapter` / `back-cover`; defaults to `chapter`) dispatches the renderer. Chapter numbering is auto-assigned by the order files appear. No `_manifest.yaml` is required.

## Root React/Vite App

The app is valid when the registry contains:

```yaml
adapters:
  react_renderer:
    type: react-vite-document
    root: .
    config: vite.config.ts
    dist: dist-react
```

Use it for all QDoc component work. The root React/Vite QDoc app is the delivery surface for preview, PDF, and Pages deployment.

Use `engine/cli.mjs` as the primary adapter surface.

## Editable Source Mapping

QDoc export should preserve source mapping:

```json
{
  "kind": "htmlPage",
  "source": {
    "path": "document/content/03-problem.md"
  }
}
```

AI edits should target the source markdown path, then regenerate the QDoc document model.
