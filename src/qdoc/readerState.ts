export function clampReaderPageIndex(value: number, pageCount: number) {
  const normalizedPageCount = normalizeReaderPageCount(pageCount);
  if (normalizedPageCount <= 0) return 0;
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.trunc(value), 0), normalizedPageCount - 1);
}

export function formatReaderPageNumber(value: number) {
  return String(Math.max(Math.trunc(value), 1)).padStart(2, "0");
}

export function normalizeReaderPageCount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(Math.trunc(value), 0);
}
