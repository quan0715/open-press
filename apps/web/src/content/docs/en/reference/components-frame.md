---
title: "Frame"
eyebrow: "@open-press/core"
description: "A fixed page surface or a nested region inside a page. Root Frames become output pages; nested Frames become selectable object boundaries inside the current page."
---
<ApiEntry
    name="<Frame>"
    kind="component"
    importFrom={'import { Frame } from "@open-press/core";'}
    signature={`<Frame
  frameKey="cover"
  role?="document.cover"
  chrome?={true}
  className?="reader-page--cover"
  ...sectionProps
>
  {/* page or region contents */}
</Frame>`}
    summary="Renders a <section> with data-openpress-* attributes the engine reads. A root Frame is the page address used for allocation, comments, editing, and export. A nested Frame is a region object scoped under the current page."
  >
    <PropsTable
      title="Props"
      rows={[
        {
          name: "frameKey",
          type: "string",
          required: true,
          description:
            "Stable identifier. On a root Frame, this is the page allocation key, page address, and <code>data-openpress-frame-key</code>. On a nested Frame, this is a region key scoped under the parent Frame and written to <code>data-openpress-region-frame-key</code>. Must be non-empty and must not contain <code>:extended:</code>.",
        },
        {
          name: "children",
          type: "ReactNode",
          required: true,
          description:
            "The page contents. Typically one or more <code>&lt;MdxArea&gt;</code> slots wrapped in a layout (<code>.page-frame</code> / <code>.page-body</code>) plus any header/footer chrome.",
        },
        {
          name: "role",
          type: "string",
          description:
            "Semantic label. The core runtime does not branch on this value. It writes the value to <code>data-frame-role</code>; root Frames also derive <code>data-page-kind</code> from the last dot segment, such as <code>cover</code> from <code>document.cover</code>. Themes, inspectors, and agents can use it as a stable hint.",
        },
        {
          name: "chrome",
          type: "boolean",
          default: "true",
          description:
            "Root Frame only. When false, writes <code>data-frame-chrome=\"false\"</code> and <code>data-page-footer=\"false\"</code>. Theme helpers use these flags to hide page chrome such as footer/header bands. Nested Frames inherit the page and do not emit chrome flags.",
        },
        {
          name: "className",
          type: "string",
          description:
            "Appended to the rendered section. Root Frames automatically include <code>reader-page</code>; nested Frames do not, so they can be used as neutral region boundaries.",
        },
        {
          name: "...rest",
          type: "HTMLAttributes",
          description:
            "All other props pass through to the underlying <code>&lt;section&gt;</code>. <code>data-*</code> attributes are commonly used for layout flags read by CSS or the inspector.",
        },
      ]}
    />

    ### Example: A4 content page (manuscript role)

```tsx
<Frame frameKey="ch-2" role="document.content" className="reader-page--content">
  <div className="page-frame">
    <header className="page-header" aria-hidden="true" />
    <main className="page-body">
      <MdxArea chainId="story" />
    </main>
    <footer className="page-footer">
      <span className="footer-left">{title}</span>
      <span className="footer-right">{pageIndex + 1}/{totalPages}</span>
    </footer>
  </div>
</Frame>
```

    ### Example: Canvas-style slide (no chrome)

```tsx
<Frame
  frameKey="slide-1"
  role="canvas.slide"
  chrome={false}
  className="reader-page--slide"
>
  <div className="page-frame">
    <main className="page-body">
      <MdxArea chainId="slides" overflow="truncate" />
    </main>
  </div>
</Frame>
```
  </ApiEntry>

  <h2>Page geometry</h2>

  <p>
    The <code>&lt;Frame&gt;</code> contract does not include a <code>page</code> prop. Paper or canvas size is
    set on each <code>&lt;Press page&gt;</code> JSX prop. One Press → one fixed geometry; mixed-geometry
    projects use a multi-Press <code>&lt;Workspace&gt;</code> with one geometry per Press.
  </p>

  <ApiEntry
    name="FrameContext"
    kind="context"
    importFrom={'import { FrameContext } from "@open-press/core";'}
    signature={`const frame = useContext(FrameContext);
// -> { frameKey, objectId, pageId, consumeArea(chainId) } | null`}
    summary="Low-level context for custom helpers. MdxArea calls consumeArea to claim its slot in the engine's allocation table. Normal documents usually do not need to read this context directly."
  >
    <p>
      <code>consumeArea(chainId)</code> increments the per-chain counter on each call so multiple
      <code>&lt;MdxArea&gt;</code> with the same <code>chainId</code> in one frame map to distinct
      allocation slots in source order.
    </p>
  </ApiEntry>

  <ApiEntry
    name="FRAME_MARKER"
    kind="symbol"
    importFrom={'import { FRAME_MARKER } from "@open-press/core";'}
    summary="Symbol identifier the renderer uses to detect Frame instances during tree walking. Custom frame wrappers can re-export Frame and attach this marker."
  />

  <h2>Data attributes the renderer writes</h2>

  <p>The rendered <code>&lt;section&gt;</code> carries these attributes — theme selectors and
  inspector behavior depend on them:</p>

  <PropsTable
    rows={[
      { name: "data-openpress-frame-key", type: "string", description: "Root Frames only. Mirrors the page <code>frameKey</code>." },
      { name: "data-openpress-region-frame-key", type: "string", description: "Nested Frames only. Mirrors the region <code>frameKey</code> inside the current page." },
      { name: "data-openpress-object-id", type: "string", description: "Object id used by the inspector, editing layer, and comment-marker system." },
      { name: "data-frame-role", type: "string", description: "Mirrors the <code>role</code> prop." },
      { name: "data-page-kind", type: "string", description: "Root Frames only. Last dot segment of <code>role</code>, for example <code>cover</code> from <code>document.cover</code>." },
      { name: "data-frame-chrome", type: '"true" | "false"', description: "Root Frames only. Reflects the <code>chrome</code> prop." },
      { name: "data-page-footer", type: '"true" | "false"', description: "Root Frames only. Matches <code>data-frame-chrome</code> by default." },
    ]}
  />

  <h2>Role naming convention</h2>

  <p>
    <code>role</code> is a free string, but the framework documents a two-segment convention so themes
    and docs stay consistent:
  </p>

  <ul>
    <li>
      <strong><code>document.*</code></strong> — long-form pages that flow MDX content through the
      allocator: <code>document.cover</code>, <code>document.toc</code>,
      <code>document.content</code>, <code>document.back-cover</code>.
    </li>
    <li>
      <strong><code>canvas.*</code></strong> — fixed-format pages with one designed surface and
      <code>overflow="truncate"</code> MDX areas: <code>canvas.slide</code>, <code>canvas.post</code>,
      <code>canvas.card</code>.
    </li>
    <li>
      <strong><code>manuscript.*</code></strong> — used by the bundled manuscript helpers
      (<code>manuscript.content</code> from <code>DefaultSectionPage</code>).
    </li>
  </ul>
