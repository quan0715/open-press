import {
  clearCommentMarkers,
  insertCommentMarker,
  listCommentMarkers,
  updateCommentMarker,
} from "./comment-marker.mjs";
import { readJsonBody, writeJson } from "./http-json.mjs";

export async function handleCommentRequest(req, res, {
  root = ".",
  id = undefined,
  timestamp = undefined,
} = {}) {
  if (req.method === "GET") {
    try {
      writeJson(res, 200, { ok: true, comments: await listCommentMarkers({ root }) });
    } catch (error) {
      writeErrorJson(res, error);
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const body = await readJsonBody(req, { bodyLabel: "OpenPress comment request" });
      const result = await clearCommentMarkers({
        root,
        id: body?.id,
        all: body?.all === true,
      });
      writeJson(res, 200, { ok: true, ...result });
    } catch (error) {
      writeErrorJson(res, error);
    }
    return;
  }

  if (req.method === "PATCH") {
    try {
      const body = await readJsonBody(req, { bodyLabel: "OpenPress comment request" });
      const result = await updateCommentMarker({
        root,
        id: body?.id,
        note: body?.note,
        hint: body?.hint,
        timestamp,
      });
      writeJson(res, 200, {
        ok: true,
        comment: {
          id: result.id,
          timestamp: result.timestamp,
          path: result.path,
          line: result.line,
          note: result.note,
          hint: result.hint,
        },
      });
    } catch (error) {
      writeErrorJson(res, error);
    }
    return;
  }

  if (req.method !== "POST") {
    writeJson(res, 405, { ok: false, message: "OpenPress comment endpoint requires GET, POST, PATCH, or DELETE." });
    return;
  }

  try {
    const body = await readJsonBody(req, { bodyLabel: "OpenPress comment request" });
    const target = body?.target ?? {};
    const result = await insertCommentMarker({
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
    writeErrorJson(res, error);
  }
}

function writeErrorJson(res, error) {
  writeJson(res, 400, {
    ok: false,
    message: error instanceof Error ? error.message : String(error),
  });
}
