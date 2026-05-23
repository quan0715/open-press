import { createContext, Fragment, type ReactNode } from "react";
import type { FrameAllocation, ResolvedSource, TocEntry } from "./types";

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

export interface PressContextValue {
  sources: Record<string, ResolvedSource>;
  // Allocation map keyed by frameKey -> chainId -> areaIndex -> blocks.
  // null during measurement passes; populated during final render.
  allocation: FrameAllocation | null;
  // Allocation hints fed back from Layer 4 to Layer 2 helpers. null on
  // the first measurement pass.
  hints: AllocationHints | null;
  toc: Record<string, TocEntry[]> | null;
}

export const PressContext = createContext<PressContextValue | null>(null);

export function Press({ children }: { children: ReactNode }) {
  return <Fragment>{children}</Fragment>;
}

(Press as unknown as { openpressMarker: typeof PRESS_MARKER }).openpressMarker = PRESS_MARKER;
