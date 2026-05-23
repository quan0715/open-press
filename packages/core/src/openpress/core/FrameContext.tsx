import { createContext, type ReactNode } from "react";

// FrameContext is the runtime channel between Frame and its descendant
// MdxArea instances. Frame creates one of these on each render; MdxArea
// reads it to claim its slot of allocated content.
//
// "Claiming" is order-sensitive: the first <MdxArea chainId="X"> rendered
// inside a Frame takes areaIndex 0 for chain X, the next takes index 1,
// and so on. Empty Frames (no allocation) return null, which renders the
// MdxArea as a measurement placeholder.

export interface FrameContextValue {
  frameKey: string;
  // Consume the next allocation slot for this chainId. Returns null if the
  // frame has no allocation (measurement pass) or no blocks for this chain.
  consumeArea(chainId: string): ReactNode | null;
}

export const FrameContext = createContext<FrameContextValue | null>(null);
