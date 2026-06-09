---
title: "Text"
eyebrow: "@open-press/core"
description: "A styleless editable text object. Use it when a slide, card, cover, caption, or custom component needs a stable comment / inline-edit anchor without inventing a styling API."
---
<div class="callout">
    <strong>Contract.</strong> <code>&lt;Text&gt;</code> does not own typography, spacing, color, or
    variants. Styling remains normal CSS through <code>className</code> and theme selectors. The component
    only provides the rendered object boundary that the inspector, comments, and inline editor can target.
  </div>

  <ApiEntry
    name="<Text>"
    kind="component"
    importFrom={'import { Text } from "@open-press/core";'}
    signature={`<Text
  as?="span" | "p" | "h1" | ...
  objectId="title"
  label="Slide title"
  source?={{ path, kind, objectId, source }}
  metadata?={{ ... }}
  className?="..."
>
  Literal editable text
</Text>`}
    summary="Wraps literal text in an ObjectEntity with kind=&quot;text&quot;. Literal children are auto-mapped to source ranges during React SSR export; expression-backed text can provide an explicit source ref when it should be editable."
  >
    <PropsTable
      title="Props"
      rows={[
        {
          name: "objectId",
          type: "string",
          required: true,
          description:
            "Stable id local to the current frame or parent entity. The renderer scopes it into the final <code>text:...</code> object id used by comments and inline editing.",
        },
        {
          name: "label",
          type: "string",
          required: true,
          description:
            "Human-readable label shown to inspector / agent workflows. Use intentful names like <code>Slide title</code>, <code>Hero lede</code>, or <code>Figure caption</code>.",
        },
        {
          name: "as",
          type: "keyof HTMLElementTagNameMap",
          default: '"span"',
          description:
            "Rendered HTML tag. Use semantic tags such as <code>h1</code>, <code>p</code>, <code>strong</code>, <code>figcaption</code>, <code>th</code>, or <code>td</code>. This is semantic structure, not a style variant.",
        },
        {
          name: "source",
          type: "EditableSourceRef",
          description:
            "Optional manual source mapping. Usually omit it for literal children; the React export pipeline injects <code>{ path, kind: &quot;tsx-text&quot;, objectId, source }</code> automatically.",
        },
        {
          name: "metadata",
          type: "Record<string, string | number | boolean | null>",
          description:
            "Small machine-readable hints for agents. Keep this structural, not visual: e.g. <code>{ role: &quot;kicker&quot; }</code>, not font sizes or colors.",
        },
        {
          name: "...rest",
          type: "HTMLAttributes<HTMLElement>",
          description:
            "Passed through to the rendered element. Use <code>className</code> for theme styling; do not add visual props to <code>Text</code> wrappers.",
        },
      ]}
    />

    ### Example: Slide text with automatic source mapping

```tsx
import { Frame, Text } from "@open-press/core";

export function Slide() {
  return (
    <Frame frameKey="slide-01" role="canvas.slide" chrome={false}>
      <Text as="h1" objectId="title" label="Slide title" className="slide-title">
        Fixed canvas workflow
      </Text>
      <Text as="p" objectId="lede" label="Slide lede" className="slide-lede">
        Build slides as fixed Frames, then let the workbench handle comments and inline edits.
      </Text>
    </Frame>
  );
}
```

    <p>
      The exported HTML receives <code>data-openpress-object-source</code> automatically for both text
      nodes above. The workbench can then edit the exact literal in <code>press/&lt;slug&gt;/press.tsx</code> without the
      author or agent hand-writing line numbers.
    </p>

    ### Example: Expression-backed text needs an explicit source if editable

```tsx
const title = "Generated title";

<Text
  as="h1"
  objectId="title"
  label="Slide title"
  source={{
    path: "press/slide/press.tsx",
    kind: "tsx-text",
    objectId: "title",
    source: { line: 1, column: 16, endLine: 1, endColumn: 31 },
  }}
>
  {title}
</Text>
```
  </ApiEntry>

  <h2>Source mapping rules</h2>

  <ul>
    <li>
      <strong>Literal children are editable by default.</strong> If <code>&lt;Text&gt;</code> is imported
      from <code>@open-press/core</code> and its children are a single literal text node, OpenPress derives
      a source range during React SSR export.
    </li>
    <li>
      <strong>Expression children are not guessed.</strong> <code>{`{title}`}</code>,
      <code>{`{children}`}</code>, arrays, and mapped content stay commentable as rendered objects, but
      are not inline-editable unless you provide <code>source</code>.
    </li>
    <li>
      <strong>Manual source wins.</strong> If a <code>source</code> prop is present, OpenPress preserves it
      and does not inject another one.
    </li>
    <li>
      <strong>Only OpenPress Text is transformed.</strong> Local components named <code>Text</code> are
      ignored unless they are imported as <code>Text</code> or an alias from <code>@open-press/core</code>.
    </li>
  </ul>

  <h2>When to use it</h2>

  <ul>
    <li>Slide, card, cover, and back-cover copy that should be directly editable in the workbench.</li>
    <li>Captions or compact labels inside custom components when the text is authored in TSX.</li>
    <li>Canvas-style pages where MDX is unnecessary and each page is a fixed React component.</li>
  </ul>

  <h2>When not to use it</h2>

  <ul>
    <li>Long-form prose already rendered through <code>&lt;MdxArea&gt;</code>; MDX blocks already carry source metadata.</li>
    <li>Visual styling concerns. Put typography and layout in theme CSS, not in <code>Text</code> props.</li>
    <li>Generated strings whose source cannot be represented as one stable editable range.</li>
  </ul>

  <h2>Related</h2>

  <ul>
    <li><a href="/docs/reference/components-frame">Frame</a> — page and nested region boundaries.</li>
    <li><a href="/docs/reference/components-mdx-area">MdxArea</a> — source-backed long-form prose slots.</li>
    <li><a href="/docs/reference/public-api">Public API</a> — semver-covered exports and dev endpoints.</li>
  </ul>
