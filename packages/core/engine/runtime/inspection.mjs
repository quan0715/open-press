import fs from "node:fs/promises";
import path from "node:path";
import { evaluateUrlWithChrome, stopChildProcess } from "../output/chrome-pdf.mjs";
import { buildReactStatic, startStaticServer } from "../commands/_shared.mjs";
import { walkFiles } from "./file-walk.mjs";
import { createIssue, createIssueReport } from "./issue-report.mjs";
import { collectActiveContentFiles, resolveActiveSourceWorkspace } from "./source-workspace.mjs";
import { collectSourceTextFiles } from "./source-text-tools.mjs";

const MEDIA_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const SOURCE_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".ts", ".tsx"]);

export async function inspectWorkspace({ root, config, options = {}, recurse = null }) {
  const checked = [];
  const issues = [];

  const sourceScan = await collectInspectionSources(config);
  checked.push(sourceScan.checkedName);
  sourceScan.contentFiles.forEach((file) => {
    if (!file.text.trim()) {
      issues.push(createIssue({
        level: "warning",
        code: "react-source.empty-file",
        message: `${sourceScan.contentLabel} \`${file.relativePath}\` is empty.`,
        path: file.absolutePath,
      }));
    }
  });

  checked.push("media");
  const mediaFiles = await readMediaFiles(await collectInspectionMediaRoots(sourceScan.config));
  const sourceText = sourceScan.sourceFiles.map((file) => file.text).join("\n");
  const unusedMedia = mediaFiles.filter((file) => !sourceText.includes(file.name) && !sourceText.includes(file.relativePath));
  unusedMedia.forEach((file) => {
    issues.push(createIssue({
      level: "warning",
      code: "media.unused",
      message: `Media asset \`${file.relativePath}\` is not referenced by document sources.`,
      path: file.absolutePath,
      detail: {
        file: file.name,
        relativePath: file.relativePath,
      },
    }));
  });

  checked.push("components");
  const componentUsage = sourceScan.componentUsage;

  const summary = {
    ...sourceScan.summary,
    mediaFiles: mediaFiles.length,
    unusedMedia: unusedMedia.length,
    componentUsage,
  };

  checked.push("overflow");
  const renderCode = await buildReactStatic({
    root,
    noBuild: options.noBuild,
    recurse,
    silent: options.json,
  });
  if (renderCode !== 0) {
    issues.push(createIssue({
      level: "error",
      code: "inspect.render",
      message: `React render failed before overflow inspection (exit code ${renderCode}).`,
      path: config.configPath,
    }));
    return createIssueReport({
      kind: "inspection",
      checked,
      issues,
      summary,
      okMessage: "OpenPress inspection OK",
    });
  }

  const overflowMeasurements = await inspectRenderedOverflow({
    root,
    config,
    host: options.host ?? "127.0.0.1",
    port: options.port ?? "5186",
  });
  issues.push(...overflowIssuesFromMeasurements(overflowMeasurements));
  summary.pages = overflowMeasurements.length;
  summary.overflowPages = overflowMeasurements.filter((page) => (page.overflows ?? []).length > 0).length;

  return createIssueReport({
    kind: "inspection",
    checked,
    issues,
    summary,
    okMessage: "OpenPress inspection OK",
  });
}

export async function collectInspectionSources(config) {
  const sourceWorkspace = await resolveActiveSourceWorkspace(config);
  const sourceConfig = sourceWorkspace.config;
  const contentFiles = await collectActiveContentFiles(sourceWorkspace);
  const sourceFiles = await collectSourceTextFiles(sourceConfig, { scope: "all" });
  const componentUsage = summarizeComponentUsage(contentFiles);

  return {
    sourceKind: sourceWorkspace.kind,
    checkedName: sourceWorkspace.checkedName,
    contentLabel: sourceWorkspace.contentLabel,
    config: sourceConfig,
    contentFiles,
    sourceFiles,
    componentUsage,
    summary: {
      sourceKind: sourceWorkspace.kind,
      sourceFiles: contentFiles.length,
      mdxFiles: contentFiles.length,
    },
  };
}

export async function inspectRenderedOverflow({ root, config, host = "127.0.0.1", port = "5186" }) {
  const server = await startStaticServer(root, config, host, port);
  try {
    return await evaluateUrlWithChrome({
      root,
      url: `http://${host}:${port}/?print=1`,
      debuggingPortBase: 9900,
      debuggingPortRange: 600,
      profilePrefix: "chrome-inspect",
      emulatedMedia: "print",
      evaluate: waitForInspectionReady,
    });
  } finally {
    await stopChildProcess(server);
  }
}

export const INSPECTION_READY_DEFAULTS = Object.freeze({
  totalTimeoutMs: 300_000,
  idleTimeoutMs: 30_000,
  pollIntervalMs: 100,
});

