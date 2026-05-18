import type { QDocHtmlPageBlock } from "./types";

type SourcePage = QDocHtmlPageBlock & {
  pageNumber: number;
};

export interface PaginatedQDocPage {
  id: string;
  title: string;
  pageNumber: number;
  html: string;
  anchors: string[];
  source?: SourcePage["source"];
}

const H3_CONTINUATION_MIN_BODY_RATIO = 0.14;
const PAGE_BODY_FIT_TOLERANCE = 1;
const SOURCE_INDEX_ATTR = "data-qdoc-source-index";
const HEADING_SELECTOR =
  ".reader-page.report-page .page-body > h2, " +
  ".reader-page.report-page .page-body h3, " +
  ".reader-page.report-page > h2, " +
  ".reader-page.report-page > h3";

export function paginateQDocSourcePages(sourceContainer: HTMLElement, sourcePages: SourcePage[]): PaginatedQDocPage[] {
  normalizeSectionHeadings(sourceContainer);

  const pages = paginateDomPages(sourceContainer);
  addPageFooters(pages);
  markChapterEnds(pages);
  pages.forEach((page) => {
    if (page.classList.contains("toc")) buildToc(page, pages);
  });

  return pages.map((page, index) => {
    const anchor = page.querySelector<HTMLElement>("[id]")?.id ?? `page-${String(index + 1).padStart(2, "0")}`;
    const source = sourceForPage(page, sourcePages);
    stripSourceIndexMarkers(page);
    return {
      id: `qdoc-rendered-page-${String(index + 1).padStart(2, "0")}`,
      title: pageTitle(page) || `Page ${index + 1}`,
      pageNumber: index + 1,
      html: page.outerHTML,
      anchors: [anchor],
      source,
    };
  });
}

