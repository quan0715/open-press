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

  return entities;
}
