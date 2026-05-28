---
name: social-post
description: Use when starting or applying a fixed-size square social media post style pack for share cards, announcement tiles, quote posts, campaign cards, or image-first social publishing.
---

# Social Post

A minimal fixed-size square style pack for social media posts. It uses the
shared Press Tree primitives only: `Press`, `Sections`, `Frame`, and `MdxArea`.
The page geometry is declared through `config.page = "social-square"` so the
runtime, workbench toolbar, PDF route, and exported document metadata all share
one source of truth.

## Suitable for

- Instagram / Threads / LinkedIn square posts
- Quote cards
- Launch or event announcement tiles
- Simple carousel-style social documents where every page has the same size

## Not suitable for

- A4 long-form documents
- Slide decks
- Free-form image editors

## How to apply

```bash
npx @open-press/cli init <target> --pack social-post
```

Then edit:

- `document/chapters/**/content/*.mdx` for copy
- `document/index.tsx` for page structure
- `document/theme/tokens.css` for brand color and type

Keep the first version simple. Use one `MdxArea` per page; add bespoke React
components only after the post structure is stable.

