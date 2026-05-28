---
name: claude-document
description: Use when starting or adapting a warm Claude-like A4 OpenPress document starter for polished notes, briefs, specs, research summaries, learning material, or structured working documents.
---

# Claude Document

An open-press starter skill for Claude-like working documents: warm paper, generous fixed pages, deep blue-gray headings, serif display titles, structured tables, concise figures, and calm editorial rhythm.

This is a **local starter**. It is not an Anthropic brand package and should not imply official Claude or Anthropic affiliation.

## Visual Signature

- **Surface**: A4 fixed pages with a warm paper texture and subtle vertical rhythm.
- **Type**: serif display headings, sans body text, monospace code.
- **Color**: deep blue-gray ink, muted blue labels, warm hairlines, restrained block backgrounds.
- **Content components**: tables, figure captions, code blocks when needed, optional full-page chapter openers.
- **Pagination**: fixed page ratio; overflow is a content/component problem, not a reason to let pages grow.

## Suitable For

- polished working notes;
- product briefs, specs, and research summaries;
- learning material and internal documentation;
- public documents that need a calm, Claude-like editorial surface.

## Not Suitable For

- marketing landing pages;
- slide decks or 16:9 talks (use a dedicated external skill, or declare a custom `config.page`);
- dashboards or interactive app documentation.

## Related Starters

- `editorial-monograph` — hairline-driven, more formal long-form (whitepapers, monographs, academic-leaning). Choose it when the document is heavier and needs IBM-Carbon-style restraint instead of warm Claude tone.

## Apply To A Workspace

Use `openpress` to initialize the OpenPress runtime workspace. Then copy or adapt this skill's
`starter/document` tree into the target workspace. This skill defines the visual scope and starter
content; `openpress` owns the command surface and validation workflow.

After applying, use `openpress` for source-boundary and command decisions. Typical editable source areas are:

- `document/index.tsx` — cover, TOC shell, back cover, metadata;
- `document/chapters/**/*.mdx` — content;
- `document/theme/tokens.css` — color, typography, spacing, and A4 fallback variables;
- `document/design.md` — public style contract that future agents follow.

Content rules (table captions, figure numbering, etc.) live in `openpress-writing`; this skill does not redefine them.

## Do / Don't

Do:

- Keep figures focused on one concept, decision, or relationship.
- Prefer semantic figures, tables, and concise prose over decorative blocks.
- Keep chapter openers optional and use them only when major sections benefit from a book-like divider.

Don't:

- Put private names, customer data, deployment secrets, or project-specific author data in the starter.
- Shrink text below readable print size to hide overflow.
- Add large decorative gradients, dark sci-fi backgrounds, or brand-heavy visual noise.

## Deep Rules

The detailed rules live in `starter/document/design.md`. Once the starter is copied into a workspace, that file becomes the project-level design contract for both users and agents.
