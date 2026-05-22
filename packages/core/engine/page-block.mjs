import path from "node:path";

export function documentRelativePath(config, ...parts) {
  return path.posix.join(
    ...(config.documentDir === "." ? [] : [config.documentDir]),
    ...parts,
  );
}

function rewriteAssetPaths(pageHtml, config) {
  const mediaDir = config.mediaDir.replace(/^\/+|\/+$/g, "");
  return pageHtml
    .replaceAll(`src="${mediaDir}/`, 'src="/openpress/media/')
    .replaceAll(`src='${mediaDir}/`, "src='/openpress/media/");
}

export function pageToBlock(index, pageHtml, source, config, { idPrefix = "openpress-page", anchorPrefix = "page", titleFallback = "Page" } = {}) {
  const paddedIndex = String(index + 1).padStart(2, "0");
  const title = pageHtml.match(/data-page-title="([^"]*)"/)?.[1] ?? `${titleFallback} ${index + 1}`;
  const anchor = pageHtml.match(/\bid="([^"]+)"/)?.[1] ?? `${anchorPrefix}-${paddedIndex}`;
  return {
    id: `${idPrefix}-${paddedIndex}`,
    kind: "htmlPage",
    title,
    pageNumber: index + 1,
    source,
    html: rewriteAssetPaths(pageHtml, config),
    anchors: [anchor],
  };
}
