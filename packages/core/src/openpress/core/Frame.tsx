import { useContext } from "react";
import { cn } from "./cn";
import { FrameContext, type FrameContextValue } from "./FrameContext";
import { PressContext } from "./Press";
import type { FrameProps } from "./types";
import { createFrameObjectEntityId } from "../document-model/objectEntityModel";

// Substring reserved for the overflow extension pipeline.
const RESERVED_EXTENDED = ":extended:";

export const FRAME_MARKER: unique symbol = Symbol.for("@open-press/core:Frame");

export function Frame({
  frameKey,
  role,
  chrome = true,
  className,
  children,
  ...rest
}: FrameProps) {
  if (!frameKey || !String(frameKey).trim()) {
    throw new Error("Frame requires a non-empty frameKey.");
  }
  if (frameKey && frameKey.includes(RESERVED_EXTENDED)) {
    throw new Error(
      `Frame frameKey="${frameKey}" contains reserved substring ":extended:". ` +
        `This pattern is reserved for the overflow-extension pipeline.`,
    );
  }

  const press = useContext(PressContext);
  const allocation = press?.allocation ?? null;
  const frameAllocation = frameKey && allocation ? allocation[frameKey] : undefined;

  // Mutable per-render counter. SSR renders a Frame exactly once, so a plain
  // object is fine — no useRef needed.
  const areaCounts: Record<string, number> = {};
  const frameContextValue: FrameContextValue = {
    frameKey: frameKey ?? "",
    consumeArea(chainId: string) {
      const index = areaCounts[chainId] ?? 0;
      areaCounts[chainId] = index + 1;
      if (!frameAllocation) return { indexInFrame: index, blocks: null };
      const chainSlots = frameAllocation[chainId];
      if (!chainSlots) return { indexInFrame: index, blocks: null };
      return { indexInFrame: index, blocks: chainSlots[index] ?? null };
    },
  };

  const pageKind = derivePageKind(role);

  return (
    <FrameContext.Provider value={frameContextValue}>
      <section
        {...(rest as Record<string, unknown>)}
        className={cn("reader-page", className)}
        data-openpress-frame-key={frameKey}
        data-openpress-object-id={createFrameObjectEntityId(frameKey)}
        data-frame-role={role}
        data-page-kind={pageKind}
        data-frame-chrome={chrome ? "true" : "false"}
        data-page-footer={chrome ? "true" : "false"}
      >
        {children}
      </section>
    </FrameContext.Provider>
  );
}

(Frame as unknown as { openpressMarker: typeof FRAME_MARKER }).openpressMarker = FRAME_MARKER;

function derivePageKind(role: string | undefined): string | undefined {
  if (!role) return undefined;
  const trimmed = role.trim();
  if (!trimmed) return undefined;
  const lastDot = trimmed.lastIndexOf(".");
  return lastDot === -1 ? trimmed : trimmed.slice(lastDot + 1);
}
