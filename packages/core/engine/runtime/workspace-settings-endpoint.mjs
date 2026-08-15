import {
  loadWorkspaceSettings,
  publicWorkspaceSettings,
  updateWorkspaceAppearance,
  writeWorkspaceSettings,
} from "./workspace-settings.mjs";
import { inspectWorkspaceUpdates } from "./workspace-updates.mjs";

const MAX_SETTINGS_BODY_BYTES = 64 * 1024;

export async function handleWorkspaceSettingsRequest(
  req,
  res,
  { root, writable = false, publicOnly = false },
) {
  const method = req.method ?? "GET";

  if (method === "GET" || method === "HEAD") {
    try {
      if (publicOnly) {
        const loaded = await loadWorkspaceSettings(root);
        writeJson(res, 200, publicWorkspaceSettings(loaded.settings), method === "HEAD");
        return;
      }
      const [loaded, updates] = await Promise.all([
        loadWorkspaceSettings(root),
        inspectWorkspaceUpdates(root).catch(() => null),
      ]);
      const body = {
        ok: true,
        settings: loaded.settings,
        source: loaded.source,
        writable,
        ...(updates ? { updates } : {}),
      };
      writeJson(res, 200, body, method === "HEAD");
    } catch (error) {
      writeJson(res, 500, {
        ok: false,
        message: errorMessage(error),
      }, method === "HEAD");
    }
    return;
  }

  if (method !== "PUT") {
    writeJson(res, 405, {
      ok: false,
      message: "Workspace settings endpoint requires GET or PUT.",
    });
    return;
  }

  if (!writable || publicOnly) {
    writeJson(res, 403, {
      ok: false,
      message: "Workspace settings are read-only in this environment.",
    });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const settings = isAppearancePatch(body)
      ? await updateWorkspaceAppearance(root, body.appearance)
      : await writeWorkspaceSettings(root, body?.settings ?? body);
    writeJson(res, 200, {
      ok: true,
      settings,
      source: "settings",
      writable: true,
    });
  } catch (error) {
    writeJson(res, 400, {
      ok: false,
      message: errorMessage(error),
    });
  }
}

function isAppearancePatch(body) {
  return body !== null
    && typeof body === "object"
    && !Array.isArray(body)
    && Object.keys(body).length === 1
    && Object.hasOwn(body, "appearance");
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_SETTINGS_BODY_BYTES) {
      throw new Error("Workspace settings request is too large.");
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) throw new Error("Workspace settings request body is required.");
  const source = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Workspace settings request must contain valid JSON: ${error.message}`);
  }
}

function writeJson(res, status, body, headOnly = false) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(headOnly ? "" : `${JSON.stringify(body, null, 2)}\n`);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
