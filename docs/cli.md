# CLI Reference

Most users let the AI agent run these commands. This page is the reference; the agent loads `skills/openpress/SKILL.md` for routing and verification rules.

## npm scripts

```bash
npm run dev                            # start local workbench
npm run openpress:validate             # validate workspace structure and delivery gates
npm run openpress:export               # generate public/openpress/document.json
npm run openpress:render               # build dist-react/
npm run openpress:preview              # preview production build
npm run openpress:pdf                  # generate PDF
npm run openpress:deploy:dry-run       # test deploy workflow without publishing
npm run openpress:deploy -- --confirm  # publish after explicit confirmation
```

## Direct CLI

```bash
node engine/cli.mjs --help
node engine/cli.mjs init <target> --skill <pack>   # start a new workspace from a style pack
node engine/cli.mjs inspect . --json
node engine/cli.mjs search . "keyword" --json
node engine/cli.mjs replace . "old" "new" --json   # preview only
node engine/cli.mjs replace . "old" "new" --apply  # writes changes
node engine/cli.mjs migrate-to-react . --dry-run   # legacy flat-Markdown → React MDX
```

## Safety notes

- `replace` previews by default and writes only with `--apply`.
- `search` and `replace` default to document content.
- Generated folders (`public/openpress/`, `dist-react/`, `.deploy/`, `.openpress/`) are never hand-edited.
- Public deploys always go through `openpress-deploy` and require explicit user confirmation naming the target project.

## Workspace layout

After `init`, your working document lives in `document/`:

```txt
document/
  openpress.config.mjs
  index.tsx           # document config plus cover, TOC, back-cover JSX
  chapters/           # chapter folders
    01-example/
      chapter.tsx     # optional opener/meta
      content/
        01-start.mdx
  design.md           # single design brief: tokens, components, CSS responsibilities
  components/         # document-specific visual components
  media/              # images and other assets
  theme/              # CSS tokens, typography, page surfaces, print rules
```

Framework code (root level — read-only from the document author's perspective):

```txt
engine/               # Node CLI and render pipeline
src/                  # React/Vite workbench
skills/               # bundled agent skills and style packs
tests/                # tests
```

## Authoring surface

| Source | Use For |
| --- | --- |
| `document/index.tsx` | document config plus `cover`, `toc`, `backCover` named JSX exports |
| `document/chapters/<NN-slug>/chapter.tsx` | optional chapter `meta` and `opener` named JSX export |
| `document/chapters/<NN-slug>/content/*.mdx` | reader-facing prose, tables, figures, MDX components |
| `document/components/` | shared document components |
| `document/theme/` | visual tokens, page surfaces, typography, print rules |

Legacy flat-Markdown workspaces convert with `node engine/cli.mjs migrate-to-react .`.

## Style pack layout

```txt
skills/<pack>/
  SKILL.md
  starter/
    openpress.config.mjs
    document/
      openpress.config.mjs
      index.tsx
      chapters/
      design.md
      theme/
      components/
      media/
```

See `skills/openpress-style-pack-contributor/SKILL.md` to design a new pack.
