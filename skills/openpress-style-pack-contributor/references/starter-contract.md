# Style Pack Starter Contract

## Starter Responsibilities

| Path | Responsibility |
| --- | --- |
| `starter/openpress.config.mjs` | root marker that points at `document/openpress.config.mjs` |
| `starter/document/index.tsx` | React document entry: `config`, `sources`, and default-exported Press tree |
| `starter/document/chapters/` | default manuscript MDX source convention for starter content |
| `starter/document/design.md` | single public-readable design brief (style positioning, tokens, components, CSS responsibilities) |
| `starter/document/theme/` | CSS tokens, fonts, base typography, page surfaces, patterns, shell rules, print safeguards |
| `starter/document/theme/fonts.css` | font-face imports or self-hosted font rules |
| `starter/document/theme/fonts/` | optional self-hosted `.woff2` files |
| `starter/document/components/` | reusable structured visual units |
| `starter/document/media/` | assets safe to ship with the pack |

The engine discovers a style pack by the presence of `starter/`.

Page surfaces are optional by document type. A report-focused pack can ship only cover, TOC, content, and back cover styling. A book/manual/teaching pack may also include `starter/document/theme/page-surfaces/chapter-opener.css`, but opener pages must be explicit workspace components used from `starter/document/index.tsx`; the engine does not auto-discover `chapter.tsx` opener exports.

## Typography Portability

Style packs own typography:

- `theme/tokens.css` names font tokens and fallback stacks.
- `theme/fonts.css` loads actual font faces.
- `theme/fonts/` stores self-hosted files when the pack must work without a CDN.

Do not rely on `local(...)` alone for public, mobile, iPad, or PDF-stable output. If a pack uses system fonts, document that output is not pixel-identical across devices.

## Validation Expectations

Validate through a scratch workspace, but do not define the command sequence in this style-pack reference. Use `openpress` for init, validate, export, render, PDF, and broader framework check commands.

Run PDF only when `openpress` determines the scratch workspace has the required app/runtime files. Run broader framework checks only when shared code changes.

## Review Checklist

Before calling the pack ready, confirm:

- one narrow, describable visual philosophy;
- portable typography policy;
- starter renders without missing assets or fonts;
- `openpress` can initialize and validate the pack through the current system-level workflow;
- dense paragraphs, tables, figures, captions, and long headings remain readable;
- starter Markdown tables demonstrate `<TableCaption>...</TableCaption>` instead of legacy prose markers or hand-written table numbers;
- PDF output does not overflow fixed pages when PDF validation is available;
- `design.md` teaches users and agents how to review the pack;
- no private content, customer data, tokens, or deploy secrets are included.
