import { createContext, Fragment } from "react";
import type { WorkspaceProps } from "./types";

// Marker the engine uses to identify a Workspace default export, in the
// same way PRESS_MARKER identifies Press. Multi-doc projects nest one
// or more <Press> children inside <Workspace>; single-doc projects use
// a Workspace with one Press child (uniform shape — no exceptions).
export const WORKSPACE_MARKER: unique symbol = Symbol.for("@open-press/core:Workspace");

export interface WorkspaceContextValue {
  // Project-level label surfaced in the gallery header / tab bar / PDF
  // metadata. Undefined if the Workspace did not declare a name.
  name?: string;
  // Reserved; new work should prefer per-Press theme ownership.
  theme?: string;
  // Reserved; new work should prefer per-Press media ownership.
  media?: string;
  // Number of Press children registered in this Workspace. Set by the
  // engine during expansion; useful to detect "gallery vs single-doc"
  // routing without re-walking the tree.
  pressCount: number;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// Workspace is intentionally inert at render time. The engine inspects
// its props (name / theme / media) and iterates Press children during
// the export pipeline; rendering just passes children through so the
// Press → Frame → MdxArea tree underneath behaves identically to v0.x
// when there's only one Press child.
export function Workspace(props: WorkspaceProps) {
  return <Fragment>{props.children}</Fragment>;
}

(Workspace as unknown as { openpressMarker: typeof WORKSPACE_MARKER }).openpressMarker = WORKSPACE_MARKER;
