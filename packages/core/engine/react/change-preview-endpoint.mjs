import { readChangePreview, updateChangeProposalFeedback } from "./change-preview.mjs";
import { renderChangePreview } from "./change-preview-render.mjs";
import { readJsonBody, writeJson } from "./http-json.mjs";

export async function handleChangePreviewRequest(req, res, { root = "." } = {}) {
  if (req.method === "PATCH") {
    try {
      const body = await readJsonBody(req, { bodyLabel: "OpenPress change feedback request" });
      const result = await updateChangeProposalFeedback({
        root,
        index: body?.index,
        path: body?.path,
        before: body?.before,
        after: body?.after,
        decision: body?.feedback?.decision,
        comment: body?.feedback?.comment,
      });
      writeJson(res, 200, { ok: true, proposal: result });
    } catch (error) {
      writeErrorJson(res, error);
    }
    return;
  }

  if (req.method !== "GET") {
    writeJson(res, 405, { ok: false, message: "OpenPress change preview endpoint requires GET or PATCH." });
    return;
  }

  try {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");
    const pressSlug = requestUrl.searchParams.get("press")?.trim();
    const preview = pressSlug
      ? await renderChangePreview({ root, pressSlug })
      : await readChangePreview({ root });
    writeJson(res, 200, { ok: true, preview });
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
