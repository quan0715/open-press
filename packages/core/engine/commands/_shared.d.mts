export interface IsolatedDocumentExportResult {
  code: number;
  stdout: string;
  stderr: string;
}

export function runIsolatedDocumentExport(root: string): Promise<IsolatedDocumentExportResult>;
export function startVitePreview(
  root: string,
  host: string,
  port: string,
  opts?: { env?: NodeJS.ProcessEnv; startupTimeoutMs?: number },
): Promise<import("node:child_process").ChildProcess>;
export function waitForLocalHttpServer(
  host: string,
  port: string,
  opts?: { timeoutMs?: number; pollIntervalMs?: number },
): Promise<void>;
