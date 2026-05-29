export function createObjectEntityId(kind, ...parts) {
  return [kind, ...parts.map((part) => encodeURIComponent(String(part)))].join(":");
}

export function createBlockObjectEntityId(blockId) {
  return createObjectEntityId("mdx-block", blockId);
}

export function createPageObjectEntityId(frameKey) {
  return createObjectEntityId("page", frameKey);
}

export function createFrameObjectEntityId(frameKey) {
  return createObjectEntityId("frame", frameKey);
}

export function createScopedObjectEntityId(kind, parentId, objectId) {
  return parentId ? createObjectEntityId(kind, parentId, objectId) : createObjectEntityId(kind, objectId);
}

export function createMdxAreaObjectEntityId(frameKey, chainId, indexInFrame) {
  return createObjectEntityId("mdx-area", frameKey, chainId, indexInFrame);
}

export function buildObjectEntities({ frames, blocks, blockMap }) {
  const entities = {};
  const blockParentIdByBlockId = new Map();

  for (const block of blocks) {
    const frameKey = block.frameKey ?? block.id;
    const sourcePath = block.source?.path;
    const pageId = createPageObjectEntityId(frameKey);
    const base = {
      frameKey,
      pageId,
      source: sourcePath
        ? {
            path: sourcePath,
            file: block.source?.file,
            line: 1,
            column: 1,
          }
        : undefined,
    };

    entities[pageId] = {
      id: pageId,
      kind: "page",
      label: block.title || `Page ${block.pageNumber}`,
      ...base,
    };

    const frameId = createFrameObjectEntityId(frameKey);
    entities[frameId] = {
      id: frameId,
      kind: "frame",
      label: block.role || block.title || frameKey,
      ...base,
      parentId: pageId,
      metadata: { role: block.role ?? null, chrome: block.chrome ?? null },
    };
  }

  for (const frame of frames) {
    const pageId = createPageObjectEntityId(frame.frameKey);
    const frameId = createFrameObjectEntityId(frame.frameKey);
    for (const area of frame.mdxAreas ?? []) {
      const id = createMdxAreaObjectEntityId(frame.frameKey, area.chainId, area.indexInFrame);
      const firstEditableBlock = (area.blockIds ?? [])
        .map((blockId) => blockMap[blockId])
        .find((block) => block?.path);
      for (const blockId of area.blockIds ?? []) blockParentIdByBlockId.set(blockId, id);
      entities[id] = {
        id,
        kind: "mdx-area",
        label: `${area.chainId} area ${area.indexInFrame + 1}`,
        parentId: frameId,
        pageId,
        frameKey: frame.frameKey,
        chainId: area.chainId,
        source: firstEditableBlock
          ? {
              path: firstEditableBlock.path,
              source: firstEditableBlock.source,
              line: firstEditableBlock.source?.line,
              column: firstEditableBlock.source?.column,
            }
          : undefined,
        metadata: { blockCount: area.blockIds?.length ?? 0 },
      };
    }
  }

  for (const block of Object.values(blockMap)) {
    if (!block?.id) continue;
    const id = createBlockObjectEntityId(block.id);
    const pageId = block.frameKey ? createPageObjectEntityId(block.frameKey) : undefined;
    entities[id] = {
      id,
      kind: "mdx-block",
      label: block.name ? `${block.name} ${block.id}` : block.id,
      parentId: blockParentIdByBlockId.get(block.id),
      pageId,
      blockId: block.id,
      frameKey: block.frameKey,
      chainId: block.chainId,
      source: block.path
        ? {
            path: block.path,
            source: block.source,
            line: block.source?.line,
            column: block.source?.column,
          }
        : undefined,
      metadata: {
        blockKind: block.kind ?? null,
        componentName: block.kind === "component" ? block.name ?? null : null,
      },
    };
  }

  for (const entity of collectRenderedObjectEntities(frames)) {
    if (!entity.id || entities[entity.id]) continue;
    const pageId = entity.pageId || createPageObjectEntityId(entity.frameKey);
    const frameId = createFrameObjectEntityId(entity.frameKey);
    entities[entity.id] = {
      id: entity.id,
      kind: entity.kind,
      label: entity.label || entity.id,
      parentId: entity.parentId || (entity.id === frameId ? pageId : frameId),
      pageId,
      blockId: entity.blockId,
      frameKey: entity.frameKey,
      chainId: entity.chainId,
      source: entity.source,
      metadata: entity.metadata,
    };
  }

  return entities;
}

const OBJECT_OPEN_RE = /<([a-z][a-z0-9-]*)\b([^>]*)\bdata-openpress-object-id="([^"]+)"([^>]*)>/gi;
const ATTR_RE = (name) => new RegExp(`\\b${name}="([^"]*)"`);

function collectRenderedObjectEntities(frames) {
  const entities = [];
  for (const frame of frames) {
    const pageId = createPageObjectEntityId(frame.frameKey);
    const frameId = createFrameObjectEntityId(frame.frameKey);
    const html = String(frame.html ?? "");
    let match;
    OBJECT_OPEN_RE.lastIndex = 0;
    while ((match = OBJECT_OPEN_RE.exec(html)) !== null) {
      const attrs = `${match[2] ?? ""} data-openpress-object-id="${match[3] ?? ""}" ${match[4] ?? ""}`;
      const id = htmlDecode(match[3] ?? "");
      const kind = htmlDecode(pickAttr(attrs, "data-openpress-object-kind")) || objectKindFromId(id);
      if (!id || !kind) continue;
      entities.push({
        id,
        kind,
        label: htmlDecode(pickAttr(attrs, "data-openpress-object-label")) || id,
        parentId: htmlDecode(pickAttr(attrs, "data-openpress-object-parent-id")) || (id === frameId ? pageId : frameId),
        pageId: htmlDecode(pickAttr(attrs, "data-openpress-object-page-id")) || pageId,
        blockId: htmlDecode(pickAttr(attrs, "data-openpress-block-id")) || undefined,
        frameKey: htmlDecode(pickAttr(attrs, "data-openpress-object-frame-key")) || frame.frameKey,
        chainId: htmlDecode(pickAttr(attrs, "data-openpress-object-chain-id")) || undefined,
        source: parseJsonAttribute(pickAttr(attrs, "data-openpress-object-source")),
        metadata: parseJsonAttribute(pickAttr(attrs, "data-openpress-object-metadata")),
      });
    }
  }
  return entities;
}

function pickAttr(attrs, name) {
  const match = ATTR_RE(name).exec(attrs);
  return match ? match[1] : "";
}

function objectKindFromId(id) {
  const separator = id.indexOf(":");
  return separator === -1 ? "" : id.slice(0, separator);
}

function parseJsonAttribute(value) {
  const decoded = htmlDecode(value);
  if (!decoded) return undefined;
  try {
    return JSON.parse(decoded);
  } catch {
    return undefined;
  }
}

function htmlDecode(value) {
  return String(value ?? "")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}
