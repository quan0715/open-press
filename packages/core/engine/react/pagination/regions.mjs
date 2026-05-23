// A Region is a fillable area on a page — the engine treats pagination as a
// stream of regions consumed in order. One single-column page is "one region";
// a two-column page is two regions on the same pageIndex; a newspaper page
// could be three (main-left, main-right, sidebar).
//
// A RegionStream is a lazy iterator that yields regions on demand. The
// allocator pulls the next region when the current one is full. This makes
// "multi-column" and "newspaper-style mixed layout" the same code path as
// single-column — only the stream differs.
//
// Shape:
//   Region = { id: string, capacity: number, pageIndex: number, columnIndex: number }
//   RegionStream = { next(): Region } | Iterable<Region>

/**
 * Default region stream: an infinite sequence of single-column pages.
 * Equivalent to today's "one safe-height page after another" behavior.
 */
export function singleColumnRegionStream({ pageSafeHeightPx }) {
  return iteratorFromGenerator(function* () {
    let pageIndex = 0;
    while (true) {
      yield {
        id: `page-${pageIndex}-col-0`,
        capacity: pageSafeHeightPx,
        pageIndex,
        columnIndex: 0,
      };
      pageIndex++;
    }
  });
}

/**
 * Multi-column region stream: each page yields `columnCount` regions in order,
 * all sharing the same pageIndex but with increasing columnIndex.
 *
 * Blocks fill column 0 first, then column 1, then advance to the next page's
 * column 0 — same greedy semantics as single-column, just more regions per page.
 */
export function multiColumnRegionStream({ pageSafeHeightPx, columnCount }) {
  const cols = Math.max(1, Math.floor(columnCount) || 1);
  return iteratorFromGenerator(function* () {
    let pageIndex = 0;
    while (true) {
      for (let col = 0; col < cols; col++) {
        yield {
          id: `page-${pageIndex}-col-${col}`,
          capacity: pageSafeHeightPx,
          pageIndex,
          columnIndex: col,
        };
      }
      pageIndex++;
    }
  });
}

/**
 * Build a region stream from an explicit list of regions. Useful for
 * heterogeneous layouts (e.g. a research-article first page with a wide
 * abstract region on top + two narrow columns below). Stream ends when
 * the list is exhausted — the caller is responsible for providing enough
 * regions; the allocator emits an `out-of-regions` warning otherwise.
 */
export function fixedRegionStream(regions) {
  const list = Array.isArray(regions) ? regions : [];
  return iteratorFromGenerator(function* () {
    for (const region of list) yield region;
  });
}

function iteratorFromGenerator(genFn) {
  const iter = genFn();
  return {
    next() {
      const { value, done } = iter.next();
      return done ? null : value;
    },
  };
}
