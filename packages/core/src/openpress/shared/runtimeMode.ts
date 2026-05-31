export function isLocalWorkspaceHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isWorkspaceModeLocation(location: Pick<Location, "hostname" | "pathname">) {
  if (!isLocalWorkspaceHost(location.hostname)) return false;
  const pathname = normalizePathname(location.pathname);
  if (pathname === "workspace") return true;
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 2 && segments[1] === "preview";
}

export function isPresentationModeLocation(location: Pick<Location, "hostname" | "pathname">) {
  if (!isLocalWorkspaceHost(location.hostname)) return false;
  const pathname = normalizePathname(location.pathname);
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 2 && segments[1] === "present";
}

export function isPrintModeLocation(location: Pick<Location, "search">) {
  return new URLSearchParams(location.search).has("print");
}

function normalizePathname(pathname: string) {
  return pathname.replace(/^\/+|\/+$/g, "");
}