export function resolveInspectionReadyTiming(env = process.env) {
  const total = Number(env.OPENPRESS_INSPECTION_TIMEOUT_MS);
  const idle = Number(env.OPENPRESS_INSPECTION_IDLE_MS);
  return {
    totalTimeoutMs: Number.isFinite(total) && total > 0 ? total : INSPECTION_READY_DEFAULTS.totalTimeoutMs,
    idleTimeoutMs: Number.isFinite(idle) && idle > 0 ? idle : INSPECTION_READY_DEFAULTS.idleTimeoutMs,
    pollIntervalMs: INSPECTION_READY_DEFAULTS.pollIntervalMs,
  };
}

function formatInspectionTimeoutMessage(reason, snapshot, timing, elapsedMs) {
  const seconds = Math.round(elapsedMs / 1000);
  const observed = `(observed ${snapshot.pageCount} page(s))`;
  if (reason === "idle") {
    return (
      `Timed out waiting for OpenPress pagination before inspection. ` +
      `No progress for ${seconds}s ${observed}. ` +
      `Raise OPENPRESS_INSPECTION_IDLE_MS (currently ${timing.idleTimeoutMs}ms) to extend the idle window.`
    );
  }
  return (
    `Timed out waiting for OpenPress pagination before inspection. ` +
    `Total ${seconds}s exceeded ${observed}. ` +
    `Raise OPENPRESS_INSPECTION_TIMEOUT_MS (currently ${timing.totalTimeoutMs}ms) to extend the hard cap.`
  );
}

export async function waitForInspectionReady(client, timing = resolveInspectionReadyTiming()) {
  const startedAt = Date.now();
  let lastSignature = "";
  let lastProgressAt = startedAt;
  let lastSnapshot = { pageCount: 0 };

  while (true) {
    const totalElapsed = Date.now() - startedAt;
    if (totalElapsed > timing.totalTimeoutMs) {
      throw new Error(formatInspectionTimeoutMessage("total", lastSnapshot, timing, totalElapsed));
    }

    const result = await client.send("Runtime.evaluate", {
      returnByValue: true,
      awaitPromise: true,
      expression: inspectionExpression(),
    });
    const value = result.result?.value;
    if (Array.isArray(value)) return value;

    const pageCount = Number.isFinite(Number(value?.pageCount)) ? Number(value.pageCount) : lastSnapshot.pageCount;
    lastSnapshot = { pageCount };

    const signature = String(pageCount);
    if (signature !== lastSignature) {
      lastSignature = signature;
      lastProgressAt = Date.now();
    }

    const idleElapsed = Date.now() - lastProgressAt;
    if (idleElapsed > timing.idleTimeoutMs) {
      throw new Error(formatInspectionTimeoutMessage("idle", lastSnapshot, timing, idleElapsed));
    }

    await delay(timing.pollIntervalMs);
  }
}

export function overflowIssuesFromMeasurements(measurements) {
  return measurements.flatMap((page) => {
    const pageLabel = String(page.pageNumber).padStart(2, "0");
    return (page.overflows ?? []).map((overflow) => createIssue({
      level: "warning",
      code: `overflow.${overflow.code}`,
      message: `Page ${pageLabel} exceeds ${humanOverflowTarget(overflow.code)} by ${Math.ceil(overflow.overflowPx)}px.`,
      path: page.source?.path,
      detail: {
        pageNumber: page.pageNumber,
        title: page.title,
        sourceFile: page.source?.file,
        selector: overflow.selector,
        tagName: overflow.tagName,
        text: overflow.text,
        overflowPx: Math.ceil(overflow.overflowPx),
      },
    }));
  });
}

async function readSourceFiles(directory, extension = null) {
  const files = [];
  await walkFiles(directory, async (absolutePath) => {
    if (extension && path.extname(absolutePath) !== extension) return;
    if (!SOURCE_EXTENSIONS.has(path.extname(absolutePath))) return;
    files.push({
      absolutePath,
      relativePath: path.relative(directory, absolutePath).replaceAll("\\", "/"),
      text: await fs.readFile(absolutePath, "utf8"),
    });
  });
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return files;
}

