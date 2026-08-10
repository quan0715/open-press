import type { ResolvedConfig } from "./config.mjs";

export interface DeployTarget {
  kind: "workspace" | "press";
  pressSlug: string;
  source: string;
  projectName: string | null;
  commitDirty: boolean;
}

export function normalizeDeployPressSlug(value: unknown): string;
export function resolveDeployTarget(config: ResolvedConfig, press?: unknown): DeployTarget;
