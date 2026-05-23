// Public surface for the build-time region allocator.
//
// The Press Tree pipeline measures MdxArea capacities and block heights in
// `engine/react/pipeline/frame-measurement.mjs` and runs allocation through
// these helpers. The region kernel is also usable on its own for custom
// pipelines or unit tests.

export { paginateMeasuredBlocks, allocateBlocksToRegions, pagesFromRegions } from "./pagination/allocator.mjs";
export { singleColumnRegionStream, multiColumnRegionStream, fixedRegionStream } from "./pagination/regions.mjs";
