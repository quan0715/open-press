// Layer 4 — Allocation.
//
// Per chain, fills MdxAreas with block IDs using the Phase 1 region allocator.
// Returns:
//   - `allocation`: { [frameKey]: { [chainId]: blockIds[][] } } — areas per chain, area index → blockIds
//   - `hints`: { totalPagesPerChain: { [chainId]: number } } — fed back to <Sections>
//   - `warnings`: chain-overflowed, etc.

const SANITY_LIMIT = 200;

/**
 * @param {object} opts
 * @param {Array<FrameInstance>} opts.frames       Layer 2 frame structure.
 * @param {Array<MdxAreaMeasurement>} opts.mdxAreas Layer 3 MdxArea capacities.
 * @param {Array<BlockMeasurement>} opts.blockHeights Layer 3 block heights.
 * @param {Record<string, object>} opts.sources    Resolved sources (for chain block lists).
 * @returns {AllocationResult}
 */
export function allocateChains({ frames, mdxAreas, blockHeights, sources }) {
  // Group MdxAreas by chainId, sorted by (frame order, indexInFrame)
  const chainAreas = groupAreasByChain(frames, mdxAreas);
  // Group block heights by chainId
  const blockHeightsByChain = groupBlockHeights(blockHeights);

  const allocation = {};
  const warnings = [];
  const totalPagesPerChain = {};
  // Track per-chain how many extension iterations the caller (orchestrator)
  // should request. The actual *cloning* is done at the Press tree level
  // by feeding hints back to <Sections>; here we just report how many
  // frames each chain *should* have.

  for (const [chainId, chainSource] of iterateChains(sources)) {
    const areas = chainAreas.get(chainId) ?? [];
    const blocks = buildBlockStream(chainSource, blockHeightsByChain.get(chainId));

    const regions = areas.map((a) => ({
      id: `${a.frameKey}#${a.indexInFrame}`,
      capacity: a.capacity,
      pageIndex: 0, // not used here; we keep our own mapping
      columnIndex: a.indexInFrame,
      __frameKey: a.frameKey,
      __chainId: chainId,
      __overflow: a.overflow,
    }));

    if (regions.length === 0 || blocks.length === 0) {
      // No areas to fill, or no blocks to place.
      if (blocks.length > 0) {
        warnings.push({ code: "chain-has-no-area", chainId });
      }
      // Frames already correctly count to 0 for this chain.
      // (Or it's a static-source chain like the cover, which doesn't allocate.)
      // Skip.
      // If chain has blocks but no areas, that's an authoring error.
      const sourceFrameCount = frames.filter((f) => f.mdxAreas.some((a) => a.chainId === chainId)).length;
      totalPagesPerChain[chainId] = Math.max(1, sourceFrameCount);
      continue;
    }

    const { result, neededAreas } = greedyAllocate(blocks, regions);
    const lastOverflow = regions[regions.length - 1].__overflow;
    const sourceFramesForChain = uniqueFramesForChain(frames, chainId);

    if (neededAreas > regions.length) {
      // Overflow detected.
      if (lastOverflow === "error") {
        const remaining = blocks.slice(result.consumed).map((b) => b.id);
        throw new Error(
          `Chain "${chainId}" overflowed and the last MdxArea is overflow="error". ` +
            `Remaining block IDs: ${remaining.slice(0, 5).join(", ")}${remaining.length > 5 ? `, ... (${remaining.length} total)` : ""}.`,
        );
      }
      if (lastOverflow === "truncate") {
        warnings.push({
          code: "chain-overflowed",
          chainId,
          remainingBlocks: blocks.length - result.consumed,
        });
        // Don't grow totalPages; truncate at current capacity.
        totalPagesPerChain[chainId] = sourceFramesForChain;
        recordAllocation(allocation, result, regions);
        continue;
      }
      // overflow="extend" (default): scale frame count up.
      const areasPerFrame = Math.max(1, regions.length / Math.max(1, sourceFramesForChain));
      const extraAreasNeeded = neededAreas - regions.length;
      const extraFramesNeeded = Math.ceil(extraAreasNeeded / areasPerFrame);
      const newTotal = sourceFramesForChain + extraFramesNeeded;
      if (newTotal > SANITY_LIMIT) {
        throw new Error(
          `Chain "${chainId}" would require ${newTotal} frames after extension, exceeding the sanity limit of ${SANITY_LIMIT}. ` +
            `Check that block content fits within the MdxArea capacity.`,
        );
      }
      totalPagesPerChain[chainId] = newTotal;
      // Don't record allocation yet — orchestrator will re-render with more
      // frames and re-allocate.
      continue;
    }

    totalPagesPerChain[chainId] = sourceFramesForChain;
    recordAllocation(allocation, result, regions);
  }

  return {
    allocation,
    hints: { totalPagesPerChain },
    warnings,
  };
}

