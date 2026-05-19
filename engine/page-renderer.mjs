export const PAGE_RE = /<section\b[^>]*\breader-page\b[^>]*>.*?<\/section>/gis;
const TOC_ENTRIES_PER_PAGE = 24;

function renderPageShell(sectionClass, bodyHtml, attrs = "") {
  const attrsPart = attrs.trim() ? ` ${attrs.trim()}` : "";
  return `<section class="${sectionClass}"${attrsPart}>
  <div class="page-frame">
    <header class="page-header" aria-hidden="true"></header>
    <main class="page-body">
${bodyHtml.trim()}
    </main>
    <footer class="page-footer" aria-hidden="true"></footer>
  </div>
</section>`;
}

export function renderCover(meta, bodyHtml) {
  const title = typeof meta?.title === "string" && meta.title.trim() ? meta.title.trim() : "Cover";
  return `<section class="reader-page cover" data-page-title="${escapeAttr(title)}" aria-labelledby="report-title">
${bodyHtml}
</section>`;
}

export function renderToc({ title, items } = {}) {
  const headingText = typeof title === "string" && title.trim() ? title.trim() : "Contents";
  const tocItems = Array.isArray(items) ? items : [];
  const tocChunks = tocItems.length > 0 ? chunkArray(tocItems, TOC_ENTRIES_PER_PAGE) : [[]];

  return tocChunks.map((chunk, pageIndex) => {
    const isContinuation = pageIndex > 0;
    const pageId = pageIndex === 0 ? "toc" : `toc-${String(pageIndex + 1).padStart(2, "0")}`;
    const headingId = pageIndex === 0 ? "toc-title" : `${pageId}-title`;
    const pageHeadingText = isContinuation ? tocContinuationTitle(headingText) : headingText;
    const headingClass = isContinuation ? ` class="toc-heading toc-heading--continuation"` : ` class="toc-heading"`;
    const tocList = chunk.length > 0
      ? `
  <ol class="toc-list">
${chunk.map((item, index) => {
  const level = item.level === 3 ? 3 : 2;
  const absoluteIndex = pageIndex * TOC_ENTRIES_PER_PAGE + index;
  const label = item.label || (level === 2 ? `#${absoluteIndex + 1}` : "");
  return `    <li class="toc-level-${level}"><a href="#${escapeAttr(item.id)}"><span class="toc-index" data-toc-index="${escapeAttr(label)}">${escapeHtml(label)}</span><span class="toc-title">${escapeHtml(item.title)}</span><span class="toc-page">${String(item.pageNumber).padStart(2, "0")}</span></a></li>`;
}).join("\n")}
  </ol>
`
      : "";
    return renderPageShell(
      `reader-page toc${isContinuation ? " toc-continuation" : ""}`,
      `
  <h2 id="${headingId}"${headingClass}>${escapeHtml(pageHeadingText)}</h2>
${tocList}
`,
      `id="${pageId}" data-page-title="${escapeAttr(headingText)}" data-toc-continuation="${isContinuation ? "true" : "false"}" aria-labelledby="${headingId}"`,
    );
  }).join("\n\n");
}

function tocContinuationTitle(title) {
  return title === "目錄" ? "目錄續" : `${title} continued`;
}

export function renderBackCover(meta, bodyHtml) {
  const title = typeof meta?.title === "string" && meta.title.trim() ? meta.title.trim() : "End";
  return `<section class="reader-page back-cover" data-page-title="${escapeAttr(title)}">
${bodyHtml}
</section>`;
}

export function splitChapterSections(bodyHtml, _chapterNum, idCounter) {
  // The chapter number is no longer injected into the h2 text; pagination
  // assigns `data-chapter` at runtime and the theme decides how to display
  // it (01 / 一 / Chapter 1 / ...). Keep the argument so callers stay backward
  // compatible.
  const headingRe = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;
  const headings = [...bodyHtml.matchAll(headingRe)];
  if (headings.length === 0) return renderPageShell("reader-page report-page", bodyHtml);

  const blocks = [];
  for (let idx = 0; idx < headings.length; idx += 1) {
    const match = headings[idx];
    const nextStart = idx + 1 < headings.length ? headings[idx + 1].index : bodyHtml.length;
    const chunk = bodyHtml.slice(match.index + match[0].length, nextStart).trim();
    idCounter.value += 1;
    const secId = `section-${String(idCounter.value).padStart(2, "0")}`;
    const headingText = match[1].trim();
    const heading = `<h2 id="${secId}">${headingText}</h2>`;
    blocks.push(renderPageShell(
      "reader-page report-page",
      `${heading}${chunk ? `\n${chunk}` : ""}`,
      `data-page-title="${escapeAttr(headingText)}"`,
    ));
  }
  return blocks.join("\n\n");
}

export function injectStaticToc(pages) {
  const tocItems = collectTocItems(pages);
  if (tocItems.length === 0) return pages;
  const tocIndex = pages.findIndex((page) => hasClass(page.match(/^<section[^>]*>/i)?.[0] ?? "", "toc"));
  const tocPageCount = Math.max(1, Math.ceil(tocItems.length / TOC_ENTRIES_PER_PAGE));
  const tocPageNumber = tocIndex + 1;
  const adjustedTocItems = tocPageCount > 1 && tocIndex >= 0
    ? tocItems.map((item) => ({
      ...item,
      pageNumber: item.pageNumber > tocPageNumber ? item.pageNumber + tocPageCount - 1 : item.pageNumber,
    }))
    : tocItems;

  return pages.map((page) => {
    const openingTag = page.match(/^<section[^>]*>/i)?.[0] ?? "";
    if (!hasClass(openingTag, "toc")) return page;
    const title = extractAttr(openingTag, "data-page-title");
    return renderToc({ title, items: adjustedTocItems });
  });
}

function extractAttr(openingTag, name) {
  const re = new RegExp(`${name}="([^"]*)"`);
  return openingTag.match(re)?.[1];
}

function collectTocItems(pages) {
  const items = [];
  let chapterIndex = 0;
  let sectionIndex = 0;

  pages.forEach((page, index) => {
    const openingTag = page.match(/^<section[^>]*>/i)?.[0] ?? "";
    if (!hasClass(openingTag, "report-page")) return;

    const headings = [...page.matchAll(/<h([23])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi)];
    headings.forEach((heading) => {
      const level = Number(heading[1]);
      if (level === 2) {
        chapterIndex += 1;
        sectionIndex = 0;
        items.push({
          id: heading[2],
          title: htmlToText(heading[3]),
          pageNumber: index + 1,
          level: 2,
          label: `#${chapterIndex}`,
        });
        return;
      }

      if (level === 3 && chapterIndex > 0) {
        sectionIndex += 1;
        items.push({
          id: heading[2],
          title: htmlToText(heading[3]),
          pageNumber: index + 1,
          level: 3,
          label: `${chapterIndex}.${sectionIndex}`,
        });
      }
    });
  });
  return items;
}

function htmlToText(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .trim();
}

function hasClass(openingTag, className) {
  const match = openingTag.match(/class="([^"]*)"/i);
  return Boolean(match && match[1].split(/\s+/).includes(className));
}

function escapeAttr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
