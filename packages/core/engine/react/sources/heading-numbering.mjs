// Heading numbering and outline emission for MDX sources.
//
// Pure functions called from `mdx-resolver.mjs` while walking each section's
// compiled blocks. Produces:
//   - `data-chapter` / `data-section` / `data-topic` attributes on heading
//     blocks (h2/h3/h4)
//   - stable IDs on the same blocks
//   - outline entries (for TOC + reader navigation)
//
// Numbering state is per-source, advances forward through blocks in source
// order. The caller threads `headingState` between calls.

/**
 * Build a fresh per-source heading state. One state object per call to
 * `resolveSource` — counts subsection / topic indices and tracks whether
 * this section has already seen its chapter heading.
 */
export function createHeadingState() {
  return {
    hasChapterHeading: false,
    subsectionCounter: 0,
    topicCounter: 0,
  };
}

/**
 * For one block emitted by the MDX compiler, decide whether it is a heading,
 * what id/data-* attributes it should carry, and whether it adds an entry to
 * the outline. Returns `null` for non-heading blocks.
 *
 * @param {object} opts
 * @param {object} opts.block        The compiled block record.
 * @param {string} opts.sourceId     Source registry key.
 * @param {object} opts.section      Section descriptor (slug, title, …).
 * @param {Array}  opts.outlineItems Mutable outline array — entries are pushed onto it.
 * @param {number} opts.chapterNumber  1-based chapter index for this section.
 * @param {string} opts.chapterLabel   Display label, e.g. `"#3"` or `"03"`.
 * @param {object} opts.headingState   Per-source counter state from `createHeadingState`.
 */
export function headingAttributesForBlock({
  block,
  sourceId,
  section,
  outlineItems,
  chapterNumber,
  chapterLabel,
  headingState,
}) {
  const title = String(block.text ?? "").trim();

  if (block.name === "h2") {
    const firstChapterHeading = !headingState.hasChapterHeading;
    const id = firstChapterHeading ? `section-${section.slug}` : block.id;
    const headingTitle = title || section.title || section.slug;
    outlineItems.push({
      id: `${sourceId}:${section.slug}:${block.id}`,
      tocId: firstChapterHeading
        ? `toc-${sourceId}-${section.slug}`
        : `toc-${sourceId}-${section.slug}-${block.id}`,
      depth: 0,
      title: headingTitle,
      label: chapterLabel,
      sectionSlug: section.slug,
      blockId: block.id,
      href: `#${id}`,
    });
    headingState.hasChapterHeading = true;
    headingState.subsectionCounter = 0;
    headingState.topicCounter = 0;
    return {
      attributes: {
        id,
        "data-chapter": chapterLabel,
      },
      sectionTitle: firstChapterHeading ? headingTitle : undefined,
    };
  }

  if (block.name === "h3") {
    headingState.subsectionCounter += 1;
    headingState.topicCounter = 0;
    const label = `${chapterNumber}.${headingState.subsectionCounter}`;
    outlineItems.push({
      id: `${sourceId}:${section.slug}:${block.id}`,
      tocId: `toc-${sourceId}-${section.slug}-${block.id}`,
      depth: 1,
      title: title || `Section ${label}`,
      label,
      sectionSlug: section.slug,
      blockId: block.id,
      href: `#${block.id}`,
    });
    return {
      attributes: {
        id: block.id,
        "data-section": label,
      },
    };
  }

  if (block.name === "h4") {
    headingState.topicCounter += 1;
    const label = `${chapterNumber}.${Math.max(1, headingState.subsectionCounter)}.${headingState.topicCounter}`;
    return {
      attributes: {
        id: block.id,
        "data-topic": label,
      },
    };
  }

  return null;
}

/**
 * Build a fallback single-entry outline when a section has no h2/h3 headings
 * the resolver could pick up. The outline still needs one row so the TOC
 * doesn't lose the section.
 */
export function fallbackOutlineItems({ sourceId, section, chapterLabel, title, blocks }) {
  const targetBlock = blocks[0];
  return [{
    id: `${sourceId}:${section.slug}`,
    tocId: `toc-${sourceId}-${section.slug}`,
    depth: 0,
    title,
    label: chapterLabel,
    sectionSlug: section.slug,
    blockId: targetBlock?.id,
    href: `#section-${section.slug}`,
  }];
}