function greedyAllocate(blocks, regions) {
  const filled = [];
  let regionIndex = 0;
  let currentBlockIds = [];
  let currentHeight = 0;
  let consumed = 0;
  const flush = () => {
    if (currentBlockIds.length === 0) return;
    filled.push({
      region: regions[regionIndex],
      blockIds: currentBlockIds,
    });
    currentBlockIds = [];
    currentHeight = 0;
  };
  for (const block of blocks) {
    while (regionIndex < regions.length) {
      const region = regions[regionIndex];
      if (currentBlockIds.length === 0 || currentHeight + block.height <= region.capacity) {
        currentBlockIds.push(block.id);
        currentHeight += block.height;
        consumed += 1;
        break;
      }
      // Doesn't fit — flush current region and advance
      flush();
      regionIndex += 1;
    }
    if (regionIndex >= regions.length) break;
  }
  flush();
  // neededAreas = total regions consumed if we had unlimited supply
  // For overflow detection we estimate: if consumed < blocks.length, we need more areas.
  let neededAreas = filled.length;
  if (consumed < blocks.length) {
    // Estimate how many more areas needed
    const lastCap = regions[regions.length - 1].capacity;
    const remainingBlocks = blocks.slice(consumed);
    let h = 0;
    let extra = 0;
    let inExtra = false;
    for (const b of remainingBlocks) {
      if (!inExtra || h + b.height > lastCap) {
        extra += 1;
        h = b.height;
        inExtra = true;
      } else {
        h += b.height;
      }
    }
    neededAreas += extra;
  }
  return { result: { filled, consumed }, neededAreas };
}

function recordAllocation(allocation, result, regions) {
  for (const fill of result.filled) {
    const frameKey = fill.region.__frameKey;
    const chainId = fill.region.__chainId;
    const areaIndex = fill.region.columnIndex;
    if (!allocation[frameKey]) allocation[frameKey] = {};
    if (!allocation[frameKey][chainId]) allocation[frameKey][chainId] = [];
    allocation[frameKey][chainId][areaIndex] = fill.blockIds;
  }
}

function groupAreasByChain(frames, mdxAreas) {
  // mdxAreas come from chromium in DOM order. We need to order by (frame
  // sequence position in Press tree, indexInFrame). Use frames[] order.
  const frameOrder = new Map();
  frames.forEach((f, idx) => frameOrder.set(f.frameKey, idx));
  const byChain = new Map();
  const sorted = [...mdxAreas].sort((a, b) => {
    const fa = frameOrder.get(a.frameKey) ?? Number.MAX_SAFE_INTEGER;
    const fb = frameOrder.get(b.frameKey) ?? Number.MAX_SAFE_INTEGER;
    if (fa !== fb) return fa - fb;
    return a.indexInFrame - b.indexInFrame;
  });
  for (const area of sorted) {
    if (!byChain.has(area.chainId)) byChain.set(area.chainId, []);
    byChain.get(area.chainId).push(area);
  }
  return byChain;
}

function groupBlockHeights(blockHeights) {
  const byChain = new Map();
  for (const block of blockHeights) {
    if (!byChain.has(block.chainId)) byChain.set(block.chainId, new Map());
    byChain.get(block.chainId).set(block.id, block.height);
  }
  return byChain;
}

function buildBlockStream(chainSource, heightMap) {
  if (!chainSource || !heightMap) return [];
  return chainSource.map((block) => ({
    id: block.id,
    height: heightMap.get(block.id) ?? 0,
  }));
}

function* iterateChains(sources) {
  for (const source of Object.values(sources)) {
    for (const [chainId, blocks] of Object.entries(source.chains)) {
      yield [chainId, blocks];
    }
  }
}

function uniqueFramesForChain(frames, chainId) {
  const set = new Set();
  for (const f of frames) {
    if (f.mdxAreas.some((a) => a.chainId === chainId)) set.add(f.frameKey);
  }
  return Math.max(1, set.size);
}