async function readSingleFile(absolutePath) {
  try {
    const text = await fs.readFile(absolutePath, "utf8");
    return [{
      absolutePath,
      relativePath: path.basename(absolutePath),
      text,
    }];
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function readMediaFiles(directories) {
  const files = [];
  for (const directory of directories) {
    await walkFiles(directory, async (absolutePath) => {
      if (!MEDIA_EXTENSIONS.has(path.extname(absolutePath).toLowerCase())) return;
      files.push({
        absolutePath,
        name: path.basename(absolutePath),
        relativePath: path.relative(directory, absolutePath).replaceAll("\\", "/"),
      });
    });
  }
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return files;
}

async function collectInspectionMediaRoots(config) {
  const roots = [config.paths.mediaDir];
  try {
    const entries = await fs.readdir(config.paths.documentRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "shared") continue;
      roots.push(path.join(config.paths.documentRoot, entry.name, "media"));
    }
  } catch {
    // Missing press/ is reported by validation/export.
  }
  return uniquePaths(roots);
}

function uniquePaths(paths) {
  const out = [];
  const seen = new Set();
  for (const candidate of paths) {
    const normalized = path.resolve(candidate);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function summarizeComponentUsage(contentFiles) {
  const usages = new Map();
  for (const file of contentFiles) {
    for (const match of file.text.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)) {
      const name = match[1];
      const current = usages.get(name) ?? { name, count: 0, files: [] };
      current.count += 1;
      if (!current.files.includes(file.relativePath)) current.files.push(file.relativePath);
      usages.set(name, current);
    }
  }
  return Array.from(usages.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function humanOverflowTarget(code) {
  if (code === "page-body") return "page body";
  if (code === "page-frame") return "page frame";
  return code.replaceAll("-", " ");
}

function inspectionExpression() {
  return `Promise.resolve().then(async () => {
    const root = document.querySelector('[data-openpress-print-document="true"]');
    if (!root) return { pending: true, pageCount: 0 };
    const candidates = root.querySelectorAll('.openpress-html-page');
    if (candidates.length === 0) return { pending: true, pageCount: 0 };

    await document.fonts?.ready;
    await Promise.all(Array.from(document.images).map(async (img) => {
      if (!img.complete) {
        await new Promise((resolve) => {
          const settle = () => {
            img.removeEventListener('load', settle);
            img.removeEventListener('error', settle);
            resolve();
          };
          img.addEventListener('load', settle, { once: true });
          img.addEventListener('error', settle, { once: true });
        });
      }
      await img.decode?.().catch(() => undefined);
    }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const textFor = (element) => (element?.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 120);
    const overflowAmount = (outer, inner) => {
      if (!outer || !inner) return 0;
      const outerRect = outer.getBoundingClientRect();
      const innerRect = inner.getBoundingClientRect();
      return Math.max(0, innerRect.bottom - outerRect.bottom, innerRect.right - outerRect.right);
    };
    const contentBottomOverflow = (body) => {
      if (!body) return 0;
      const bodyRect = body.getBoundingClientRect();
      const contentBottom = Array.from(body.children).reduce((bottom, child) => {
        if (getComputedStyle(child).display === 'none') return bottom;
        const marginBottom = Number.parseFloat(getComputedStyle(child).marginBottom) || 0;
        return Math.max(bottom, child.getBoundingClientRect().bottom + marginBottom);
      }, bodyRect.top);
      return Math.max(0, contentBottom - bodyRect.bottom);
    };
    const addElementOverflow = (overflows, code, selector, container, element) => {
      const px = overflowAmount(container, element);
      if (px <= 1) return;
      overflows.push({
        code,
        selector,
        overflowPx: Math.ceil(px),
        tagName: element.tagName,
        text: textFor(element),
      });
    };

    const wrappers = Array.from(document.querySelectorAll('.openpress-public-page > .openpress-html-page'));
    if (wrappers.length === 0) return { pending: true, pageCount: candidates.length };
    return wrappers.map((wrapper, index) => {
      const page = wrapper.querySelector('.reader-page') || wrapper;
      const frame = page.querySelector('.page-frame') || page;
      const body = page.querySelector('.page-body') || frame;
      const sourcePath = wrapper.getAttribute('data-source-path') || undefined;
      const sourceFile = wrapper.getAttribute('data-source-file') || sourcePath?.split('/').pop();
      const overflows = [];
      const bodyOverflow = contentBottomOverflow(body);
      if (bodyOverflow > 1) {
        overflows.push({
          code: 'page-body',
          selector: '.page-body',
          overflowPx: Math.ceil(bodyOverflow),
          tagName: body.tagName,
          text: textFor(body),
        });
      }
      addElementOverflow(overflows, 'page-frame', '.page-frame', page, frame);
      body.querySelectorAll('table, img, pre, figure, [data-openpress-component]').forEach((element) => {
        const tag = element.tagName.toLowerCase();
        addElementOverflow(overflows, tag, tag, body, element);
      });
      return {
        pageNumber: index + 1,
        title: page.getAttribute('data-page-title') || page.getAttribute('data-openpress-frame-key') || wrapper.getAttribute('aria-label') || '',
        source: sourcePath ? { file: sourceFile, path: sourcePath } : undefined,
        overflows,
      };
    });
  })`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
