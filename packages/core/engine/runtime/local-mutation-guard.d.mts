import type { IncomingMessage, ServerResponse } from "node:http";

export function rejectUntrustedLocalMutationRequest(req: IncomingMessage, res: ServerResponse): boolean;
