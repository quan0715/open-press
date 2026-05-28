---
name: slide-deck
description: Use when starting or applying a fixed 16:9 slide deck style pack for talks, workshops, product walkthroughs, teaching decks, or presentation-style documents.
---

# Slide Deck

A minimal 16:9 style pack for slide-like OpenPress documents. It keeps the
first implementation deliberately simple: every slide is a `Frame` with one
`MdxArea`, and the page geometry is declared through
`config.page = "slide-16-9"`.

## Suitable for

- talks and workshops
- product walkthroughs
- teaching decks
- short narrative decks exported to PDF

## Not suitable for

- long-form A4 documents
- free-form Canva-style visual editing
- publisher-specific slide templates

## How to apply

```bash
npx @open-press/cli init <target> --pack slide-deck
```

Each top-level section under `document/chapters/` becomes a slide. Keep slide
copy short; use React components later for diagrams or repeated visual systems.

