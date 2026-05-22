---
"@open-press/cli": minor
"@open-press/core": minor
---

Third bundled pack: `academic-paper`.

A single-column A4 academic / research paper starter — serif title block, abstract band, index terms, numbered sections (I, II, III), italic sub-sections (A, B, C), `[N]` numeric references, sample chapters derived from the IEEE conference template structure (Introduction, Methods, Results & Discussion, Acknowledgment, References).

```bash
npx @open-press/cli init my-paper --pack academic-paper
```

Suitable for: draft / preprint / iteration. Not suitable for camera-ready IEEE / ACM submission — those still need LaTeX with the publisher's class file.

Two-column body and other paged-document features (footnotes, cross-references with page numbers, running headers) are intentionally **out of scope for this release**. They'll be designed as a self-maintained engine evolution + multi-mode architecture in a separate spec round, rather than depending on a third-party pagination polyfill.
