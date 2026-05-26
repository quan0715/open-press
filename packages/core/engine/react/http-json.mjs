const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

export async function readJsonBody(req, {
  maxBytes = DEFAULT_MAX_BODY_BYTES,
  bodyLabel = "Request",
} = {}) {
  let body = "";
  for await (const chunk of req) {
    body += String(chunk);
    if (Buffer.byteLength(body, "utf8") > maxBytes) {
      throw new Error(`${bodyLabel} body is too large.`);
    }
  }
  try {
    return JSON.parse(body || "{}");
  } catch {
    throw new Error(`${bodyLabel} body must be valid JSON.`);
  }
}

export function writeJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(body, null, 2)}\n`);
}
