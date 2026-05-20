import fs from "node:fs/promises";
import postcss from "postcss";

const UNSCOPED_RULE_PARENTS = new Set(["keyframes", "-webkit-keyframes", "page"]);

export async function buildChapterScopedCss(workspace) {
  const parts = [];
  for (const chapter of workspace.chapters ?? []) {
    for (const styleFile of chapter.styleFiles ?? []) {
      const source = await fs.readFile(styleFile.absolutePath, "utf8");
      const scoped = await scopeChapterCss(source, {
        chapterSlug: chapter.slug,
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

export async function scopeChapterCss(source, { chapterSlug, from = undefined } = {}) {
  if (typeof source !== "string") throw new Error("scopeChapterCss requires a CSS source string.");
  const slug = cssAttributeValue(chapterSlug);
  const scope = `[data-chapter-slug="${slug}"]`;
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
