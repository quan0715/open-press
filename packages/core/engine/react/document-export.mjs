import fs from "node:fs/promises";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { documentRelativePath, pageToBlock } from "../page-block.mjs";
import { injectStaticToc } from "../page-renderer.mjs";
import { syncPublicAssets } from "../public-assets.mjs";
import { buildChapterScopedCss } from "./chapter-css.mjs";
import { loadReactDocumentEntry, createReactSsrServer } from "./document-entry.mjs";
import { buildReactMeasurementCss } from "./measurement-css.mjs";
import { compileMdx } from "./mdx-compile.mjs";
import { measureBlocksInChromium } from "./pagination.mjs";
import { discoverReactWorkspace } from "./workspace-discovery.mjs";

export async function exportReactDocument(root = ".", { syncAssets = true, pagination = null } = {}) {
  const workspaceRoot = path.resolve(root);
  const entry = await loadReactDocumentEntry(workspaceRoot);
  if (!entry) return null;

  const workspace = await discoverReactWorkspace(workspaceRoot, entry.config);
  const paginationOptions = normalizePaginationOptions(pagination);
  if (paginationOptions.enabled && paginationOptions.needsMeasurementCss) {
    paginationOptions.css = await buildReactMeasurementCss(workspaceRoot, entry.config, workspace);
  }
  const server = await createReactSsrServer(workspaceRoot);
  try {
    const pageJobs = [];
    const blockMap = {};
    const paginationWarnings = [];
    addShellPage(pageJobs, entry.shell.cover, shellSource(entry.config, "cover"));
    addShellPage(pageJobs, entry.shell.toc, shellSource(entry.config, "toc"));

    for (const [chapterIndex, chapter] of workspace.chapters.entries()) {
      const chapterModule = await loadChapterModule(server, chapter);
      const chapterMeta = normalizeChapterMeta(chapter, chapterModule.meta);
      const components = await loadComponentScope(server, chapter.componentScope);
      const Page = typeof chapterModule.Page === "function" ? chapterModule.Page : components.Page ?? DefaultContentPage;

      addShellPage(
        pageJobs,
        chapterModule.opener ?? null,
        chapterSource(entry.config, chapter, {
          chapterIndex,
          kind: "chapter-opener",
          slug: chapterMeta.slug,
          title: chapterMeta.title,
        }),
      );

      for (const contentFile of chapter.contentFiles) {
        const source = await fs.readFile(contentFile.absolutePath, "utf8");
        const compiled = await compileMdx({
          source,
          filePath: contentFile.absolutePath,
          components,
          chapterSlug: chapterMeta.slug,
        });
        const sourceRecord = chapterSource(entry.config, chapter, {
          chapterIndex,
          contentFile,
          kind: "content",
          slug: chapterMeta.slug,
          title: chapterMeta.title,
        });
        const mdxBlocks = compiled.blocks.map((block) => sanitizeMdxBlock(entry.config, contentFile, block));

        if (!paginationOptions.enabled || mdxBlocks.length === 0) {
          pageJobs.push(mdxPageJob({
            Page,
            Content: compiled.Content,
            source: sourceRecord,
            mdxBlocks,
            chapterMeta,
          }));
          continue;
        }

        const measurementHtml = renderToStaticMarkup(React.createElement(
          Page,
          {
            pageIndex: 0,
            totalPages: 1,
            chapterSlug: chapterMeta.slug,
            chapterTone: chapterMeta.tone,
          },
          React.createElement(compiled.Content),
        ));
        const measured = await paginationOptions.measureBlocks({
          html: measurementHtml,
          blockIds: mdxBlocks.map((block) => block.id),
          pageSafeHeightPx: paginationOptions.pageSafeHeightPx,
          css: paginationOptions.css,
          chapterSlug: chapterMeta.slug,
          contentFile,
          source: sourceRecord,
        });
        const blockLookup = Object.fromEntries(mdxBlocks.map((block) => [block.id, block]));
        for (const warning of measured.warnings ?? []) {
          paginationWarnings.push(enrichPaginationWarning(warning, blockLookup));
        }

        for (const measuredPage of measured.pages ?? []) {
          const pageCompiled = await compileMdx({
            source,
            filePath: contentFile.absolutePath,
            components,
            chapterSlug: chapterMeta.slug,
            includeBlockIds: measuredPage.blockIds,
          });
          const pageBlockSet = new Set(measuredPage.blockIds);
          pageJobs.push(mdxPageJob({
            Page,
            Content: pageCompiled.Content,
            source: {
              ...sourceRecord,
              sectionIndex: measuredPage.pageIndex + 1,
            },
            mdxBlocks: mdxBlocks.filter((block) => pageBlockSet.has(block.id)),
            chapterMeta,
            pagination: {
              blockIds: measuredPage.blockIds,
              breakAfter: measuredPage.breakAfter,
            },
          }));
        }
      }
    }

    addShellPage(pageJobs, entry.shell.backCover, shellSource(entry.config, "back-cover"));

    const renderedPages = renderPageJobsWithInjectedToc(pageJobs);
    const blocks = renderedPages.map((page, index) => {
      for (const block of page.mdxBlocks ?? []) {
        blockMap[block.id] = {
          ...block,
          pageIndex: index,
          pageNumber: index + 1,
        };
      }
      return pageToBlock(index, page.html, page.source, entry.config);
    });
    const chapterCss = await buildChapterScopedCss(workspace);
    const styles = [];
    if (chapterCss.trim()) {
      await fs.mkdir(entry.config.paths.publicDir, { recursive: true });
      await fs.writeFile(path.join(entry.config.paths.publicDir, "chapter-scoped.css"), chapterCss, "utf8");
      styles.push({
        kind: "chapter-scoped-css",
        href: "/openpress/chapter-scoped.css",
        path: "chapter-scoped.css",
      });
    }

    const readerDocument = {
      meta: {
        title: trimmedString(entry.config.title) ?? "Untitled Document",
        subtitle: trimmedString(entry.config.subtitle) ?? "",
        organization: trimmedString(entry.config.organization) ?? "",
        workspaceLabel: trimmedString(entry.config.workspaceLabel) ?? trimmedString(entry.config.title) ?? "Untitled Document",
        version: "openpress-react-export-v1",
      },
      source: {
        type: "openpress-react-mdx",
        contentDir: documentRelativePath(entry.config, entry.config.sourceDir),
        editable: true,
        editMode: "source-mdx",
        styles,
        blockMap,
        ...(paginationOptions.enabled ? {
          pagination: {
            mode: "build-time-block-measurement",
            ...(paginationOptions.pageSafeHeightPx ? { pageSafeHeightPx: paginationOptions.pageSafeHeightPx } : {}),
            warnings: paginationWarnings,
          },
        } : {}),
      },
      blocks,
    };

    const documentPath = path.join(entry.config.paths.publicDir, "document.json");
    await fs.mkdir(entry.config.paths.publicDir, { recursive: true });
    await fs.writeFile(documentPath, JSON.stringify(readerDocument, null, 2), "utf8");
    if (syncAssets) {
      await syncPublicAssets(workspaceRoot, entry.config.paths.publicDir, entry.config);
    }
    return { documentPath, pageCount: blocks.length, document: readerDocument };
  } finally {
    await server.close();
  }
}

