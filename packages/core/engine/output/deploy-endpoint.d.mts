import type { IncomingMessage, ServerResponse } from "node:http";
import type { ResolvedConfig } from "../runtime/config.mjs";

export interface DeployEndpointOptions {
  config: ResolvedConfig;
  workspaceRoot: string;
  frameworkRoot: string;
  cliEntry: string;
}

export interface DeployEndpoints {
  handleStatusRequest(req: IncomingMessage, res: ServerResponse, url?: URL): Promise<void>;
  handleDeployRequest(req: IncomingMessage, res: ServerResponse): Promise<void>;
}

export function createDeployEndpoints(options: DeployEndpointOptions): DeployEndpoints;
