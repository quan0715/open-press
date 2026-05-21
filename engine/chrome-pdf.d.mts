import type { ChildProcess } from "node:child_process";

export interface ChromeDevToolsClient {
  send(method: string, params?: Record<string, unknown>): Promise<any>;
  close(): void;
}

export interface PrintUrlToPdfOptions {
  root: string;
  url: string;
  outPath: string;
  chrome?: string;
  waitForReady?: (client: ChromeDevToolsClient) => Promise<unknown>;
  printOptions?: Record<string, unknown>;
  debuggingPortBase?: number;
  debuggingPortRange?: number;
  profilePrefix?: string;
}

export interface EvaluateUrlWithChromeOptions {
  root: string;
  url: string;
  chrome?: string;
  evaluate: (client: ChromeDevToolsClient) => Promise<unknown>;
  debuggingPortBase?: number;
  debuggingPortRange?: number;
  profilePrefix?: string;
}

export function printUrlToPdf(options: PrintUrlToPdfOptions): Promise<unknown>;
export function evaluateUrlWithChrome(options: EvaluateUrlWithChromeOptions): Promise<unknown>;
export function waitForPrintReady(client: ChromeDevToolsClient): Promise<number>;
export function stopChildProcess(child: ChildProcess): Promise<void>;