function renderPageJobsWithInjectedToc(pageJobs) {
  let records = renderPageJobs(pageJobs, pageJobs.length);
  let injectedHtml = injectStaticToc(records.map((record) => record.html));
  if (injectedHtml.length !== records.length) {
    records = renderPageJobs(pageJobs, injectedHtml.length);
    injectedHtml = injectStaticToc(records.map((record) => record.html));
  }
  return alignInjectedTocRecords(records, injectedHtml);
}

function renderPageJobs(pageJobs, totalPages) {
  return pageJobs.map((job, index) => ({
    html: renderToStaticMarkup(job.render(index, totalPages)),
    source: job.source,
    mdxBlocks: job.mdxBlocks ?? [],
  }));
}

function alignInjectedTocRecords(records, injectedHtml) {
  if (injectedHtml.length === records.length) {
    return records.map((record, index) => ({
      ...record,
      html: injectedHtml[index],
    }));
  }

  const tocIndex = records.findIndex((record) => hasReaderPageKind(record.html, "toc"));
  const extra = injectedHtml.length - records.length;
  if (tocIndex < 0 || extra < 1) {
    throw new Error(`React TOC injection changed page count unexpectedly: ${records.length} -> ${injectedHtml.length}`);
  }

  return injectedHtml.map((html, index) => {
    if (index < tocIndex) return { ...records[index], html };
    if (index <= tocIndex + extra) {
      return {
        html,
        source: {
          ...records[tocIndex].source,
          sectionIndex: index - tocIndex + 1,
        },
        mdxBlocks: [],
      };
    }
    const sourceRecord = records[index - extra];
    return {
      ...sourceRecord,
      html,
    };
  });
}

