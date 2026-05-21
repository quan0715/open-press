import type { HtmlPageBlock } from "./types";

type SourcePage = HtmlPageBlock & {
  pageNumber: number;
};

export interface PaginatedPage {
  id: string;
  title: string;
  pageNumber: number;
  html: string;
  anchors: string[];
  source?: SourcePage["source"];
}

const H3_CONTINUATION_MIN_BODY_RATIO = 0.14;
const PAGE_BODY_FIT_TOLERANCE = 1;
const TOC_ENTRIES_PER_PAGE = 24;
const SOURCE_INDEX_ATTR = "data-openpress-source-index";
const NO_FOOTER_PAGE_KINDS = new Set(["cover", "toc", "chapter-opener", "back-cover"]);
const HEADING_SELECTOR =
  '.reader-page[data-page-kind="report"] .page-body > h2, ' +
  '.reader-page[data-page-kind="report"] .page-body h3, ' +
  '.reader-page[data-page-kind="report"] .page-body h4, ' +
  '.reader-page[data-page-kind="report"] > h2, ' +
  '.reader-page[data-page-kind="report"] > h3, ' +
  '.reader-page[data-page-kind="report"] > h4';

export function paginateSourcePages(sourceContainer: HTMLElement, sourcePages: SourcePage[]): PaginatedPage[] {
  normalizeSectionHeadings(sourceContainer);

  const pages = paginateDomPages(sourceContainer);
  expandTocPages(pages);
  addPageFooters(pages);
  markChapterEnds(pages);
  pages.forEach((page) => {
    if (pageKindOf(page) === "toc") buildToc(page, pages);
  });

  return pages.map((page, index) => {
    const anchors = collectElementIds(page);
    const anchor = anchors[0] ?? `page-${String(index + 1).padStart(2, "0")}`;
    const source = sourceForPage(page, sourcePages);
    stripSourceIndexMarkers(page);
    return {
      id: `openpress-rendered-page-${String(index + 1).padStart(2, "0")}`,
      title: pageTitle(page) || `Page ${index + 1}`,
      pageNumber: index + 1,
      html: page.outerHTML,
      anchors: anchors.length > 0 ? anchors : [anchor],
      source,
    };
  });
}

function paginateDomPages(sourceContainer: HTMLElement) {
  const sourceSections = Array.from(sourceContainer.querySelectorAll<HTMLElement>(".reader-page"));
  const items: Array<
    | { type: "whole"; node: HTMLElement }
    | { type: "toc"; sourceIndex: number; title: string }
    | { type: "chapter-break" }
    | { type: "block"; node: Element }
  > = [];

  sourceSections.forEach((section, sourceIndex) => {
    const kind = pageKindOf(section);
    if (section.classList.contains("toc-continuation")) return;
    if (kind === "toc") {
      items.push({ type: "toc", sourceIndex, title: section.dataset.pageTitle?.trim() || "目錄" });
      return;
    }
    if (isWholePageSurface(section)) {
      const clone = withSourceIndex(section.cloneNode(true) as HTMLElement, sourceIndex);
      if (kind) clone.dataset.pageKind = kind;
      if (!pageShouldHaveFooter(clone)) markNoFooterChrome(clone, kind);
      items.push({ type: "whole", node: clone });
      return;
    }
    const sectionBody = getPageBody(section) || section;
    Array.from(sectionBody.children).forEach((child) => {
      if (child.children.length === 0 && !child.textContent?.trim() && child.tagName === "DIV") return;
      if (child.tagName === "H2") items.push({ type: "chapter-break" });
      items.push({ type: "block", node: withSourceIndex(child.cloneNode(true) as Element, sourceIndex) });
    });
  });

  const measurementHost = createMeasurementHost();
  const measurer = createFramedPage("reader-page reader-page--report measurement", { kind: "report" });
  measurementHost.html.appendChild(measurer);
  const measurerBody = getPageBody(measurer);
  if (!measurerBody) return sourceSections;
  sourceContainer.appendChild(measurementHost.host);

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
  const pageDefs: Array<{ blocks: Element[] } | { whole: HTMLElement } | { toc: true; sourceIndex: number; title: string }> = [];
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
      pageDefs.push({ toc: true, sourceIndex: item.sourceIndex, title: item.title });
    } else if (item.type === "chapter-break") {
      measureAsChapterEnd = false;
      commit();
    } else {
      measureAsChapterEnd = lastBlockInChapter.has(index);
      tryAdd(item.node);
    }
  });
  commit();
  measurementHost.host.remove();

  return pageDefs.map((def) => {
    if ("whole" in def) return def.whole;
    if ("toc" in def) {
      const page = createFramedPage("reader-page reader-page--toc", { kind: "toc", footer: false });
      page.id = "toc";
      page.dataset.pageTitle = def.title;
      page.setAttribute(SOURCE_INDEX_ATTR, String(def.sourceIndex));
      return page;
    }
    const page = createFramedPage("reader-page reader-page--report", { kind: "report" });
    const body = getPageBody(page);
    def.blocks.forEach((block) => body?.appendChild(block));
    return page;
  });
}

