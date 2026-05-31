import { createContext, Fragment } from "react";
import type { FrameAllocation, PressProps, ResolvedSource, TocEntry } from "./types";

// Marker the engine uses to distinguish a Press default export from any other
// React component. Workspaces register a default export whose `type` is this
// `Press` component; the engine identity-checks against it.
export const PRESS_MARKER: unique symbol = Symbol.for("@open-press/core:Press");

// Allocation hints feed Layer 4 results back to Layer 2 so helpers like
// <Sections> can emit the correct number of pages per chain. Null during
// the first pass; populated after the allocator has decided how many
// frames each chain needs.
export interface AllocationHints {
  totalPagesPerChain: Record<string, number>;
}

// Metadata read from <Press> props by the engine pipeline. The 1.0 contract
// declares these on the component; v0.x reads them from openpress.config.mjs
// instead and leaves these as undefined. The engine merges both sources
// (props override config) until v1.0 removes config support.
export interface PressMetadata {
  title?: string;
  type?: PressProps["type"];
  page?: PressProps["page"];
  slug?: string;
  theme?: string;
  componentsDir?: string;
}

export interface PressContextValue {
  sources: Record<string, ResolvedSource>;
  // Allocation map keyed by frameKey -> chainId -> areaIndex -> blocks.
  // null during measurement passes; populated during final render.
  allocation: FrameAllocation | null;
  // Allocation hints fed back from Layer 4 to Layer 2 helpers. null on
  // the first measurement pass.
  hints: AllocationHints | null;
  toc: Record<string, TocEntry[]> | null;
  // Metadata declared on <Press> props in v1.0. Engine providers may
  // omit this on v0.x; consumers should treat undefined as "no metadata
  // declared on Press — fall back to openpress.config.mjs values".
  metadata?: PressMetadata;
}

export const PressContext = createContext<PressContextValue | null>(null);

export function Press(props: PressProps) {
  // Press is intentionally inert at render time — the engine reads its
  // props and children through React.Children inspection during the
  // export pipeline, then injects context above any nested helpers.
  // For the v0.x shape (children-only usage), this still passes children
  // through unchanged.
  return <Fragment>{props.children}</Fragment>;
}

(Press as unknown as { openpressMarker: typeof PRESS_MARKER }).openpressMarker = PRESS_MARKER;
