const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const LOCAL_REQUEST_HEADER = "x-openpress-local-request";
const LOCAL_REQUEST_VALUE = "1";

export function rejectUntrustedLocalMutationRequest(req, res) {
  if (SAFE_METHODS.has(req.method ?? "GET")) return false;

  const marker = headerValue(req.headers?.[LOCAL_REQUEST_HEADER]);
  const origin = headerValue(req.headers?.origin);
  const host = headerValue(req.headers?.host);
  if (marker === LOCAL_REQUEST_VALUE && isSameOriginHttpRequest(origin, host)) return false;

  const body = JSON.stringify({
    ok: false,
    message: "OpenPress local mutation requests must originate from this workspace.",
  });
  res.writeHead(403, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
  return true;
}

function isSameOriginHttpRequest(origin, host) {
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.host === host;
  } catch {
    return false;
  }
}

function headerValue(value) {
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value : "";
}
