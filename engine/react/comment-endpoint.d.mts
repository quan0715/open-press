import type { IncomingMessage, ServerResponse } from "node:http";

export function handleQDocCommentRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options?: {
    root?: string;
    id?: string;
    timestamp?: string;
  },
): Promise<void>;
