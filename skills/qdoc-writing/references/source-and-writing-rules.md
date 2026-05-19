# Source And Writing Rules

## Content Shape

QDoc scans content as a flat directory of Markdown files:

```txt
content/
  00-cover.md        kind: cover
  01-toc.md          kind: toc
  02-...md           kind: chapter, or omitted because chapter is default
  99-back-cover.md   kind: back-cover
```

Frontmatter fields:

- `title`: page heading and `data-page-title`. Cover, TOC, and back cover use it for visible titles.
- `kind`: `cover`, `toc`, `chapter`, or `back-cover`; defaults to `chapter`.
- `chapter`: optional integer; engine auto-increments chapter pages when missing.
- `slug`: optional anchor slug; engine derives from filename when missing.

Document-level identity belongs in `qdoc.config.mjs`:

- `title`
- `subtitle`
- `organization`
- `workspaceLabel`

Do not move document identity into Markdown frontmatter.

## Public Content Boundary

Rendered QDoc pages are for the intended reader. Avoid internal production notes in `document/content/` unless the document topic is explicitly QDoc, agent workflows, style packs, or design-system documentation.

Avoid accidental internal language:

```sh
rg -n '(agent|skill|style pack|內部規則|給老師看|設計理由|production note)' document/content -g '*.md'
```

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

Move identifiers, formulas, commands, and API names into the paragraph after the heading.

Check before finishing a writing pass:

```sh
rg -n '^#{1,6}\s+.*(`|<[^>]+>|\*\*|__)' document/content document/design-system -g '*.md'
```

## Formula Writing

QDoc renders LaTeX math. Use plain Markdown delimiters:

- Inline: `$x^2$` or `\(x^2\)`.
- Display: `$$ ... $$` or `\[ ... \]` on their own lines.

If a formula string should remain literal, use code spans or code fences.

## Figure And Chart Captions

QDoc owns figure and table numbering. Components and Markdown content provide only semantic caption text; the renderer adds numbering such as `圖 N：` or `表 N：`.

- Use at most one `<figcaption>` per `<figure>`.
- Put visible captions after the visual body.
- Keep captions title-level; put long explanation in surrounding prose.
- Do not draw `圖 1：`, `Figure 1`, or explanatory prose inside chart panels.

## Starter Document Writing

Use `spec/qdoc/usage.md` when drafting a new or thin QDoc workspace.

A small starter document usually includes:

- cover: title, subtitle, promise, summary;
- TOC: placeholder only, because QDoc injects entries;
- chapter 1: purpose, audience, workflow;
- chapter 2: validation, output, example table or list;
- back cover: concise closing statement.

Prefer user-provided facts. If facts are missing, write neutral operational content or explicit placeholders instead of inventing organizations, metrics, testimonials, dates, or commitments.
