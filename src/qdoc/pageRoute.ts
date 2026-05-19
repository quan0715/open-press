const PAGE_HASH_PATTERN = /^#page-(\d+)$/;

export function pageHashFromIndex(pageIndex: number) {
  return `#page-${String(Math.max(1, pageIndex + 1)).padStart(2, "0")}`;
}

export function pageIndexFromHash(hash: string, pageCount: number) {
  const match = hash.match(PAGE_HASH_PATTERN);
  if (!match) return null;

  const pageNumber = Number.parseInt(match[1], 10);
  if (!Number.isFinite(pageNumber) || pageNumber < 1 || pageNumber > pageCount) return null;
  return pageNumber - 1;
}

export function replacePageRoute(pageIndex: number) {
  if (typeof window === "undefined") return;
  const hash = pageHashFromIndex(pageIndex);
  if (window.location.hash === hash) return;
  window.history.replaceState(null, "", hash);
}