function hasReaderPageKind(html, kind) {
  const openingTag = String(html).match(/^<section[^>]*>/i)?.[0] ?? "";
  return openingTag.match(/\bdata-page-kind="([^"]*)"/i)?.[1] === kind;
}

function addShellPage(pageJobs, element, source) {
  if (element == null) return;
  pageJobs.push({
    source,
    render() {
      return element;
    },
  });
}

function mdxPageJob({ Page, Content, source, mdxBlocks, chapterMeta, pagination = null }) {
  return {
    source,
    mdxBlocks,
    pagination,
    render(pageIndex, totalPages) {
      return React.createElement(
        Page,
        {
          pageIndex,
          totalPages,
          chapterSlug: chapterMeta.slug,
          chapterTone: chapterMeta.tone,
        },
        React.createElement(Content),
      );
    },
  };
}

async function loadChapterModule(server, chapter) {
  if (!chapter.chapterEntry) return {};
  return server.ssrLoadModule(chapter.chapterEntry.absolutePath);
}

async function loadComponentScope(server, componentScope) {
  const components = {};
  for (const [name, component] of Object.entries(componentScope ?? {})) {
    const mod = await server.ssrLoadModule(component.absolutePath);
    if (typeof mod.default !== "function") {
      throw new Error(`OpenPress React component must default-export a component: ${component.documentPath}`);
    }
    components[name] = mod.default;
  }
  return components;
}

function normalizeChapterMeta(chapter, meta) {
  const rawMeta = meta && typeof meta === "object" ? meta : {};
  return {
    slug: trimmedString(rawMeta.slug) ?? chapter.slug,
    title: trimmedString(rawMeta.title) ?? chapter.slug,
    tone: trimmedString(rawMeta.tone) ?? undefined,
  };
}

function shellSource(config, kind) {
  return {
    file: "index.tsx",
    path: documentRelativePath(config, "index.tsx"),
    kind,
    slug: kind,
    sectionIndex: 1,
  };
}

function chapterSource(config, chapter, { chapterIndex, contentFile, kind, slug, title }) {
  const file = contentFile?.documentPath ?? chapter.chapterEntry?.documentPath ?? chapter.documentPath;
  return {
    file: path.basename(file),
    path: documentRelativePath(config, file),
    kind,
    chapter: chapterIndex + 1,
    slug,
    title,
    sectionIndex: 1,
  };
}

function sanitizeMdxBlock(config, contentFile, block) {
  return {
    id: block.id,
    kind: block.kind,
    name: block.name,
    chapterSlug: block.chapterSlug,
    path: documentRelativePath(config, contentFile.documentPath),
    source: block.source,
  };
}

function enrichPaginationWarning(warning, blockLookup) {
  const block = blockLookup[warning.blockId];
  return {
    ...warning,
    ...(block ? {
      path: block.path,
      source: block.source,
    } : {}),
  };
}

function normalizePaginationOptions(pagination) {
  if (!pagination?.enabled) {
    return { enabled: false };
  }
  const pageSafeHeightPx = positiveNumber(pagination.pageSafeHeightPx, null);
  return {
    enabled: true,
    pageSafeHeightPx,
    needsMeasurementCss: typeof pagination.measureBlocks !== "function",
    measureBlocks: pagination.measureBlocks ?? ((input) => measureBlocksInChromium({
      html: input.html,
      css: input.css,
      pageSafeHeightPx,
    })),
  };
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function DefaultContentPage({ pageIndex, totalPages, chapterSlug, chapterTone, children }) {
  return React.createElement(
    "section",
    {
      className: "reader-page reader-page--content",
      "data-page-footer": "true",
      "data-page-kind": "content",
      "data-page-index": pageIndex,
      "data-total-pages": totalPages,
      "data-chapter-slug": chapterSlug,
      "data-chapter-tone": chapterTone,
    },
    children,
  );
}

function trimmedString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
