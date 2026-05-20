import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { renderChartFigure } from "../src/qdoc/chartRenderer.js";

const QDOC_COMPONENT_RE = /<qdoc-component\b(?<attrs>[^>]*)\/>|<qdoc-component\b(?<attrsOpen>[^>]*)>\s*<\/qdoc-component>/gi;
const COMPONENT_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
const DATA_VARIANT_RE = /^[a-z0-9][a-z0-9-]*$/;
const BUILTIN_CHART_TYPES = new Set(["bar", "line", "donut"]);

export async function renderQDocComponents(body, root) {
  const matches = [...String(body).matchAll(QDOC_COMPONENT_RE)];
  if (matches.length === 0) return body;

  let output = "";
  let lastEnd = 0;
  for (const match of matches) {
    output += body.slice(lastEnd, match.index);
    const attrs = parseAttributes(match.groups?.attrs ?? match.groups?.attrsOpen ?? "");
    output += await renderQDocComponent(attrs, root);
    lastEnd = match.index + match[0].length;
  }
  output += body.slice(lastEnd);
  return output;
}

async function renderQDocComponent(attrs, root) {
  const name = requiredAttr(attrs, "name");
  if (!COMPONENT_NAME_RE.test(name)) {
    throw new Error(`qdoc-component name must be a component slug, got: ${name}`);
  }
  if (attrs.data && !DATA_VARIANT_RE.test(attrs.data)) {
    throw new Error(`qdoc-component data variant must be a slug, got: ${attrs.data}`);
  }

  const documentRoot = path.resolve(root);
  const componentsRoot = path.resolve(documentRoot, "components");
  const componentDir = path.resolve(componentsRoot, name);
  if (!isInsideRoot(componentDir, componentsRoot)) {
    throw new Error(`qdoc-component name escapes components directory: ${name}`);
  }

  const data = await readComponentData(componentDir, attrs.data);
  const module = await tryLoadComponentModule(componentDir);

  if (module) {
    const render = module.render ?? module.default;
    if (typeof render !== "function") {
      throw new Error(`qdoc-component ${name} must export a render function.`);
    }
    const html = await render({
      attrs: Object.freeze({ ...attrs, name }),
      data,
      helpers,
    });
    if (typeof html !== "string") {
      throw new Error(`qdoc-component ${name} render must return an HTML string.`);
    }
    return normalizeComponentOutput(html, name);
  }

  if (data && typeof data.chartType === "string" && BUILTIN_CHART_TYPES.has(data.chartType)) {
    return normalizeComponentOutput(renderChartFigure({
      type: data.chartType,
      data,
      variant: attrs.variant || name,
    }), name);
  }

  throw new Error(
    `qdoc-component ${name}: no component.mjs in document/components/${name}/ and data.json does not declare a built-in chartType (${[...BUILTIN_CHART_TYPES].join(", ")}).`,
  );
}

async function readComponentData(componentDir, dataVariant) {
  const filename = dataVariant ? `data.${dataVariant}.json` : "data.json";
  const dataPath = path.join(componentDir, filename);
  try {
    return JSON.parse(await fs.readFile(dataPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function tryLoadComponentModule(componentDir) {
  const componentPath = path.join(componentDir, "component.mjs");
  let stat;
  try {
    stat = await fs.stat(componentPath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  return import(`${pathToFileURL(componentPath).href}?mtime=${stat.mtimeMs}`);
}

function parseAttributes(rawAttrs) {
  const attrs = {};
  for (const match of String(rawAttrs).matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attrs[match[1]] = match[2] ?? match[3] ?? "";
  }
  return attrs;
}

function requiredAttr(attrs, name) {
  if (!attrs[name]) throw new Error(`qdoc-component missing required ${name} attribute`);
  return attrs[name];
}

function isInsideRoot(target, root) {
  const relative = path.relative(root, target);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function normalizeComponentOutput(html, name) {
  const value = String(html ?? "");
  if (!/<figcaption\b/i.test(value)) return value;

  const figure = value.trim().match(/^<figure\b(?<attrs>[^>]*)>(?<body>[\s\S]*)<\/figure>$/i);
  if (!figure?.groups) return value;

  const rawAttrs = figure.groups.attrs ?? "";
  if (readAttribute(rawAttrs, "aria-hidden") === "true") return value;

  const caption = figure.groups.body.match(/\s*(<figcaption\b[^>]*>[\s\S]*?<\/figcaption>)\s*/i);
  if (!caption) return value;

  const originalClass = readAttribute(rawAttrs, "class");
  const ariaLabel = readAttribute(rawAttrs, "aria-label");
  const bodyAttrs = removeAttributes(rawAttrs, ["class", "aria-label", "data-qdoc-component"]);
  const bodyContent = [
    figure.groups.body.slice(0, caption.index),
    figure.groups.body.slice(caption.index + caption[0].length),
  ].join("").trim();

  const outerAttrs = [
    `class="${escapeAttr(classNames("qdoc-component-frame", `qdoc-component-frame--${name}`))}"`,
    `data-qdoc-component="${escapeAttr(name)}"`,
  ];
  if (ariaLabel) outerAttrs.push(`aria-label="${escapeAttr(ariaLabel)}"`);

  const innerAttrs = [
    `class="${escapeAttr(classNames("qdoc-component-frame__body", originalClass))}"`,
    `data-qdoc-component-body="${escapeAttr(name)}"`,
  ];
  if (bodyAttrs) innerAttrs.push(bodyAttrs);

  return [
    `<figure ${outerAttrs.join(" ")}>`,
    `  <div ${innerAttrs.join(" ")}>`,
    bodyContent,
    "  </div>",
    `  ${caption[1].trim()}`,
    "</figure>",
  ].join("\n");
}

function readAttribute(rawAttrs, name) {
  const match = String(rawAttrs).match(new RegExp(`(?:^|\\s)${escapeRegExp(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
  return match?.[1] ?? match?.[2] ?? "";
}

function removeAttributes(rawAttrs, names) {
  let output = String(rawAttrs ?? "");
  for (const name of names) {
    output = output.replace(new RegExp(`\\s*${escapeRegExp(name)}\\s*=\\s*(?:"[^"]*"|'[^']*')`, "gi"), "");
  }
  return output.trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function classNames(...values) {
  return values
    .flatMap((value) => String(value ?? "").split(/\s+/))
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
}

const helpers = Object.freeze({
  classNames,
  escapeAttr,
  escapeHtml,
});
