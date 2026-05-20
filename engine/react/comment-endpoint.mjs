import {
  clearQDocCommentMarkers,
  insertQDocCommentMarker,
  listQDocCommentMarkers,
} from "./comment-marker.mjs";

const MAX_COMMENT_BODY_BYTES = 64 * 1024;

export async function handleQDocCommentRequest(req, res, {
  root = ".",
  id = undefined,
  timestamp = undefined,
} = {}) {
  if (req.method === "GET") {
    try {
      writeJson(res, 200, { ok: true, comments: await listQDocCommentMarkers({ root }) });
    } catch (error) {
      writeJson(res, 400, {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const body = await readJsonBody(req);
      const result = await clearQDocCommentMarkers({
        root,
        id: body?.id,
        all: body?.all === true,
      });
      writeJson(res, 200, { ok: true, ...result });
    } catch (error) {
      writeJson(res, 400, {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (req.method !== "POST") {
    writeJson(res, 405, { ok: false, message: "QDoc comment endpoint requires GET, POST, or DELETE." });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const target = body?.target ?? {};
    const result = await insertQDocCommentMarker({
      root,
      path: target.path ?? body?.path,
      source: target.source ?? body?.source,
      note: body?.note,
      hint: body?.hint,
      id,
      timestamp,
    });

    writeJson(res, 200, {
      ok: true,
      comment: {
        id: result.id,
        timestamp: result.timestamp,
        path: result.path,
        line: result.line,
      },
    });
  } catch (error) {
    writeJson(res, 400, {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function readJsonBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += String(chunk);
    if (Buffer.byteLength(body, "utf8") > MAX_COMMENT_BODY_BYTES) {
      throw new Error("QDoc comment request body is too large.");
    }
  }
  try {
    return JSON.parse(body || "{}");
  } catch {
    throw new Error("QDoc comment request body must be valid JSON.");
  }
}

function writeJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(body, null, 2)}\n`);
}
