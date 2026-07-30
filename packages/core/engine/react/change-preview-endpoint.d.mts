import type { IncomingMessage, ServerResponse } from "node:http";

export function handleChangePreviewRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options?: { root?: string },
): Promise<void>;
