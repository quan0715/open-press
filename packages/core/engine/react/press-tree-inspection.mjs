// Walks the user's default-exported component tree to extract
// <Workspace> and <Press> metadata declared as JSX props.
//
// The 1.0 contract says <Press> carries every per-document setting on
// its props (title, page, sources, slug, theme, componentsDir) and is
// always nested inside <Workspace>. This helper invokes the user's
// component once at load time to inspect those props before the engine
// runs its render pipeline.
//
// Safe to call because Workspace, Press, and (typically) the user's
// default export are inert function components that just return JSX —
// they don't use hooks at the entry boundary.

import React from "react";

/**
 * Inspect the user's default export and extract metadata from any
 * <Workspace> + <Press> wrapping.
 *
 * @param {object} opts
 * @param {Function} opts.UserComponent  The default export of press/index.tsx.
 * @param {symbol} opts.PRESS_MARKER     Marker identifying Press components.
 * @param {symbol} opts.WORKSPACE_MARKER Marker identifying Workspace components.
 * @returns {{
 *   workspaceProps: Record<string, unknown>,
 *   pressMetadata: {
 *     title?: string,
 *     page?: unknown,
 *     slug?: string,
 *     theme?: string,
 *     componentsDir?: string,
 *     captionNumbering?: unknown,
 *   },
 *   pressSources: Array<unknown> | null,
 *   pressCount: number,
 *   wrappedInWorkspace: boolean,
 * }}
 */
export function inspectPressTree({ UserComponent, PRESS_MARKER, WORKSPACE_MARKER }) {
  if (typeof UserComponent !== "function") {
    return emptyResult();
  }

  let root;
  try {
    root = UserComponent({});
  } catch (err) {
    // The user's default export threw before returning JSX. This is rare
    // (function components at the entry boundary don't normally use hooks
    // that could fail), but we treat it as "no Press metadata declared"
    // and let the render pipeline surface the real error later with
    // full React error context.
    return emptyResult();
  }

  if (!isReactElement(root)) return emptyResult();

  const workspaceProps = isMarked(root, WORKSPACE_MARKER) ? extractProps(root) : {};
  const wrappedInWorkspace = isMarked(root, WORKSPACE_MARKER);

  // Find every <Press> element in the tree (Workspace child, or root itself).
  const pressElements = collectPressElements(root, PRESS_MARKER);
  const pressCount = pressElements.length;

  // For now the engine renders one Press per export. If multiple are
  // declared, take the first and let the document.json contain just
  // that one. Multi-Press output is a follow-up implementation step.
  const firstPress = pressElements[0] ?? null;
  const pressProps = firstPress ? extractProps(firstPress) : {};

  const pressMetadata = pickPressMetadata(pressProps);
  const pressSources = extractSources(pressProps);

  return {
    workspaceProps,
    pressMetadata,
    pressSources,
    pressCount,
    wrappedInWorkspace,
  };
}

function emptyResult() {
  return {
    workspaceProps: {},
    pressMetadata: {},
    pressSources: null,
    pressCount: 0,
    wrappedInWorkspace: false,
  };
}

function isReactElement(value) {
  return value && typeof value === "object" && "type" in value && "props" in value;
}

function isMarked(element, marker) {
  if (!isReactElement(element)) return false;
  const type = element.type;
  if (!type) return false;
  // Components are tagged via `Component.openpressMarker = MARKER`.
  return type.openpressMarker === marker;
}

function extractProps(element) {
  if (!isReactElement(element) || !element.props) return {};
  // Drop children — props are non-tree metadata only.
  const { children, ...rest } = element.props;
  return rest;
}

function collectPressElements(root, PRESS_MARKER) {
  const found = [];
  walk(root);
  return found;

  function walk(node) {
    if (!isReactElement(node)) {
      // Could be array / fragment / string / number — flatten and recurse.
      if (Array.isArray(node)) {
        for (const child of node) walk(child);
      }
      return;
    }
    if (isMarked(node, PRESS_MARKER)) {
      found.push(node);
      // Don't descend into Press — its children are the document tree,
      // not more workspace structure.
      return;
    }
    // Recurse into children + Fragment-like wrappers.
    const children = node.props?.children;
    if (children == null) return;
    React.Children.forEach(children, walk);
  }
}

function pickPressMetadata(pressProps) {
  const out = {};
  if (typeof pressProps.title === "string") out.title = pressProps.title;
  if (pressProps.page !== undefined) out.page = pressProps.page;
  if (typeof pressProps.slug === "string") out.slug = pressProps.slug;
  if (typeof pressProps.theme === "string") out.theme = pressProps.theme;
  if (typeof pressProps.componentsDir === "string") out.componentsDir = pressProps.componentsDir;
  if (pressProps.captionNumbering !== undefined) out.captionNumbering = pressProps.captionNumbering;
  return out;
}

// Convert the v1.0 <Press sources={[ mdxSource({ id, ... }), ... ]}> array
// into the engine's expected sources record { [id]: descriptor }. Returns
// null if no sources prop was declared (engine falls back to the named
// `export const sources` from the entry module — the v0.x shape).
function extractSources(pressProps) {
  if (!Array.isArray(pressProps.sources)) return null;
  const out = {};
  for (const entry of pressProps.sources) {
    if (!entry || typeof entry !== "object") continue;
    const id = typeof entry.id === "string" ? entry.id : null;
    if (!id) continue;
    // Strip the id field — the engine's descriptor shape doesn't carry it
    // (id was the record key in v0.x).
    const { id: _omit, ...descriptor } = entry;
    out[id] = descriptor;
  }
  return out;
}
