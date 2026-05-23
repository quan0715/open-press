import fs from "node:fs/promises";
import postcss from "postcss";

const UNSCOPED_RULE_PARENTS = new Set(["keyframes", "-webkit-keyframes", "page"]);

// Section-scoped CSS. Style files under `chapters/<slug>/styles/*.css` (in
// the section-folders preset) are scoped to `[data-section-id="<slug>"]`.
// Workspaces using other source presets do not get section-scoped CSS in v1.
export async function buildSectionScopedCss(workspace) {
  const parts = [];
  for (const section of workspace.sections ?? workspace.chapters ?? []) {
    for (const styleFile of section.styleFiles ?? []) {
      const source = await fs.readFile(styleFile.absolutePath, "utf8");
      const scoped = await scopeSectionCss(source, {
        sectionSlug: section.slug,
        from: styleFile.absolutePath,
      });
      if (!scoped.trim()) continue;
      parts.push(`/* === ${styleFile.documentPath} === */`);
      parts.push(scoped.trimEnd());
      parts.push("");
    }
  }
  return parts.join("\n");
}

export async function scopeSectionCss(source, { sectionSlug, from = undefined } = {}) {
  if (typeof source !== "string") throw new Error("scopeSectionCss requires a CSS source string.");
  const slug = cssAttributeValue(sectionSlug);
  const scope = `[data-section-id="${slug}"]`;
  const root = postcss.parse(source, { from });

  root.walkRules((rule) => {
    if (isInsideUnscopedAtRule(rule)) return;
    rule.selector = `${scope} :where(${rule.selector})`;
  });

  return root.toString();
}

function isInsideUnscopedAtRule(node) {
  let current = node.parent;
  while (current) {
    if (current.type === "atrule" && UNSCOPED_RULE_PARENTS.has(current.name.toLowerCase())) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function cssAttributeValue(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"');
}
