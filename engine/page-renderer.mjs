const TOC_ENTRIES_PER_PAGE = 24;

function renderPageShell(sectionClass, bodyHtml, attrs = "", { kind, footer = true } = {}) {
  const className = footer === false ? addClass(sectionClass, "no-footer") : sectionClass;
  const attrsPart = pageAttrs(attrs, { kind, footer });
  const footerHtml = footer === false ? "" : `
    <footer class="page-footer" aria-hidden="true"></footer>`;
  return `<section class="${className}"${attrsPart}>
  <div class="page-frame">
    <header class="page-header" aria-hidden="true"></header>
    <main class="page-body">
${bodyHtml.trim()}
    </main>${footerHtml}
  </div>
</section>`;
}

export function renderToc({ title, items, className } = {}) {
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
  const targetPageIndex = Math.max(0, Number(item.pageNumber || 1) - 1);
  return `    <li class="toc-level-${level}"><a href="#${escapeAttr(item.id)}" data-openpress-anchor="${escapeAttr(item.id)}" data-openpress-target-page-index="${targetPageIndex}"><span class="toc-index" data-toc-index="${escapeAttr(label)}">${escapeHtml(label)}</span><span class="toc-title">${escapeHtml(item.title)}</span><span class="toc-page">${String(item.pageNumber).padStart(2, "0")}</span></a></li>`;
}).join("\n")}
  </ol>
`
      : "";
    return renderPageShell(
      tocPageClassName(className, isContinuation),
      `
  <h2 id="${headingId}"${headingClass}>${escapeHtml(pageHeadingText)}</h2>
${tocList}
`,
      [
        `id="${pageId}"`,
        `data-page-title="${escapeAttr(headingText)}"`,
        `data-toc-continuation="${isContinuation ? "true" : "false"}"`,
        `aria-labelledby="${headingId}"`,
      ].filter(Boolean).join(" "),
      { kind: "toc", footer: false },
    );
  }).join("\n\n");
}

function tocContinuationTitle(title) {
  return title === "目錄" ? "目錄續" : `${title} continued`;
}

function pageAttrs(attrs, { kind, footer } = {}) {
  const parts = [];
  if (attrs.trim()) parts.push(attrs.trim());
  if (kind && !hasAttr(attrs, "data-page-kind")) parts.push(`data-page-kind="${escapeAttr(kind)}"`);
  if (footer === false && !hasAttr(attrs, "data-page-footer")) parts.push('data-page-footer="false"');
  return parts.length ? ` ${parts.join(" ")}` : "";
}

function hasAttr(attrs, name) {
  return new RegExp(`\\b${name}=`).test(attrs);
}

function addClass(className, extraClass) {
  const classes = className.split(/\s+/).filter(Boolean);
  if (!classes.includes(extraClass)) classes.push(extraClass);
  return classes.join(" ");
}

export function injectStaticToc(pages) {
  const tocItems = collectTocItems(pages);
  if (tocItems.length === 0) return pages;
  const tocIndex = pages.findIndex((page) => hasPageKind(page.match(/^<section[^>]*>/i)?.[0] ?? "", "toc"));
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
    if (!hasPageKind(openingTag, "toc")) return page;
    const title = extractAttr(openingTag, "data-page-title");
    return renderToc({ title, items: adjustedTocItems, className: extractAttr(openingTag, "class") });
  });
}

function tocPageClassName(className, isContinuation) {
  const classes = new Set(String(className || "reader-page reader-page--toc").split(/\s+/).filter(Boolean));
  classes.delete("toc");
  classes.add("reader-page");
  classes.add("reader-page--toc");
  if (isContinuation) classes.add("toc-continuation");
  else classes.delete("toc-continuation");
  return [...classes].join(" ");
}

function extractAttr(openingTag, name) {
  const re = new RegExp(`${name}="([^"]*)"`);
  return openingTag.match(re)?.[1];
}

function collectTocItems(pages) {
  const items = [];
  let chapterIndex = 0;
  let sectionIndex = 0;
  let pendingChapterOpener;

  pages.forEach((page, index) => {
    const openingTag = page.match(/^<section[^>]*>/i)?.[0] ?? "";
    if (hasPageKind(openingTag, "chapter-opener")) {
      pendingChapterOpener = extractChapterOpenerTarget(page, index);
      return;
    }

    if (!hasReportPageKind(openingTag)) return;

    let pageStartedChapter = false;
    const headings = [...page.matchAll(/<h([23])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi)];
    headings.forEach((heading) => {
      const level = Number(heading[1]);
      if (level === 2) {
        const opener = pendingChapterOpener;
        pendingChapterOpener = undefined;
        pageStartedChapter = true;
        chapterIndex += 1;
        sectionIndex = 0;
        items.push({
          id: opener?.id ?? heading[2],
          title: htmlToText(heading[3]),
          pageNumber: opener?.pageNumber ?? index + 1,
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
    if (!pageStartedChapter) pendingChapterOpener = undefined;
  });
  return items;
}

function extractChapterOpenerTarget(page, index) {
  const heading = page.match(/<h2\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/i);
  if (!heading?.[1]) return undefined;
  return {
    id: heading[1],
    pageNumber: index + 1,
  };
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

function hasPageKind(openingTag, kind) {
  return extractAttr(openingTag, "data-page-kind") === kind;
}

function hasReportPageKind(openingTag) {
  return extractAttr(openingTag, "data-page-kind") === "report";
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
