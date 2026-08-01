import type { IncomingMessage, ServerResponse } from "node:http";

export interface WorkspaceSettingsEndpointOptions {
  root: string;
  writable?: boolean;
  publicOnly?: boolean;
}

export function handleWorkspaceSettingsRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: WorkspaceSettingsEndpointOptions,
): Promise<void>;
