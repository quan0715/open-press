export function compareQDocPaginationParity({
  legacyDocument,
  reactDocument,
  label = "QDoc document",
  maxPageDelta = 0,
} = {}) {
  const legacyPageCount = htmlPageCount(legacyDocument);
  const reactPageCount = htmlPageCount(reactDocument);
  const delta = reactPageCount - legacyPageCount;
  const issues = [];

  if (Math.abs(delta) > maxPageDelta) {
    issues.push({
      code: "pagination-parity.page-count",
      message: `${label} page count changed from ${legacyPageCount} to ${reactPageCount}.`,
      legacyPageCount,
      reactPageCount,
      delta,
    });
  }

  return {
    ok: issues.length === 0,
    legacyPageCount,
    reactPageCount,
    delta,
    issues,
  };
}

function htmlPageCount(document) {
  return (document?.blocks ?? []).filter((block) => block?.kind === "htmlPage").length;
}
