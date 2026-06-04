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

// Metadata read from <Press> props by the engine pipeline. Each
// press/<slug>/press.tsx entry declares its document metadata here.
export interface PressMetadata {
  title?: string;
  type?: PressProps["type"];
  page?: PressProps["page"];
  slug?: string;
  theme?: string;
  componentsDir?: PressProps["componentsDir"];
  mediaDir?: PressProps["mediaDir"];
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
  // Metadata declared on <Press> props.
  metadata?: PressMetadata;
}

export const PressContext = createContext<PressContextValue | null>(null);

export function Press(props: PressProps) {
  // Press is intentionally inert at render time — the engine reads its
  // props and children through React.Children inspection during the
  // export pipeline, then injects context above any nested helpers.
  return <Fragment>{props.children}</Fragment>;
}

(Press as unknown as { openpressMarker: typeof PRESS_MARKER }).openpressMarker = PRESS_MARKER;
