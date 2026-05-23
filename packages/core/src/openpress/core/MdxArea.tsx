import { useContext, type ReactNode } from "react";
import { FrameContext } from "./FrameContext";
import type { MdxAreaProps } from "./types";

function classNames(...values: Array<string | undefined>) {
  const joined = values.filter(Boolean).join(" ");
  return joined.length > 0 ? joined : undefined;
}

export function MdxArea({
  chainId,
  overflow = "extend",
  className,
  ...rest
}: MdxAreaProps) {
  const frame = useContext(FrameContext);

  let blocks: ReactNode | null = null;
  if (frame) {
    blocks = frame.consumeArea(chainId);
  }

  return (
    <div
      {...(rest as Record<string, unknown>)}
      className={classNames("openpress-mdx-area", className)}
      data-openpress-mdx-area="true"
      data-openpress-mdx-area-chain={chainId}
      data-openpress-mdx-area-overflow={overflow}
      data-openpress-mdx-area-empty={blocks == null ? "true" : undefined}
    >
      {blocks}
    </div>
  );
}
