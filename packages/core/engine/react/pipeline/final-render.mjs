// Layer 5 — Final Render.
//
// Given the allocation map (frameKey -> chainId -> areaIndex -> blockIds),
// pre-compiles each MdxArea's block subset into React nodes, then renders
// the Press tree one more time with `PressContext.allocation` populated.
// The output HTML is parsed back into per-frame fragments for document.json.

import React from "react";
import { expandPressTree } from "./press-tree.mjs";
import { compileChainBlocks } from "../sources/mdx-resolver.mjs";

/**
 * @returns {{ frames: Array<{ frameKey, role, chrome, html, blockIds, mdxAreas }>, html: string }}
 */
export async function renderFinalPress({
  Press,
  PressContext,
  sources,
  hints,
  allocation: blockAllocation, // chainId blockId allocator output: { [frameKey]: { [chainId]: blockIds[][] } }
  renderRegistry,
}) {
  // 1. Compile React nodes per (frameKey, chainId, areaIndex)
  const reactAllocation = await buildReactAllocation(blockAllocation, sources, renderRegistry);

  // 2. Render Press tree with allocation in context
  const { html, frames } = expandPressTree({
    Press,
    PressContext,
    sources,
    hints,
    allocation: reactAllocation,
  });

  // 3. Annotate frame instances with blockIds (for document.json)
  const framesWithBlocks = frames.map((frame) => {
    const frameBlocks = blockAllocation[frame.frameKey] ?? {};
    const blockIds = [];
    const mdxAreas = frame.mdxAreas.map((area) => {
      const ids = frameBlocks[area.chainId]?.[area.indexInFrame] ?? [];
      blockIds.push(...ids);
      return {
        chainId: area.chainId,
        indexInFrame: area.indexInFrame,
        blockIds: ids,
      };
    });
    return {
      frameKey: frame.frameKey,
      role: frame.role,
      chrome: frame.chrome,
      html: frame.html,
      blockIds,
      mdxAreas,
    };
  });

  return { frames: framesWithBlocks, html };
}

async function buildReactAllocation(blockAllocation, sources, renderRegistry) {
  /** @type {Record<string, Record<string, React.ReactNode[]>>} */
  const out = {};
  const sourceOfChain = new Map();
  for (const source of Object.values(sources)) {
    for (const chainId of Object.keys(source.chains)) {
      sourceOfChain.set(chainId, source.id);
    }
  }

  for (const [frameKey, chainMap] of Object.entries(blockAllocation)) {
    out[frameKey] = {};
    for (const [chainId, areaArr] of Object.entries(chainMap)) {
      const nodesByArea = [];
      for (let areaIndex = 0; areaIndex < areaArr.length; areaIndex++) {
        const blockIds = areaArr[areaIndex] ?? [];
        if (blockIds.length === 0) {
          nodesByArea[areaIndex] = null;
          continue;
        }
        const sourceId = sourceOfChain.get(chainId);
        const renderData = renderRegistry.get(sourceId);
        const compiled = await compileChainBlocks({ renderData, chainId, blockIds });
        nodesByArea[areaIndex] = compiled.map(({ Content }, i) =>
          React.createElement(Content, { key: `${areaIndex}-${i}` }),
        );
      }
      out[frameKey][chainId] = nodesByArea;
    }
  }
  return out;
}
