import { useContext, type ReactNode } from "react";
import { cn } from "./cn";
import { FrameContext } from "./FrameContext";
import type { MdxAreaProps } from "./types";
import { createMdxAreaObjectEntityId } from "../document-model/objectEntityModel";

export function MdxArea({
  chainId,
  overflow = "extend",
  className,
  ...rest
}: MdxAreaProps) {
  const frame = useContext(FrameContext);
  const consumed = frame?.consumeArea(chainId) ?? null;
  const blocks: ReactNode | null = consumed?.blocks ?? null;
  const objectId = frame && consumed
    ? createMdxAreaObjectEntityId(frame.frameKey, chainId, consumed.indexInFrame)
    : undefined;

  return (
    <div
      {...(rest as Record<string, unknown>)}
      className={cn("openpress-mdx-area", className)}
      data-openpress-mdx-area="true"
      data-openpress-mdx-area-chain={chainId}
      data-openpress-mdx-area-index={consumed?.indexInFrame}
      data-openpress-object-id={objectId}
      data-openpress-mdx-area-overflow={overflow}
      data-openpress-mdx-area-empty={blocks == null ? "true" : "false"}
    >
      {blocks}
    </div>
  );
}