function paginateDomPages(sourceContainer: HTMLElement) {
  const sourceSections = Array.from(sourceContainer.querySelectorAll<HTMLElement>(".reader-page"));
  const items: Array<
    | { type: "whole"; node: HTMLElement }
    | { type: "toc"; sourceIndex: number }
    | { type: "chapter-break" }
    | { type: "block"; node: Element }
  > = [];

  sourceSections.forEach((section, sourceIndex) => {
    if (section.classList.contains("toc")) {
      items.push({ type: "toc", sourceIndex });
      return;
    }
    if (section.classList.contains("cover") || section.classList.contains("back-cover")) {
      items.push({ type: "whole", node: withSourceIndex(section.cloneNode(true) as HTMLElement, sourceIndex) });
      return;
    }
    const sectionBody = getPageBody(section) || section;
    Array.from(sectionBody.children).forEach((child) => {
      if (child.children.length === 0 && !child.textContent?.trim() && child.tagName === "DIV") return;
      if (child.tagName === "H2") items.push({ type: "chapter-break" });
      items.push({ type: "block", node: withSourceIndex(child.cloneNode(true) as Element, sourceIndex) });
    });
  });

  const measurer = createFramedPage("reader-page report-page measurement");
  const measurerBody = getPageBody(measurer);
  if (!measurerBody) return sourceSections;
  sourceContainer.appendChild(measurer);

  const lastBlockInChapter = new Set<number>();
  let lastBlockIdx = -1;
  items.forEach((item, index) => {
    if (item.type === "block") {
      lastBlockIdx = index;
      return;
    }
    if (lastBlockIdx >= 0) lastBlockInChapter.add(lastBlockIdx);
    lastBlockIdx = -1;
  });
  if (lastBlockIdx >= 0) lastBlockInChapter.add(lastBlockIdx);

  let measureAsChapterEnd = false;
  const pageDefs: Array<{ blocks: Element[] } | { whole: HTMLElement } | { toc: true; sourceIndex: number }> = [];
  let pending: Element[] = [];

  const fits = (blocks: Element[]) => {
    measurerBody.innerHTML = "";
    measurer.classList.toggle("is-chapter-end", measureAsChapterEnd);
    blocks.forEach((block) => measurerBody.appendChild(block.cloneNode(true)));
    if (!measurerBody.lastElementChild) return true;
    return contentBottomWithinPageBody(measurerBody, PAGE_BODY_FIT_TOLERANCE);
  };

  const measureBlocksHeight = (blocks: Element[]) => {
    if (!blocks.length) return 0;
    measurerBody.innerHTML = "";
    measurer.classList.remove("is-chapter-end");
    blocks.forEach((block) => measurerBody.appendChild(block.cloneNode(true)));
    const first = measurerBody.firstElementChild;
    const last = measurerBody.lastElementChild;
    if (!first || !last) return 0;
    return last.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
  };

  const h3ContinuationMinHeight = () => measurerBody.clientHeight * H3_CONTINUATION_MIN_BODY_RATIO;

  const commit = () => {
    if (!pending.length) return;
    pageDefs.push({ blocks: pending });
    pending = [];
  };

  const popTrailingHeadingLead = () => {
    let headingIndex = -1;
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      if (isHeading(pending[index])) {
        headingIndex = index;
        break;
      }
    }
    if (headingIndex <= 0) return [];
    const leadBlocks = pending.slice(headingIndex + 1);
    if (!leadBlocks.every(isLeadBlock)) return [];
    const leadHeight = measureBlocksHeight(leadBlocks);
    if (leadHeight >= h3ContinuationMinHeight()) return [];
    return pending.splice(headingIndex);
  };

  const tryAddSplittable = (block: Element) => {
    let remaining = getParts(block);
    let consumed = 0;
    while (remaining.length > 0) {
      let fitCount = 0;
      for (let index = 1; index <= remaining.length; index += 1) {
        const chunk = buildContainer(block, remaining.slice(0, index), {
          includeCaption: index === remaining.length,
          start: consumed + 1,
        });
        if (fits([...pending, chunk])) fitCount = index;
        else break;
      }

      if (fitCount > 0) {
        pending.push(buildContainer(block, remaining.slice(0, fitCount), {
          includeCaption: fitCount === remaining.length,
          start: consumed + 1,
        }));
        remaining = remaining.slice(fitCount);
        consumed += fitCount;
        if (remaining.length > 0) commit();
      } else if (pending.length > 0) {
        const movedLead = popTrailingHeadingLead();
        const movedHeadings: Element[] = [];
        while (!movedLead.length && pending.length && isHeading(pending[pending.length - 1])) {
          const moved = pending.pop();
          if (moved) movedHeadings.unshift(moved);
        }
        const moved = movedLead.length ? movedLead : movedHeadings;
        if (pending.length > 0) {
          commit();
          pending = [...moved];
        } else {
          const chunk = buildContainer(block, [remaining[0]], {
            includeCaption: remaining.length === 1,
            start: consumed + 1,
          });
          pageDefs.push({ blocks: [...moved, chunk] });
          pending = [];
          remaining = remaining.slice(1);
          consumed += 1;
        }
      } else {
        pageDefs.push({
          blocks: [buildContainer(block, [remaining[0]], {
            includeCaption: remaining.length === 1,
            start: consumed + 1,
          })],
        });
        remaining = remaining.slice(1);
        consumed += 1;
      }
    }
  };

  const tryAdd = (block: Element) => {
    const candidate = [...pending, block];
    if (fits(candidate)) {
      pending = candidate;
      return;
    }
    if (canSplit(block)) {
      tryAddSplittable(block);
      return;
    }
    if (pending.length === 0) {
      pageDefs.push({ blocks: [block] });
      return;
    }
    const movedLead = popTrailingHeadingLead();
    const moved = movedLead.length ? movedLead : [];
    while (!movedLead.length && pending.length && isHeading(pending[pending.length - 1])) {
      const heading = pending.pop();
      if (heading) moved.unshift(heading);
    }
    if (pending.length === 0) {
      const all = [...moved, block];
      if (fits(all)) pending = all;
      else {
        pageDefs.push({ blocks: all });
        pending = [];
      }
      return;
    }
    commit();
    pending = [...moved, block];
  };

  items.forEach((item, index) => {
    if (item.type === "whole") {
      measureAsChapterEnd = false;
      commit();
      pageDefs.push({ whole: item.node });
    } else if (item.type === "toc") {
      measureAsChapterEnd = false;
      commit();
      pageDefs.push({ toc: true, sourceIndex: item.sourceIndex });
    } else if (item.type === "chapter-break") {
      measureAsChapterEnd = false;
      commit();
    } else {
      measureAsChapterEnd = lastBlockInChapter.has(index);
      tryAdd(item.node);
    }
  });
  commit();
  measurer.remove();

  return pageDefs.map((def) => {
    if ("whole" in def) return def.whole;
    if ("toc" in def) {
      const page = createFramedPage("reader-page toc");
      page.id = "toc";
      page.dataset.pageTitle = "目錄";
      page.setAttribute(SOURCE_INDEX_ATTR, String(def.sourceIndex));
      return page;
    }
    const page = createFramedPage("reader-page report-page");
    const body = getPageBody(page);
    def.blocks.forEach((block) => body?.appendChild(block));
    return page;
  });
}

function withSourceIndex<T extends Element>(node: T, sourceIndex: number) {
  node.setAttribute(SOURCE_INDEX_ATTR, String(sourceIndex));
  return node;
}

