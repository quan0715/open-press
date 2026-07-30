# Press Tree Render Boundary

- `press/<slug>/press.tsx` owns one rendered `<Press>` tree and its frame composition.
- `<Press sources>` registers MDX; helpers read registered sources, never hard-coded content folders.
- Relative `componentsDir` and `mediaDir` paths resolve from the owning Press; bare paths resolve from `press/`.
- `<Frame>` is the core page primitive. Covers, TOCs, openers, content pages, and back covers are frame compositions.
- `<MdxArea>` and manuscript helpers such as `<TocArea>` are measurable content slots. TOC pagination is an exported source chain, not a reader patch.
- Headers, footers, page numbers, and TOC layout belong to workspace components. The reader displays exported HTML; it must not repaginate or patch page chrome.
