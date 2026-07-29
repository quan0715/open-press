import type { OpenPressRuntimeMode } from "./OpenPressRuntime";

export type WorkspaceDestination =
  | { kind: "documents" }
  | { kind: "settings" }
  | { kind: "press"; slug: string; mode: OpenPressRuntimeMode };

export function parseWorkspaceDestination(pathname: string): WorkspaceDestination {
  const normalized = normalizeWorkspaceSlug(pathname);
  if (!normalized || normalized === "workspace") return { kind: "documents" };
  if (normalized === "workspace/settings") return { kind: "settings" };

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 2 && (segments[1] === "preview" || segments[1] === "present")) {
    return {
      kind: "press",
      slug: segments[0] ?? "",
      mode: segments[1],
    };
  }

  return { kind: "documents" };
}

export function buildWorkspaceDestination(destination: WorkspaceDestination): string {
  if (destination.kind === "documents") return "/workspace";
  if (destination.kind === "settings") return "/workspace/settings";
  return `/${normalizeWorkspaceSlug(destination.slug)}/${destination.mode}`;
}

export function normalizeWorkspaceSlug(raw: string): string {
  return raw.replace(/^\/+|\/+$/g, "");
}