function createMeasurementHost() {
  const host = document.createElement("div");
  host.className = "openpress-html-page openpress-pagination-measurement";
  host.setAttribute("aria-hidden", "true");
  host.style.position = "absolute";
  host.style.left = "-100000px";
  host.style.top = "0";
  host.style.visibility = "hidden";
  host.style.pointerEvents = "none";

  const html = document.createElement("div");
  html.className = "openpress-html-page__html";
  host.appendChild(html);

  return { host, html };
}

function withSourceIndex<T extends Element>(node: T, sourceIndex: number) {
  node.setAttribute(SOURCE_INDEX_ATTR, String(sourceIndex));
  return node;
}

function normalizeSectionHeadings(scope: ParentNode) {
  // Engine emits h2/h3 with bare heading text. Pagination assigns counter
  // values to `data-chapter` / `data-chapter-marker` / `data-section`;
  // the theme's ::before rules decide how to display them (01 / #1 / 一 / ...).
  let chapterCounter = 0;
  let sectionCounter = 0;
  let topicCounter = 0;
  scope.querySelectorAll<HTMLElement>(HEADING_SELECTOR).forEach((el) => {
    if (el.tagName === "H2") {
      chapterCounter += 1;
      sectionCounter = 0;
      topicCounter = 0;
      ensureHeadingId(el, `section-${String(chapterCounter).padStart(2, "0")}`);
      el.dataset.chapter = String(chapterCounter).padStart(2, "0");
      el.dataset.chapterMarker = `#${chapterCounter}`;
    } else if (el.tagName === "H3") {
      sectionCounter += 1;
      topicCounter = 0;
      ensureHeadingId(el, `section-${chapterCounter}-${sectionCounter}`);
      el.dataset.section = `${chapterCounter}.${sectionCounter}`;
    } else if (el.tagName === "H4") {
      topicCounter += 1;
      if (chapterCounter > 0 && sectionCounter > 0) {
        ensureHeadingId(el, `section-${chapterCounter}-${sectionCounter}-${topicCounter}`);
        el.dataset.topic = `${chapterCounter}.${sectionCounter}.${topicCounter}`;
      }
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
  const isContinuation = tocPage.dataset.tocContinuation === "true";
  tocBody.innerHTML = "";
  const heading = document.createElement("h2");
  heading.id = tocPage.id === "toc" ? "toc-title" : `${tocPage.id}-title`;
  heading.className = isContinuation ? "toc-heading toc-heading--continuation" : "toc-heading";
  heading.textContent = isContinuation ? tocContinuationTitle(headingText) : headingText;
  tocPage.setAttribute("aria-labelledby", heading.id);
  tocBody.appendChild(heading);

  const list = document.createElement("ol");
  list.className = "toc-list";
  const entries = collectTocEntries(allPages);
  const start = Number(tocPage.dataset.tocStart ?? "0");
  const end = Number(tocPage.dataset.tocEnd ?? String(entries.length));
  entries.slice(start, end).forEach((entry) => {
    if (!entry.id) return;
    const li = document.createElement("li");
    li.className = `toc-level-${entry.level}`;
    const a = document.createElement("a");
    a.href = `#${entry.id}`;
    a.dataset.openpressAnchor = entry.id;
    a.dataset.openpressTargetPageIndex = String(entry.pageIndex);
    a.innerHTML = `<span class="toc-index" data-toc-index="${escapeAttr(entry.label)}">${escapeHtml(entry.label)}</span><span class="toc-title">${escapeHtml(entry.title)}</span><span class="toc-page">${String(entry.pageIndex + 1).padStart(2, "0")}</span>`;
    li.appendChild(a);
    list.appendChild(li);
  });
  tocBody.appendChild(list);
}

function expandTocPages(pages: HTMLElement[]) {
  const tocIndex = pages.findIndex((page) => pageKindOf(page) === "toc");
  if (tocIndex < 0) return;

  const tocPage = pages[tocIndex];
  const entryCount = collectTocEntries(pages).length;
  const tocPageCount = Math.max(1, Math.ceil(entryCount / TOC_ENTRIES_PER_PAGE));
  tocPage.classList.add("reader-page--toc");
  tocPage.classList.remove("toc");
  if (tocPageCount <= 1) {
    tocPage.dataset.tocStart = "0";
    tocPage.dataset.tocEnd = String(entryCount);
    tocPage.dataset.tocContinuation = "false";
    tocPage.classList.remove("toc-continuation");
    return;
  }

  const sourceIndex = tocPage.getAttribute(SOURCE_INDEX_ATTR);
  const title = tocPage.dataset.pageTitle?.trim() || "目錄";
  const expandedPages = Array.from({ length: tocPageCount }, (_, index) => {
    const page = index === 0 ? tocPage : createFramedPage("reader-page reader-page--toc", { kind: "toc", footer: false });
    page.classList.add("reader-page--toc");
    page.classList.remove("toc");
    markNoFooterChrome(page, "toc");
    page.id = index === 0 ? "toc" : `toc-${String(index + 1).padStart(2, "0")}`;
    page.dataset.pageTitle = title;
    page.dataset.tocStart = String(index * TOC_ENTRIES_PER_PAGE);
    page.dataset.tocEnd = String((index + 1) * TOC_ENTRIES_PER_PAGE);
    page.dataset.tocContinuation = index > 0 ? "true" : "false";
    page.classList.toggle("toc-continuation", index > 0);
    page.setAttribute("aria-labelledby", index === 0 ? "toc-title" : `${page.id}-title`);
    if (sourceIndex !== null) page.setAttribute(SOURCE_INDEX_ATTR, sourceIndex);
    return page;
  });
  pages.splice(tocIndex, 1, ...expandedPages);
}

function tocContinuationTitle(title: string) {
  return title === "目錄" ? "目錄續" : `${title} continued`;
}

function collectTocEntries(allPages: HTMLElement[]) {
  const entries: Array<{ id: string; title: string; pageIndex: number; level: 2 | 3; label: string }> = [];
  let chapterIndex = 0;
  let sectionIndex = 0;
  let pendingChapterOpener: { id: string; pageIndex: number } | undefined;

  allPages.forEach((page, pageIndex) => {
    if (pageKindOf(page) === "chapter-opener") {
      pendingChapterOpener = readChapterOpenerTarget(page, pageIndex);
      return;
    }

    if (!isReportPage(page)) return;
    let pageStartedChapter = false;
    page.querySelectorAll<HTMLElement>("h2, h3").forEach((heading) => {
      if (heading.tagName === "H2") {
        const opener = pendingChapterOpener;
        pendingChapterOpener = undefined;
        pageStartedChapter = true;
        chapterIndex += 1;
        sectionIndex = 0;
        entries.push({
          id: opener?.id ?? heading.id,
          title: heading.textContent?.trim() ?? "",
          pageIndex: opener?.pageIndex ?? pageIndex,
          level: 2,
          label: heading.dataset.chapterMarker || `#${chapterIndex}`,
        });
        return;
      }

      if (heading.tagName === "H3" && chapterIndex > 0) {
        sectionIndex += 1;
        entries.push({
          id: heading.id,
          title: heading.textContent?.trim() ?? "",
          pageIndex,
          level: 3,
          label: heading.dataset.section || `${chapterIndex}.${sectionIndex}`,
        });
      }
    });
    if (!pageStartedChapter) pendingChapterOpener = undefined;
  });
  return entries;
}

function readChapterOpenerTarget(page: HTMLElement, pageIndex: number) {
  const heading = page.querySelector<HTMLElement>(".chapter-opener-title, h2");
  if (!heading?.id) return undefined;
  return {
    id: heading.id,
    pageIndex,
  };
}

function ensureHeadingId(heading: HTMLElement, fallbackId: string) {
  if (heading.id) return;
  heading.id = fallbackId;
}

function collectElementIds(scope: ParentNode) {
  const ids: string[] = [];
  scope.querySelectorAll<HTMLElement>("[id]").forEach((el) => {
    if (el.id && !ids.includes(el.id)) ids.push(el.id);
  });
  return ids;
}

function addPageFooters(allPages: HTMLElement[]) {
  let currentChapter = "";
  let chapterCount = 0;
  allPages.forEach((page, index) => {
    if (!pageShouldHaveFooter(page)) {
      markNoFooterChrome(page, pageKindOf(page));
      ensurePageShell(page, { footer: false });
      return;
    }
    const pageBody = ensurePageShell(page, { footer: true });
    const footer = getPageFooter(page);
    if (!pageBody || !footer) return;
    footer.innerHTML = "";
    let leftLabel = "";
    if (pageKindOf(page) === "toc") {
      // Use the toc page's own title (set by engine from frontmatter) so
      // non-Chinese documents don't get a Chinese label here.
      leftLabel = page.dataset.pageTitle?.trim()
        || page.querySelector<HTMLElement>(":scope .page-body > h2")?.textContent?.trim()
        || "Contents";
    } else if (isReportPage(page)) {
      const h2 = pageBody.querySelector<HTMLElement>(":scope > h2");
      if (h2) {
        currentChapter = h2.textContent?.trim() ?? "";
        chapterCount += 1;
        h2.dataset.chapter = String(chapterCount).padStart(2, "0");
        h2.dataset.chapterMarker = `#${chapterCount}`;
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
    if (!isReportPage(page)) return;
    const next = allPages[index + 1];
    const nextBody = getPageBody(next) || next;
    const nextStartsChapter = next ? isReportPage(next) && nextBody?.querySelector(":scope > h2:first-child") : false;
    const nextIsBackCover = next ? pageKindOf(next) === "back-cover" : false;
    if (!next || nextStartsChapter || nextIsBackCover) page.classList.add("is-chapter-end");
  });
}

function createFramedPage(className: string, options: { kind?: string; footer?: boolean } = {}) {
  const page = document.createElement("section");
  page.className = className;
  if (options.kind) page.dataset.pageKind = options.kind;
  if (options.footer === false) markNoFooterChrome(page, options.kind);
  ensurePageShell(page, options);
  return page;
}

function ensurePageShell(page: HTMLElement, options: { footer?: boolean } = {}) {
  const shouldHaveFooter = options.footer ?? pageShouldHaveFooter(page);
  const existingFrame = getPageFrame(page);
  if (existingFrame) {
    if (!shouldHaveFooter) markNoFooterChrome(page, pageKindOf(page));
    return getPageBody(page);
  }

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

  if (shouldHaveFooter) {
    const footer = document.createElement("footer");
    footer.className = "page-footer";
    footer.setAttribute("aria-hidden", "true");
    if (existingFooter) {
      while (existingFooter.firstChild) footer.appendChild(existingFooter.firstChild);
    }
    frame.append(header, body, footer);
  } else {
    frame.append(header, body);
    markNoFooterChrome(page, pageKindOf(page));
  }
  page.appendChild(frame);
  existingHeader?.remove();
  existingFooter?.remove();
  return body;
}

function isWholePageSurface(page: HTMLElement) {
  const kind = pageKindOf(page);
  return (
    kind === "cover" ||
    kind === "chapter-opener" ||
    kind === "back-cover"
  );
}

function pageShouldHaveFooter(page: HTMLElement) {
  const kind = pageKindOf(page);
  return (
    page.dataset.pageFooter !== "false" &&
    !page.classList.contains("no-footer") &&
    !NO_FOOTER_PAGE_KINDS.has(kind)
  );
}

function markNoFooterChrome(page: HTMLElement, kind?: string) {
  page.classList.add("no-footer");
  page.dataset.pageFooter = "false";
  if (kind && !page.dataset.pageKind) page.dataset.pageKind = kind;
  getPageFooter(page)?.remove();
}

function pageKindOf(page: HTMLElement) {
  return page.dataset.pageKind || "";
}

function isReportPage(page: HTMLElement) {
  return pageKindOf(page) === "report";
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
  if (block.tagName === "PRE") return getPreLines(block).length > 1;
  if (block.tagName === "TABLE") {
    const tbody = block.querySelector("tbody");
    return Boolean(tbody && tbody.children.length > 1);
  }
  return (block.tagName === "UL" || block.tagName === "OL") && block.children.length > 1;
}

function getParts(block: Element) {
  if (block.tagName === "PRE") {
    return getPreLines(block).map((line) => {
      const part = document.createElement("span");
      part.textContent = line;
      return part;
    });
  }
  if (block.tagName === "TABLE") return Array.from(block.querySelector("tbody")?.children ?? []);
  return Array.from(block.children);
}

function buildContainer(original: Element, parts: Element[], options: { includeCaption?: boolean; start?: number } = {}) {
  if (original.tagName === "PRE") {
    const pre = original.cloneNode(false) as HTMLElement;
    pre.classList.add("openpress-pre-fragment");
    const originalCode = original.querySelector(":scope > code");
    const code = originalCode ? (originalCode.cloneNode(false) as HTMLElement) : document.createElement("code");
    code.textContent = parts.map((part) => part.textContent ?? "").join("\n");
    pre.appendChild(code);
    return pre;
  }
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

function getPreLines(block: Element) {
  const code = block.querySelector(":scope > code");
  const text = code?.textContent ?? block.textContent ?? "";
  return splitPreTextForPagination(text);
}

export function splitPreTextForPagination(text: string) {
  const withoutTrailingNewline = text.endsWith("\n") ? text.slice(0, -1) : text;
  return withoutTrailingNewline.split("\n");
}

function pageTitle(page: HTMLElement) {
  return page.dataset.pageTitle || page.querySelector("h1, h2, h3, h4")?.textContent?.trim() || "";
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
  page.removeAttribute("data-openpress-source-index");
  page.querySelectorAll(`[${SOURCE_INDEX_ATTR}]`).forEach((el) => {
    el.removeAttribute("data-openpress-source-index");
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}
