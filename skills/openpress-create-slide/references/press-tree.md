# Slide Press tree

Use this direct-source shape for a slide Press:

```text
press/<slug>/
├── press.tsx
├── theme/
│   └── default.css
├── ui/                         # only genuinely shared local primitives
│   └── SectionKicker.tsx
├── components/                 # optional richer reusable deck components
│   └── EvidenceGrid.tsx
└── slides/
    ├── intro/
    │   ├── slide.tsx
    │   └── hero.png
    └── evidence/
        └── slide.tsx
```

Rules:

- `press.tsx` is marker-only: register each source with `<Slide id="…" />`.
- Every slide folder owns a direct `slide.tsx` body.
- Keep active deck styling in `theme/default.css`.
- Add `ui/` and `components/` only for proven cross-slide reuse; keep slide-specific composition in its own source file.
- Never make a slide body depend on a manifest, registry, or deferred source choice.
