# Source And Writing Rules

## Content Shape

QDoc scans React/MDX chapter content in chapter directory order:

```txt
document/index.tsx
document/chapters/
  01-example/
    chapter.tsx       optional meta/opener for book-like docs
    content/
      01-start.mdx
```

Document shell exports in `document/index.tsx`:

- `config`: document identity and QDoc paths.
- `cover`: opening identity page.
- `toc`: generated table of contents shell.
- `backCover`: closing page.

Chapter exports in `chapter.tsx`:

- `meta`: optional `slug`, `title`, and tone/style metadata.
- `opener`: optional chapter divider JSX for books, teaching notes, manuals, or loose chapter collections.

Document-level identity belongs in `document/index.tsx` `config` and, for nested workspaces, matching `document/qdoc.config.mjs` delivery settings:

- `title`
- `subtitle`
- `organization`
- `workspaceLabel`

Do not move document identity into MDX frontmatter.

## Page Kind Boundaries

Use source location to describe a page's role, not its topic:

| Source | Use For | Footer |
| --- | --- | --- |
| `document/index.tsx` `cover` | document opening identity | no |
| `document/index.tsx` `toc` | generated table of contents shell | no |
| `chapter.tsx` `opener` | optional chapter divider / mini cover | no |
| `content/*.mdx` | normal reader-facing sections split/paginated by blocks | yes |
| `document/index.tsx` `backCover` | closing page | no |

`opener` is not a substitute for `##` chapter content. It should introduce the next chapter with a title, short summary, or learning map, then the real chapter still starts in MDX. Do not add chapter openers to thesis/report-style documents unless the user asks for a book-like reading rhythm.

## Public Content Boundary

Rendered QDoc pages are for the intended reader. Avoid internal production notes in `document/chapters/` unless the document topic is explicitly QDoc, agent workflows, style packs, or design documentation.

Avoid accidental internal language:

```sh
rg -n '(agent|skill|style pack|內部規則|給老師看|設計理由|production note)' document/chapters -g '*.mdx'
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
rg -n '^#{1,6}\s+.*(`|<[^>]+>|\*\*|__)' document/chapters document/design.md -g '*.mdx' -g '*.md'
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
