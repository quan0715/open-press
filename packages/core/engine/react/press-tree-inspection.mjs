// Walks the user's default-exported component tree to extract
// <Workspace> and <Press> metadata declared as JSX props.
//
// The 1.0 contract says <Press> carries every per-document setting on
// its props (title, page, sources, slug, theme, componentsDir, mediaDir).
// This helper invokes the user's
// component once at load time to inspect those props before the engine
// runs its render pipeline.
//
// Safe to call because Workspace, Press, and (typically) the user's
// default export are inert function components that just return JSX —
// they don't use hooks at the entry boundary.

import React from "react";

/**
 * Inspect the user's default export and extract every <Press> child
 * of the (optional) <Workspace> wrapper. The export pipeline iterates
 * the returned `presses` array — single-Press workspaces simply have
 * length 1, multi-Press have length N. There is no separate code path
 * for the single-Press case.
 *
 * @param {object} opts
 * @param {Function} opts.UserComponent  The default export of press/<slug>/press.tsx.
 * @param {symbol} opts.PRESS_MARKER     Marker identifying Press components.
 * @param {symbol} opts.WORKSPACE_MARKER Marker identifying Workspace components.
 * @returns {{
 *   workspaceProps: Record<string, unknown>,
 *   presses: Array<{
 *     element: object,                          // ReactElement
 *     props: Record<string, unknown>,           // Press JSX props (no children)
 *     metadata: {
 *       title?: string,
 *       type?: "pages" | "slides",
 *       page?: unknown,
 *       slug?: string,
 *       theme?: string,
 *       componentsDir?: string | string[],
 *       mediaDir?: string | string[],
 *       captionNumbering?: unknown,
 *     },
 *     sources: Record<string, unknown> | null,  // mdxSource() descriptors keyed by id
 *     children: unknown,                        // raw children for re-rendering
 *     index: number,                            // position in the Workspace
 *   }>,
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

  const presses = pressElements.map((element, index) => {
    const props = extractProps(element);
    return {
      element,
      props,
      metadata: pickPressMetadata(props),
      sources: extractSources(props),
      children: element.props?.children ?? null,
      index,
    };
  });

  return {
    workspaceProps,
    presses,
    wrappedInWorkspace,
  };
}

function emptyResult() {
  return {
    workspaceProps: {},
    presses: [],
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
  walk(root, new Set());
  return found;

  function walk(node, seen) {
    if (!isReactElement(node)) {
      // Could be array / fragment / string / number — flatten and recurse.
      if (Array.isArray(node)) {
        for (const child of node) walk(child, seen);
      }
      return;
    }
    if (isMarked(node, PRESS_MARKER)) {
      found.push(node);
      // Don't descend into Press — its children are the document tree,
      // not more workspace structure.
      return;
    }
    const rendered = renderCompositeElement(node, seen);
    if (rendered !== null) {
      walk(rendered, seen);
      return;
    }
    // Recurse into children + Fragment-like wrappers.
    const children = node.props?.children;
    if (children == null) return;
    React.Children.forEach(children, (child) => walk(child, seen));
  }
}

function renderCompositeElement(element, seen) {
  const type = element?.type;
  if (typeof type !== "function") return null;
  if (seen.has(type)) return null;
  seen.add(type);
  try {
    return type(element.props ?? {});
  } catch {
    // Top-level Press wrapper components should be inert. If a user puts a
    // hookful or effectful component at the Workspace boundary, leave it for
    // the normal React render pipeline to report with full context.
    return null;
  } finally {
    seen.delete(type);
  }
}

function pickPressMetadata(pressProps) {
  const out = {};
  if (typeof pressProps.title === "string") out.title = pressProps.title;
  if (typeof pressProps.type === "string") out.type = pressProps.type;
  if (pressProps.page !== undefined) out.page = pressProps.page;
  if (typeof pressProps.slug === "string") out.slug = pressProps.slug;
  if (typeof pressProps.theme === "string") out.theme = pressProps.theme;
  if (typeof pressProps.componentsDir === "string" || isStringArray(pressProps.componentsDir)) {
    out.componentsDir = pressProps.componentsDir;
  }
  if (typeof pressProps.mediaDir === "string" || isStringArray(pressProps.mediaDir)) {
    out.mediaDir = pressProps.mediaDir;
  }
  if (pressProps.captionNumbering !== undefined) out.captionNumbering = pressProps.captionNumbering;
  return out;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

// Convert <Press sources={[ mdxSource({ id, ... }), ... ]}> into the
// engine's expected sources record { [id]: descriptor }.
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
