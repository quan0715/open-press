export function isLocalWorkspaceHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isWorkspaceModeLocation(location: Pick<Location, "hostname" | "search">) {
  return isLocalWorkspaceHost(location.hostname) && new URLSearchParams(location.search).has("dev");
}

export function isPrintModeLocation(location: Pick<Location, "search">) {
  return new URLSearchParams(location.search).has("print");
}
