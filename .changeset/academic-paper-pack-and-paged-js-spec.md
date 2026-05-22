---
"@open-press/cli": minor
"@open-press/core": minor
---

Third bundled pack: `academic-paper`. Plus the paged.js migration spec for v0.8.

**`academic-paper` (new pack)**

A single-column A4 academic / research paper starter — serif title block, abstract band, index terms, numbered sections (I, II, III), italic sub-sections (A, B, C), `[N]` numeric references, sample chapters derived from the IEEE conference template structure (Introduction, Methods, Results & Discussion, Acknowledgment, References).

```bash
npx @open-press/cli init my-paper --pack academic-paper
```

Suitable for: draft / preprint / iteration. Not suitable for camera-ready IEEE / ACM submission — those still need LaTeX with the publisher's class file.

**Two-column upgrade arrives in v0.8**

This pack ships single-column because our current pagination engine is block-by-block. Two-column body (with footnotes, `[N]` cross-references with page numbers, running headers, page X of Y, PDF outline) lands when we migrate to paged.js, which is the W3C CSS Paged Media polyfill. Validation gate: `academic-paper` upgrades to two-column as the proof of the migration.

Spec: `docs/superpowers/specs/2026-05-23-paged-js-migration.md`. Migration estimated at ~3.5 weeks once approved. Zero impact on existing pack users beyond a one-time `npx open-press upgrade`.
