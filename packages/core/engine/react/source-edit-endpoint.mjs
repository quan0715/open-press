import { loadConfig } from "../runtime/config.mjs";
import { applySlideAdd, applySlideRemove, applySlideSkip } from "../commands/slide.mjs";
import { applySourceBlockTextEdit, readSourceBlockText } from "../runtime/source-text-tools.mjs";
import { applySlideReorder } from "./slide-reorder.mjs";
import { exportReactDocument } from "./document-export.mjs";
import { readJsonBody, writeJson } from "./http-json.mjs";

export async function handleSourceEditRequest(req, res, {
  root = ".",
  refreshDocument = true,
} = {}) {
  if (req.method === "GET") {
    try {
      const requestUrl = new URL(req.url ?? "/", "http://localhost");
      const config = await loadConfig(root);
      const sourceText = await readSourceBlockText({
        config,
        path: requestUrl.searchParams.get("path"),
        source: {
          line: Number(requestUrl.searchParams.get("line")),
          column: Number(requestUrl.searchParams.get("column") || 1),
          endLine: Number(requestUrl.searchParams.get("endLine") || requestUrl.searchParams.get("line")),
          endColumn: Number(requestUrl.searchParams.get("endColumn") || requestUrl.searchParams.get("column") || 1),
        },
      });
      writeJson(res, 200, { ok: true, source: sourceText });
    } catch (error) {
      writeJson(res, 400, {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (req.method !== "POST") {
    writeJson(res, 405, { ok: false, message: "OpenPress source edit endpoint requires GET or POST." });
    return;
  }

  try {
    const body = await readJsonBody(req, {
      bodyLabel: "OpenPress source edit request",
      maxBytes: 256 * 1024,
    });

    const bodyType = body?.type ?? "text-edit";

    if (bodyType === "object-locator-edit") {
      throw new Error("object-locator-edit requires the current ObjectLocatorMap; persistent data-op-id edits are not supported yet");
    }

    if (bodyType === "slide-reorder") {
      await applySlideReorder({ root, slug: body?.slug, order: body?.order });
      const exported = refreshDocument && body?.refreshDocument !== false
        ? await exportReactDocument(root, { syncAssets: false })
        : null;
      writeJson(res, 200, {
        ok: true,
        document: exported
          ? { path: exported.documentPath, pageCount: exported.pageCount }
          : undefined,
      });
      return;
    }

    if (bodyType === "slide-add") {
      const config = await loadConfig(root);
      const slide = await applySlideAdd({ config, slug: body?.slug, id: body?.id });
      const exported = refreshDocument && body?.refreshDocument !== false
        ? await exportReactDocument(root, { syncAssets: false })
        : null;
      writeJson(res, 200, {
        ok: true,
        slide,
        document: exported
          ? { path: exported.documentPath, pageCount: exported.pageCount }
          : undefined,
      });
      return;
    }

    if (bodyType === "slide-remove") {
      const config = await loadConfig(root);
      const slide = await applySlideRemove({ config, slug: body?.slug, id: body?.id });
      const exported = refreshDocument && body?.refreshDocument !== false
        ? await exportReactDocument(root, { syncAssets: false })
        : null;
      writeJson(res, 200, {
        ok: true,
        slide,
        document: exported
          ? { path: exported.documentPath, pageCount: exported.pageCount }
          : undefined,
      });
      return;
    }

    if (bodyType === "slide-skip" || bodyType === "slide-unskip") {
      const config = await loadConfig(root);
      const slide = await applySlideSkip({
        config,
        slug: body?.slug,
        id: body?.id,
        skip: bodyType === "slide-skip",
      });
      const exported = refreshDocument && body?.refreshDocument !== false
        ? await exportReactDocument(root, { syncAssets: false })
        : null;
      writeJson(res, 200, {
        ok: true,
        slide,
        document: exported
          ? { path: exported.documentPath, pageCount: exported.pageCount }
          : undefined,
      });
      return;
    }

    if (bodyType === "slide-unskip-many") {
      const config = await loadConfig(root);
      const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => typeof id === "string") : [];
      const slides = [];
      for (const id of ids) {
        slides.push(await applySlideSkip({ config, slug: body?.slug, id, skip: false }));
      }
      const exported = refreshDocument && body?.refreshDocument !== false
        ? await exportReactDocument(root, { syncAssets: false })
        : null;
      writeJson(res, 200, {
        ok: true,
        slides,
        document: exported
          ? { path: exported.documentPath, pageCount: exported.pageCount }
          : undefined,
      });
      return;
    }

    // Default: text-edit (existing logic)
    const config = await loadConfig(root);
    const edit = await applySourceBlockTextEdit({
      config,
      path: body?.path,
      source: body?.source,
      text: body?.text,
      kind: body?.kind,
      name: body?.name,
      blockId: body?.blockId,
      sourceMode: body?.sourceMode === true,
    });
    const exported = refreshDocument && body?.refreshDocument !== false
      ? await exportReactDocument(root, { syncAssets: false })
      : null;

    writeJson(res, 200, {
      ok: true,
      edit,
      document: exported
        ? {
          path: exported.documentPath,
          pageCount: exported.pageCount,
        }
        : undefined,
    });
  } catch (error) {
    writeJson(res, 400, {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
