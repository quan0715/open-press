# Style Pack Starter Contract

## Starter Responsibilities

| Path | Responsibility |
| --- | --- |
| `starter/qdoc.config.mjs` | document identity and workspace paths |
| `starter/content/` | minimal coherent document: cover, TOC when useful, at least one chapter, optional back cover |
| `starter/design.md` | single public-readable design brief (style positioning, tokens, components, CSS responsibilities) |
| `starter/theme/` | CSS tokens, fonts, base typography, page surfaces, patterns, shell rules, print safeguards |
| `starter/theme/fonts.css` | font-face imports or self-hosted font rules |
| `starter/theme/fonts/` | optional self-hosted `.woff2` files |
| `starter/components/` | reusable structured visual units |
| `starter/media/` | assets safe to ship with the pack |

The engine discovers a style pack by the presence of `starter/`.

Page surfaces are optional by document type. A report-focused pack can ship only cover, TOC, chapter, and back cover styling. A book/manual/teaching pack may also include `starter/theme/page-surfaces/chapter-opener.css` for `kind: chapter-opener` pages. Chapter openers must be optional starter content, not a required page in every new workspace.

## Typography Portability

Style packs own typography:

- `theme/tokens.css` names font tokens and fallback stacks.
- `theme/fonts.css` loads actual font faces.
- `theme/fonts/` stores self-hosted files when the pack must work without a CDN.

Do not rely on `local(...)` alone for public, mobile, iPad, or PDF-stable output. If a pack uses system fonts, document that output is not pixel-identical across devices.

## Validation

Validate through a scratch workspace:

```bash
scratch="$(mktemp -d /tmp/qdoc-pack-XXXXXX)"
node engine/cli.mjs init "$scratch" --skill <pack>
node engine/cli.mjs export "$scratch"
node engine/cli.mjs validate "$scratch"
```

Run PDF when the scratch workspace has the required app/runtime files. Run broader framework checks when shared code changes:

```bash
npm run typecheck
npm test
```

## Review Checklist

Before calling the pack ready, confirm:

- one narrow, describable visual philosophy;
- portable typography policy;
- starter renders without missing assets or fonts;
- dense paragraphs, tables, figures, captions, and long headings remain readable;
- PDF output does not overflow fixed pages when PDF validation is available;
- `design.md` teaches users and agents how to review the pack;
- no private content, customer data, tokens, or deploy secrets are included.
