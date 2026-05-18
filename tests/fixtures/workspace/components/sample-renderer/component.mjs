export function render({ attrs, data, helpers }) {
  const variant = helpers.escapeAttr(attrs.variant ?? "default");
  const message = helpers.escapeHtml(data?.message ?? "(empty)");
  const tag = helpers.escapeHtml(data?.tag ?? "default-tag");
  return `<aside data-qdoc-component="sample-renderer" data-variant="${variant}" data-tag="${tag}"><p>${message}</p></aside>`;
}
