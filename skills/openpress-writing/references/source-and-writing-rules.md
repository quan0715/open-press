# Source And Writing Rules

## Content Shape

open-press renders a default-exported Press tree from `press/index.tsx`. MDX content is discovered only through `export const sources`; starter packs use the manuscript convention below, but source roots/files can be registered explicitly.

```txt
press/index.tsx
press/chapters/
  01-example/
    content/
      01-start.mdx
```

Document entry exports in `press/index.tsx`:

- `config`: document identity and open-press paths.
- `sources`: MDX source descriptors, usually `mdxSource({ preset: "section-folders", root: "chapters" })`.
- default export: a `<Press>` tree made of workspace components and helpers such as `<Toc>` and `<Sections>`.

Cover, back cover, and section opener pages are workspace React components that return `<Frame>`. They are not special core exports and are not auto-discovered from `chapter.tsx`.

For manuscript documents, `<Toc source="story">` consumes a generated `toc:story` chain through `<TocArea>`. The TOC frame layout is still a workspace/helper component decision; the core pipeline only sees another measurable area with allocated blocks.

Document-level identity belongs on each `<Press>` JSX prop inside `press/index.tsx`:

- `title`
- `subtitle`
- `organization`
- `workspaceLabel`

Delivery settings (deploy / pdf) live in the workspace `package.json` under the `"openpress"` field, not in MDX or `<Press>` props. Do not move document identity into MDX frontmatter.

## Page Kind Boundaries

Use source location to describe a page's role, not its topic:

| Source | Use For | Footer |
| --- | --- | --- |
| Press tree `Cover` frame | document opening identity | no |
| Press tree `<Toc source="...">` frame | generated table of contents shell | no |
| Press tree opener frame | optional section divider / mini cover | no |
| `<MdxArea>` consuming registered MDX blocks | normal reader-facing sections split/paginated by blocks | yes |
| Press tree `BackCover` frame | closing page | no |

An opener frame is not a substitute for `##` section content. It should introduce the next section with a title, short summary, or learning map, then the real section still starts in MDX. Do not add openers to thesis/report-style documents unless the user asks for a book-like reading rhythm.

## Public Content Boundary

Rendered open-press pages are for the intended reader. Avoid internal production notes in `press/chapters/` unless the document topic is explicitly open-press, agent workflows, starter skills, or design documentation.

Avoid accidental internal language such as `agent`, `skill`, `starter`, `內部規則`, `給老師看`, `設計理由`, or `production note` in normal reader-facing chapters. Use `openpress` when source scanning is needed.

## Unfinished Content

Use recognizable markers:

```txt
[TODO: ...]
[FIX: ...]
[DRAFT: ...]
```

Avoid bare `TODO`, `TBD`, or `[必填]`; they are harder to distinguish from normal prose.

## Heading Hygiene

Headings are navigation labels. Keep `##` and `###` plain-text and semantic:

- no backtick code spans;
- no raw HTML tags;
- no bold/italic Markdown;
- no formulas as heading text.

Move identifiers, formulas, commands, and API names into the paragraph after the heading. Before finishing a writing pass, ask `openpress` to scan headings for code spans, raw HTML, bold/italic Markdown, or formula-like labels when that risk is present.

## Formula Writing

open-press renders LaTeX math. Use plain Markdown delimiters:

- Inline: `$x^2$` or `\(x^2\)`.
- Display: `$$ ... $$` or `\[ ... \]` on their own lines.

If a formula string should remain literal, use code spans or code fences.

## Caption Contract

open-press owns figure and table numbering. Components and Markdown content provide only semantic caption text; build-time rendering may add numbering such as `圖 N：` or `表 N：`. Do not rely on reader-side JavaScript to fix or renumber captions after export.

- Use at most one `<figcaption>` per `<figure>`.
- Put visible captions after the visual body.
- Put `<TableCaption>` immediately before any Markdown table that should be captioned:
  ```mdx
  <TableCaption>Pointer syntax</TableCaption>

  | 寫法 | 意義 |
  | --- | --- |
  | `p` | 節點位址 |
  ```
- Do not use the legacy `表：...` marker, and do not write `表 1：`, `圖 2：`, `Figure 1`, or `Table 1` in source content. The visible number is generated from DOM order.
- Empty `<TableCaption>` components, misplaced `<TableCaption>` components, and legacy `表：...` markers are compile errors.
- Keep captions title-level; put long explanation in surrounding prose.
- Do not draw figure/table numbers or explanatory prose inside chart panels.

## Starter Document Writing

Use the active starter skill and `press/design.md` when drafting a new or thin open-press workspace.

A small starter document usually includes:

- cover: title, subtitle, promise, summary;
- TOC: a `<Toc source="...">` frame; the generated TOC entries flow through its `TocArea`;
- chapter 1: purpose, audience, workflow;
- chapter 2: validation, output, example table or list;
- back cover: concise closing statement.

Prefer user-provided facts. If facts are missing, write neutral operational content or explicit placeholders instead of inventing organizations, metrics, testimonials, dates, or commitments.
