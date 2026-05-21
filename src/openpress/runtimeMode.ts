export function isLocalWorkspaceHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isWorkspaceModeLocation(location: Pick<Location, "hostname" | "search">) {
  return isLocalWorkspaceHost(location.hostname) && new URLSearchParams(location.search).has("dev");
}

export function isPrintModeLocation(location: Pick<Location, "search">) {
  return new URLSearchParams(location.search).has("print");
}

export function buildPublicPreviewHref(currentHref: string, pageIndex?: number) {
  const url = new URL(currentHref);
  url.searchParams.delete("dev");
  url.searchParams.delete("workspace");
  url.searchParams.delete("fontPreview");
  if (typeof pageIndex === "number") {
    url.hash = `page-${String(pageIndex + 1).padStart(2, "0")}`;
  }
  return url.toString();
}
