---
"@open-press/cli": minor
"@open-press/core": minor
---

**Press Tree render architecture** — full refresh of the React export pipeline (clean break, no v0.5 compatibility).

The render kernel no longer knows about `cover`, `toc`, `chapter`, or `back-cover` as built-in concepts. Workspaces describe their document as a React tree using three primitives:

- `Press` — root composition boundary.
- `Frame` — a single fixed-layout surface (replaces `BasePage` and friends).
- `MdxArea` — a measurable slot consuming a content chain, with `overflow="extend|truncate|error"` control.

Sources are now declarative descriptors:

```tsx
export const sources = {
  story: mdxSource({ preset: "section-folders", root: "chapters" }),
};

export default function MyPress() {
  return (
    <Press>
      <Cover />
      <Toc source="story" />
      <Sections source="story" page={Page} />
      <BackCover />
    </Press>
  );
}
```

Three `mdxSource()` presets: `section-folders` (existing convention), `section-files` (flat file-per-section), `file-list` (explicit ordering).

Manuscript helpers (`Toc`, `Sections`, `Chapters` alias) ship in `@open-press/core/manuscript`. `mdxSource()` lives in `@open-press/core/mdx`. Subpath exports keep the public surface tight without committing to separate npm packages.

**Removed (no compatibility layer):**

- `BasePage`, `BaseCoverPage`, `BaseTocPage`, `BaseContentPage`, `BaseBackCoverPage`.
- Legacy named exports (`cover`, `toc`, `backCover`) from `document/index.tsx`.
- The `migrate-to-react` CLI command.
- Implicit chapter discovery as the only source mechanism.
- Legacy `chapter.tsx` meta/opener auto-discovery. Section openers are explicit workspace components in the Press tree.

The top-level purity gate remains: `config` must be data, `sources` must be pure `mdxSource()` descriptors, and filesystem/network/process side effects are rejected before module execution. Default-exported function bodies can contain normal React component logic, including hooks and `.map()`.

All `<Frame>` instances require a stable `frameKey`; source roots and file-list entries must stay inside `document/`.

**Workspace data attributes:**

- `data-frame-role` (new, opaque role like `"manuscript.content"`).
- `data-page-kind` (derived from role's last segment — reader CSS keeps using this).
- `data-section-id` replaces `data-chapter-slug` for section-scoped CSS.

**Migration:** Workspaces written for v0.5.x must rewrite `document/index.tsx` to default-export a Press component. Pre-1.0 minor bump is acceptable per repo policy; no production deployments exist to break.

See `docs/superpowers/specs/2026-05-23-press-tree-render-architecture-design.md` for full design rationale.