function normalizeSectionHeadings(scope: ParentNode) {
  // Engine emits h2/h3 with bare heading text. Pagination assigns counter
  // values to `data-chapter` / `data-section`; the theme's ::before rules
  // decide how to display them (01 / 一 / Chapter 1 / ...).
  let chapterCounter = 0;
  let sectionCounter = 0;
  scope.querySelectorAll<HTMLElement>(HEADING_SELECTOR).forEach((el) => {
    if (el.tagName === "H2") {
      chapterCounter += 1;
      sectionCounter = 0;
      el.dataset.chapter = String(chapterCounter).padStart(2, "0");
    } else if (el.tagName === "H3") {
      sectionCounter += 1;
      el.dataset.section = `${chapterCounter}.${sectionCounter}`;
    }
  });
}

function buildToc(tocPage: HTMLElement, allPages: HTMLElement[]) {
  const tocBody = getPageBody(tocPage);
  if (!tocBody) return;
  // Preserve the engine-emitted h2 (its text comes from the toc page's
  // frontmatter `title:`). Fall back to "Contents" only if nothing was set.
  const existingHeading = tocBody.querySelector<HTMLElement>("h2");
  const headingText = existingHeading?.textContent?.trim() || tocPage.dataset.pageTitle?.trim() || "Contents";
  tocBody.innerHTML = "";
  const heading = document.createElement("h2");
  heading.id = "toc-title";
  heading.textContent = headingText;
  tocBody.appendChild(heading);

  const list = document.createElement("ol");
  list.className = "toc-list";
  collectChapters(allPages).forEach((chapter, index) => {
    const li = document.createElement("li");
    li.className = "toc-level-2";
    const a = document.createElement("a");
    a.href = `#${chapter.id}`;
    a.innerHTML = `<span class="toc-index">${String(index + 1).padStart(2, "0")}</span><span class="toc-title">${escapeHtml(chapter.title)}</span><span class="toc-page">${String(chapter.pageIndex + 1).padStart(2, "0")}</span>`;
    li.appendChild(a);
    list.appendChild(li);
  });
  tocBody.appendChild(list);
}

function collectChapters(allPages: HTMLElement[]) {
  const chapters: Array<{ id: string; title: string; pageIndex: number }> = [];
  allPages.forEach((page, pageIndex) => {
    if (!page.classList.contains("report-page")) return;
    page.querySelectorAll<HTMLElement>("h2").forEach((heading) => {
      chapters.push({
        id: heading.id,
        title: heading.textContent?.trim() ?? "",
        pageIndex,
      });
    });
  });
  return chapters;
}

function addPageFooters(allPages: HTMLElement[]) {
  let currentChapter = "";
  let chapterCount = 0;
  allPages.forEach((page, index) => {
    if (page.classList.contains("cover") || page.classList.contains("back-cover")) return;
    const pageBody = ensurePageShell(page);
    const footer = getPageFooter(page);
    if (!pageBody || !footer) return;
    footer.innerHTML = "";
    let leftLabel = "";
    if (page.classList.contains("toc")) {
      // Use the toc page's own title (set by engine from frontmatter) so
      // non-Chinese documents don't get a Chinese label here.
      leftLabel = page.dataset.pageTitle?.trim()
        || page.querySelector<HTMLElement>(":scope .page-body > h2")?.textContent?.trim()
        || "Contents";
    } else if (page.classList.contains("report-page")) {
      const h2 = pageBody.querySelector<HTMLElement>(":scope > h2");
      if (h2) {
        currentChapter = h2.textContent?.trim() ?? "";
        chapterCount += 1;
        h2.dataset.chapter = String(chapterCount).padStart(2, "0");
      }
      leftLabel = currentChapter;
    }

    const left = document.createElement("span");
    left.className = "footer-left";
    left.textContent = leftLabel;
    const right = document.createElement("span");
    right.className = "footer-right";
    right.textContent = String(index + 1).padStart(2, "0");
    footer.append(left, right);
  });
}

function markChapterEnds(allPages: HTMLElement[]) {
  allPages.forEach((page, index) => {
    if (!page.classList.contains("report-page")) return;
    const next = allPages[index + 1];
    const nextBody = getPageBody(next) || next;
    const nextStartsChapter = next?.classList.contains("report-page") && nextBody?.querySelector(":scope > h2:first-child");
    const nextIsBackCover = next?.classList.contains("back-cover");
    if (!next || nextStartsChapter || nextIsBackCover) page.classList.add("is-chapter-end");
  });
}

function createFramedPage(className: string) {
  const page = document.createElement("section");
  page.className = className;
  ensurePageShell(page);
  return page;
}

