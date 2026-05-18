export const PAGE_RE = /<section\b[^>]*\breader-page\b[^>]*>.*?<\/section>/gis;

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
  const tocList = tocItems.length > 0
    ? `
  <ol class="toc-list">
${tocItems.map((item, index) => `    <li class="toc-level-2"><a href="#${escapeAttr(item.id)}"><span class="toc-index">${String(index + 1).padStart(2, "0")}</span><span class="toc-title">${escapeHtml(item.title)}</span><span class="toc-page">${String(item.pageNumber).padStart(2, "0")}</span></a></li>`).join("\n")}
  </ol>
`
    : "";
  return renderPageShell(
    "reader-page toc",
    `
  <h2 id="toc-title">${escapeHtml(headingText)}</h2>
${tocList}
`,
    `id="toc" data-page-title="${escapeAttr(headingText)}" aria-labelledby="toc-title"`,
  );
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

  return pages.map((page) => {
    const openingTag = page.match(/^<section[^>]*>/i)?.[0] ?? "";
    if (!hasClass(openingTag, "toc")) return page;
    const title = extractAttr(openingTag, "data-page-title");
    return renderToc({ title, items: tocItems });
  });
}

function extractAttr(openingTag, name) {
  const re = new RegExp(`${name}="([^"]*)"`);
  return openingTag.match(re)?.[1];
}

function collectTocItems(pages) {
  const items = [];
  pages.forEach((page, index) => {
    const openingTag = page.match(/^<section[^>]*>/i)?.[0] ?? "";
    if (!hasClass(openingTag, "report-page")) return;

    const h2 = page.match(/<h2\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/i);
    if (!h2) return;

    items.push({
      id: h2[1],
      title: htmlToText(h2[2]),
      pageNumber: index + 1,
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
