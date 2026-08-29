# Press Tree & Folder Contract

## Pages Press Tree Default Shape

```tsx
import { Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, Toc } from "@open-press/core/manuscript";

export default function ReportPress() {
  return (
    <Press
      slug="report"
      title="Report Title"
      type="pages"
      page="a4"
      sources={[
        mdxSource({ id: "report", preset: "section-folders", root: "report/chapters" }),
      ]}
    >
      <Cover />
      <Toc source="report" maxLevel={2} />
      <Sections source="report" />
      <BackCover />
    </Press>
  );
}
```

## Recommended Folder Layout

```txt
press/<slug>/press.tsx               ← canonical entry
press/<slug>/chapters/               ← MDX source root
press/<slug>/components/             ← page components (Cover, BackCover, etc.)
press/<slug>/theme/                  ← artifact-local tokens, prose rules, and font loading
press/<slug>/theme/tokens.css
press/<slug>/theme/fonts.css
press/<slug>/theme/prose.css
press/<slug>/theme/fonts/            ← optional self-hosted font files
press/design.md                      ← shared user/agent design source
```

Use per-Press folders for multi-Press workspaces. Create `press/shared/` only when multiple Press folders intentionally share assets, facts, or components.
The framework supplies the generic `page-contract.css`, print route reset, and measurement shell; workspace themes adjust shell behavior through tokens, local prose CSS, and React/Tailwind component classes. Do not add shared `base/*.css`.
New page-specific surfaces should live in React components with Tailwind classes. Do not add shared `page-surfaces/`, `shell/`, or `patterns/` CSS.

## Component & Media Path Resolution

- Default authoring: pass folder-local `./components` and `./media` on `<Press>`
- Custom path: set `<Press componentsDir>` or `<Press mediaDir>` to a string or string array
- Paths starting with `./` resolve relative to the owning Press folder
- Bare paths resolve relative to `press/`

## Caption Targets And Semantic References

Use semantic references whenever prose needs to cite a numbered figure or table. Do not write `圖 2`, `Figure 2`, `表 3`, or `Table 3` directly; those numbers change when content is inserted, removed, or reordered.

For a figure, put a stable ID on the semantic `<figure>` element and include a `<figcaption>`:

```mdx
如 @fig-system-flow 所示，資料會先經過驗證。

<figure id="fig-system-flow">
  <SystemFlowDiagram />
  <figcaption>系統資料流程</figcaption>
</figure>
```

If a React figure component accepts the ID as a prop, it must forward that prop to its root `<figure>`:

```tsx
export default function SystemFlowFigure({ id }: { id?: string }) {
  return (
    <figure id={id}>
      {/* visual */}
      <figcaption>系統資料流程</figcaption>
    </figure>
  );
}
```

```mdx
<SystemFlowFigure id="fig-system-flow" />
```

For a Markdown table, put the stable ID on `<TableCaption>` immediately before the table:

```mdx
各方案差異整理於 @tbl-plan-comparison。

<TableCaption id="tbl-plan-comparison">方案比較</TableCaption>

| 方案 | 特性 |
| --- | --- |
| A | 穩定 |
```

Rules:

- Figure IDs use `fig-`; table IDs use `tbl-`.
- Use lowercase letters, digits, hyphens, or underscores after the prefix.
- Treat IDs as durable document interfaces. Preserve them when changing captions, layout, or component internals.
- A target ID must be unique within its Press. Every mention must resolve to exactly one captioned target of the matching kind.
- Forward, backward, cross-page, and repeated mentions are supported. OpenPress replaces each token with the current label from `<Press captionNumbering>` during render.
- Inline code, fenced code, LaTeX, existing links, email-like strings, and JSX attributes remain literal and are not semantic mentions.
- If a target is removed or renamed, update every corresponding mention in the same change. Do not repair numbering manually.

Run the shared build and Workbench review gate after adding or changing targets. The build rejects missing targets, duplicate IDs, malformed IDs, and figure/table prefix mismatches. In Workbench, click at least one forward or cross-page reference and confirm it lands on the intended captioned object.
