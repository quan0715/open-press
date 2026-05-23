import { useContext } from "react";
import { PressContext } from "./Press";
import type { ResolvedSource } from "./types";

// Read a resolved source by its registered key. The engine populates the
// PressContext before rendering, so this is synchronous and safe to call
// from any component inside <Press>.
//
// Throws if the source is missing, with a hint listing known sources.
export function useSource<T extends ResolvedSource = ResolvedSource>(id: string): T {
  const ctx = useContext(PressContext);
  if (!ctx) {
    throw new Error(
      `useSource("${id}") called outside <Press> tree. ` +
        `Source hooks only work inside the default-exported <Press> component.`,
    );
  }
  const source = ctx.sources[id];
  if (!source) {
    const known = Object.keys(ctx.sources).sort();
    const knownText = known.length > 0 ? known.join(", ") : "(none)";
    throw new Error(
      `Unknown source "${id}". Available sources: ${knownText}. ` +
        `Register it under \`export const sources\` in document/index.tsx.`,
    );
  }
  return source as T;
}