function ensurePageShell(page: HTMLElement) {
  const existingFrame = getPageFrame(page);
  if (existingFrame) return getPageBody(page);

  const existingHeader = page.querySelector(":scope > .page-header");
  const existingFooter = page.querySelector(":scope > .page-footer");
  const frame = document.createElement("div");
  frame.className = "page-frame";

  const header = document.createElement("header");
  header.className = "page-header";
  header.setAttribute("aria-hidden", "true");
  if (existingHeader) {
    while (existingHeader.firstChild) header.appendChild(existingHeader.firstChild);
  }

  const body = document.createElement("main");
  body.className = "page-body";
  Array.from(page.childNodes).forEach((node) => {
    if (node === existingHeader || node === existingFooter) return;
    body.appendChild(node);
  });

  const footer = document.createElement("footer");
  footer.className = "page-footer";
  footer.setAttribute("aria-hidden", "true");
  if (existingFooter) {
    while (existingFooter.firstChild) footer.appendChild(existingFooter.firstChild);
  }

  frame.append(header, body, footer);
  page.appendChild(frame);
  existingHeader?.remove();
  existingFooter?.remove();
  return body;
}

function getPageFrame(page?: Element | null) {
  return page?.querySelector?.(":scope > .page-frame") ?? null;
}

function getPageBody(page?: Element | null) {
  return (
    page?.querySelector?.<HTMLElement>(":scope > .page-frame > .page-body") ||
    page?.querySelector?.<HTMLElement>(":scope > .page-body") ||
    null
  );
}

function getPageFooter(page?: Element | null) {
  return (
    page?.querySelector?.<HTMLElement>(":scope > .page-frame > .page-footer") ||
    page?.querySelector?.<HTMLElement>(":scope > .page-footer") ||
    null
  );
}

function contentBottomWithinPageBody(body: HTMLElement, tolerance = PAGE_BODY_FIT_TOLERANCE) {
  const bodyBottom = body.getBoundingClientRect().bottom;
  const contentBottom = Array.from(body.children).reduce((bottom, child) => {
    return Math.max(bottom, child.getBoundingClientRect().bottom + getElementMarginBottom(child));
  }, body.getBoundingClientRect().top);
  return contentBottom <= bodyBottom + tolerance;
}

function getElementMarginBottom(element: Element) {
  const value = Number.parseFloat(window.getComputedStyle(element).marginBottom);
  return Number.isFinite(value) ? value : 0;
}

function isHeading(el?: Element) {
  return Boolean(el && /^H[1-6]$/.test(el.tagName));
}

function isLeadBlock(el: Element) {
  return el.tagName === "P" || el.tagName === "UL" || el.tagName === "OL";
}

function canSplit(block: Element) {
  if (block.classList.contains("figure-grid")) return block.tagName === "DIV" && block.children.length > 1;
  if (block.tagName === "TABLE") {
    const tbody = block.querySelector("tbody");
    return Boolean(tbody && tbody.children.length > 1);
  }
  return (block.tagName === "UL" || block.tagName === "OL") && block.children.length > 1;
}

function getParts(block: Element) {
  if (block.tagName === "TABLE") return Array.from(block.querySelector("tbody")?.children ?? []);
  return Array.from(block.children);
}

function buildContainer(original: Element, parts: Element[], options: { includeCaption?: boolean; start?: number } = {}) {
  if (original.tagName === "TABLE") {
    const table = original.cloneNode(false) as HTMLElement;
    const caption = original.querySelector(":scope > caption");
    if (caption && options.includeCaption !== false) table.appendChild(caption.cloneNode(true));
    const thead = original.querySelector("thead");
    if (thead) table.appendChild(thead.cloneNode(true));
    const tbody = document.createElement("tbody");
    parts.forEach((row) => tbody.appendChild(row.cloneNode(true)));
    table.appendChild(tbody);
    return table;
  }
  const container = original.cloneNode(false) as HTMLElement;
  if (container.tagName === "OL" && options.start && options.start > 1) {
    container.setAttribute("start", String(options.start));
  }
  parts.forEach((part) => container.appendChild(part.cloneNode(true)));
  return container;
}

function pageTitle(page: HTMLElement) {
  return page.dataset.pageTitle || page.querySelector("h1, h2, h3")?.textContent?.trim() || "";
}

function sourceForPage(page: HTMLElement, sourcePages: SourcePage[]) {
  const sourceIndex =
    page.getAttribute(SOURCE_INDEX_ATTR) ??
    page.querySelector<HTMLElement>(`[${SOURCE_INDEX_ATTR}]`)?.getAttribute(SOURCE_INDEX_ATTR);
  if (sourceIndex !== null && sourceIndex !== undefined) return sourcePages[Number(sourceIndex)]?.source;

  const firstAnchor = page.querySelector<HTMLElement>("[id]")?.id;
  if (!firstAnchor) return undefined;
  return sourcePages.find((source) => source.anchors?.includes(firstAnchor))?.source;
}

function stripSourceIndexMarkers(page: HTMLElement) {
  page.removeAttribute("data-qdoc-source-index");
  page.querySelectorAll(`[${SOURCE_INDEX_ATTR}]`).forEach((el) => {
    el.removeAttribute("data-qdoc-source-index");
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
