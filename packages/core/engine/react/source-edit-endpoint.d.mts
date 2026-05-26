import type { IncomingMessage, ServerResponse } from "node:http";

export function handleSourceEditRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options?: {
    root?: string;
    refreshDocument?: boolean;
  },
): Promise<void>;
