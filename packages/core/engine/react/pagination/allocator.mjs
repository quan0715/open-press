import { DEFAULT_PAGE_SAFE_HEIGHT_PX } from "../pagination-constants.mjs";
import { singleColumnRegionStream } from "./regions.mjs";

// Pure region-based block allocator.
//
// Greedy bin-packing: walk measured blocks in order, append to the current
// region until adding the next block would exceed capacity, then advance to
// the next region. Pages are a derived view (grouping by pageIndex), so the
// same code paginates single-column, multi-column, and heterogeneous layouts.
export function allocateBlocksToRegions(measuredBlocks, regionStream, options = {}) {
  const keepWithNext = typeof options.keepWithNext === "function" ? options.keepWithNext : null;
  const filled = [];
  const warnings = [];
  let current = regionStream.next();
  if (!current) {
    return { regions: filled, warnings: [{ code: "out-of-regions" }] };
  }
  let currentBlockIds = [];
  let currentHeight = 0;
  let consumedCount = 0;

  const flush = () => {
    if (currentBlockIds.length === 0) return;
    filled.push({
      regionId: current.id,
      pageIndex: current.pageIndex,
      columnIndex: current.columnIndex,
      blockIds: currentBlockIds,
    });
    currentBlockIds = [];
    currentHeight = 0;
  };

  const blocks = measuredBlocks ?? [];
  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex];
    const id = String(block?.id ?? "");
    if (!id) continue;
    const height = Math.max(0, Number(block.height) || 0);

    if (height > current.capacity) {
      warnings.push({
        code: "block-overflows-region",
        blockId: id,
        height,
        regionCapacity: current.capacity,
        regionId: current.id,
        pageIndex: current.pageIndex,
      });
    }

    const nextBlock = blocks[blockIndex + 1];
    const nextHeight = Math.max(0, Number(nextBlock?.height) || 0);
    const keepWithNextHeight = keepWithNext?.(block, nextBlock) ? height + nextHeight : 0;

    if (
      currentBlockIds.length > 0 &&
      keepWithNextHeight > 0 &&
      currentHeight + keepWithNextHeight > current.capacity
    ) {
      flush();
      const next = regionStream.next();
      if (!next) {
        warnings.push({ code: "out-of-regions", blockId: id });
        break;
      }
      current = next;
    }

    if (currentBlockIds.length > 0 && currentHeight + height > current.capacity) {
      flush();
      const next = regionStream.next();
      if (!next) {
        warnings.push({ code: "out-of-regions", blockId: id });
        break;
      }
      current = next;
    }

    currentBlockIds.push(id);
    currentHeight += height;
    consumedCount += 1;
  }

  flush();
  return { regions: filled, warnings, consumedCount };
}

export function estimateRegionsNeeded(measuredBlocks, regionCapacity, options = {}) {
  const capacity = positiveNumber(regionCapacity, DEFAULT_PAGE_SAFE_HEIGHT_PX);
  const result = allocateBlocksToRegions(measuredBlocks, infiniteFixedCapacityRegionStream(capacity), options);
  return result.regions.length;
}

// Derive a flat pages[] view from filled regions. Blocks within a page are
// emitted in column order (col 0, col 1, ...) — matching how readers consume
// a multi-column page (left-to-right, top-to-bottom).
export function pagesFromRegions(filledRegions) {
  const byPage = new Map();
  for (const region of filledRegions) {
    if (!byPage.has(region.pageIndex)) byPage.set(region.pageIndex, []);
    byPage.get(region.pageIndex).push(region);
  }
  const pages = [];
  for (const [pageIndex, regionsOnPage] of [...byPage.entries()].sort((a, b) => a[0] - b[0])) {
    const sorted = regionsOnPage.slice().sort((a, b) => a.columnIndex - b.columnIndex);
    const blockIds = sorted.flatMap((r) => r.blockIds);
    pages.push({
      pageIndex,
      blockIds,
      breakAfter: blockIds.at(-1),
    });
  }
  return pages;
}

// Public wrapper preserving the existing (blocks, { pageSafeHeightPx }) signature.
// New code can pass a `regions` stream directly to opt into multi-column or
// heterogeneous layouts.
export function paginateMeasuredBlocks(measuredBlocks, options = {}) {
  const { pageSafeHeightPx = DEFAULT_PAGE_SAFE_HEIGHT_PX, regions } = options;
  const safeHeight = positiveNumber(pageSafeHeightPx, DEFAULT_PAGE_SAFE_HEIGHT_PX);
  const stream = regions ?? singleColumnRegionStream({ pageSafeHeightPx: safeHeight });
  const { regions: filledRegions, warnings } = allocateBlocksToRegions(measuredBlocks, stream);
  const pages = pagesFromRegions(filledRegions);
  return {
    pages,
    regions: filledRegions,
    warnings: warnings.map((w) => mapWarning(w, safeHeight)),
  };
}

function infiniteFixedCapacityRegionStream(capacity) {
  let index = 0;
  return {
    next() {
      const region = {
        id: `estimate-region-${index}`,
        capacity,
        pageIndex: index,
        columnIndex: 0,
      };
      index += 1;
      return region;
    },
  };
}

// Translate the new region-shaped warnings back to the existing
// `block-overflows-page` schema that document-export.mjs and downstream
// consumers expect. Once consumers migrate, this can drop.
function mapWarning(warning, pageSafeHeightPx) {
  if (warning.code === "block-overflows-region") {
    return {
      code: "block-overflows-page",
      blockId: warning.blockId,
      height: warning.height,
      pageSafeHeightPx,
    };
  }
  return warning;
}

function positiveNumber(value, defaultValue) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : defaultValue;
}
