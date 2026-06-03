const CURRENT_RE = /(<span\b[^>]*\bdata-openpress-page-folio-current="true"[^>]*>)([\s\S]*?)(<\/span>)/gi;
const TOTAL_RE = /(<span\b[^>]*\bdata-openpress-page-folio-total="true"[^>]*>)([\s\S]*?)(<\/span>)/gi;

export function resolvePageFoliosInHtml(html, { pageIndex, totalPages }) {
  const current = Math.max(1, Math.trunc(pageIndex) + 1);
  const total = Math.max(0, Math.trunc(totalPages));

  return String(html ?? "")
    .replace(CURRENT_RE, (match, open, _body, close) => {
      const format = pickAttr(open, "data-openpress-page-folio-format") || "plain";
      return `${open}${escapeHtml(formatPageNumber(current, format))}${close}`;
    })
    .replace(TOTAL_RE, (match, open, _body, close) => {
      const format = pickAttr(open, "data-openpress-page-folio-format") || "plain";
      return `${open}${escapeHtml(formatPageNumber(total, format))}${close}`;
    });
}

export function formatPageNumber(value, format = "plain") {
  const normalized = Math.max(0, Math.trunc(Number(value) || 0));
  if (format === "3-digit") return String(normalized).padStart(3, "0");
  if (format === "2-digit") return String(normalized).padStart(2, "0");
  return String(normalized);
}

function pickAttr(attrs, name) {
  const re = new RegExp(`${name}="([^"]*)"`);
  const match = re.exec(attrs);
  return match?.[1];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
