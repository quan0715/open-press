import type { IncomingMessage, ServerResponse } from "node:http";

export function handleProjectAssetRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options?: {
    root?: string;
    timestamp?: string;
  },
): Promise<void>;
