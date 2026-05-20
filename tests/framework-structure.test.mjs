import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "engine", "cli.mjs");

const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const isFile = (rel) => fs.existsSync(path.join(ROOT, rel)) && fs.statSync(path.join(ROOT, rel)).isFile();
const isDir = (rel) => fs.existsSync(path.join(ROOT, rel)) && fs.statSync(path.join(ROOT, rel)).isDirectory();

test("CI surface includes typecheck, qdoc:validate, qdoc:render and points at node --test", () => {
  const pkg = JSON.parse(readText("package.json"));
  const scripts = pkg.scripts;
  const drivesNodeTest = (name, seen = new Set()) => {
    if (seen.has(name)) return false;
    seen.add(name);
    const script = scripts[name] || "";
    if (script.includes("node --test")) return true;
    return [...script.matchAll(/npm run ([A-Za-z0-9:_-]+)/g)].some(([, child]) => drivesNodeTest(child, seen));
  };
  assert.ok(scripts["test"], "test script must exist");
  assert.ok(drivesNodeTest("test"), "test script must drive `node --test`");
  assert.ok(scripts["test:ci"]);
  assert.ok(scripts["test:ci"].includes("typecheck"));
  assert.ok(scripts["test:ci"].includes("qdoc:validate"));
  assert.ok(scripts["test:ci"].includes("qdoc:render"));
});

test("React workbench imports content / media / components via @workspace aliases", () => {
  const workspace = readText("src/qdoc/projectWorkspace.tsx");
  const indexes = readText("src/qdoc/indexes.ts");
  assert.ok(workspace.includes("@workspace/content/**/content/*.mdx"), "React chapter MDX glob must use @workspace alias");
  assert.ok(workspace.includes("@workspace/content/*.md"), "legacy markdown glob must remain readable during migration");
  assert.ok(workspace.includes("@workspace/components/**/data*.json"), "data glob must use @workspace alias");
  assert.ok(indexes.includes("@workspace/media/*"), "media glob must use @workspace alias");
});

test("Project tab exposes document content blocks as a rendered-preview list instead of a legacy data source", () => {
  const workspace = readText("src/qdoc/projectWorkspace.tsx");
  const sources = readText("src/qdoc/projectSources.ts");
  assert.ok(sources.includes('label: "內容區塊"'), "project source label should use document-editing language");
  assert.ok(!sources.includes('label: "Components"'), "project source label should not expose engineering terminology");
  assert.ok(workspace.includes("QDOC_PROJECT_COMPONENT_LIBRARY_KEY"), "project workspace should expose a component library entry key");
  assert.ok(workspace.includes("@workspace/components/**/component.mjs"), "component library must inspect renderer modules");
  assert.ok(workspace.includes("@workspace/components/**/style.css"), "component library must inspect component styles");
  assert.ok(workspace.includes("@workspace/components/**/schema.json"), "component library must inspect component schemas");
  assert.ok(workspace.includes("@workspace/components/**/data*.json"), "component library must inspect component data variants");
  assert.ok(workspace.includes("createProjectComponentEntries"), "component library entries should be grouped by component package");
  assert.ok(workspace.includes("qdoc-project-component-list"), "component panel should render as a vertical preview list");
  assert.ok(workspace.includes("qdoc-project-component-preview-row"), "component panel should use one preview row per rendered block");
  assert.ok(!workspace.includes("qdoc-project-component-gallery"), "component panel should not use a gallery layout");
  assert.ok(workspace.includes("dangerouslySetInnerHTML={{ __html: item.usage.html }}"), "component previews should display rendered component HTML");
  assert.ok(!workspace.includes("qdoc-project-component-facts"), "component panel should not show renderer/data/schema fact tables");
  assert.ok(!workspace.includes("JSON source"), "component panel should not expose raw data source UI");
  assert.ok(workspace.includes("indexOf(componentsPath)"), "component path normalization must handle absolute Vite glob paths");
  assert.ok(!sources.includes('label: "Data Sources"'), "legacy Data Sources label should not appear in the project tab");
});

test("runtime CSS loads font faces before theme tokens set font variables", () => {
  const css = readText("src/styles/qdoc.css");
  const fontsImport = css.indexOf('@import url("/qdoc/fonts.css");');
  const tokensImport = css.indexOf('@import url("/qdoc/tokens.css");');
  assert.ok(fontsImport >= 0, "qdoc.css must import generated fonts.css");
  assert.ok(tokensImport >= 0, "qdoc.css must import generated tokens.css");
  assert.ok(fontsImport < tokensImport, "fonts.css must load before tokens.css so theme font tokens can override defaults");
});

test("print runtime preserves page-surface backgrounds for PDF output", () => {
  const printRoute = readText("src/styles/qdoc/print-route.css");
  const readerRuntime = readText("src/styles/qdoc/reader-runtime.css");

  const printRouteReaderRule = printRoute.match(
    /\.qdoc-html-page__html \.reader-page,[\s\S]*?\.qdoc-html-page__html \.reader-page\.back-cover \{([\s\S]*?)\n  \}/,
  );
  assert.ok(printRouteReaderRule, "print-route.css must size fixed reader pages for browser print");
  assert.doesNotMatch(
    printRouteReaderRule[1],
    /background(?:-color)?:\s*#fff\s*!important/,
    "browser print route must not force all page surfaces to white",
  );

  const runtimeReaderRule = readerRuntime.match(
    /\.qdoc-print-document \.qdoc-html-page__html \.reader-page,[\s\S]*?\.qdoc-print-document \.qdoc-html-page__html \.reader-page\.back-cover \{([\s\S]*?)\n\}/,
  );
  assert.ok(runtimeReaderRule, "reader-runtime.css must size fixed reader pages for Chrome PDF export");
  assert.doesNotMatch(
    runtimeReaderRule[1],
    /background(?:-color)?:\s*#fff/,
    "Chrome PDF route must not force all page surfaces to white",
  );

  assert.match(printRoute, /print-color-adjust:\s*exact/, "print route should preserve authored print colors");
  assert.match(readerRuntime, /print-color-adjust:\s*exact/, "Chrome PDF runtime should preserve authored print colors");
});

test("public mobile viewer uses a reading projection instead of clipping A4 pages", () => {
  const css = readText("src/styles/qdoc/responsive.css");
  const pageRule = css.match(
    /\.qdoc-public-viewer \.qdoc-html-page__html \.reader-page,[\s\S]*?\.qdoc-html-page__html \.reader-page\.back-cover \{([\s\S]*?)\n  \}/,
  );
  assert.ok(pageRule, "responsive.css must define the mobile public reader page rule");
  assert.match(pageRule[1], /height:\s*auto;/, "mobile public pages should grow with reflowed content");
  assert.match(pageRule[1], /overflow:\s*visible;/, "mobile public pages should not clip reflowed content");
  assert.match(pageRule[1], /max-height:\s*none;/, "mobile public pages should not cap reading projection height");

  const frameRule = css.match(
    /\.qdoc-public-viewer \.qdoc-html-page__html \.reader-page \.page-frame \{([\s\S]*?)\n  \}/,
  );
  assert.ok(frameRule, "responsive.css must define the mobile public page frame rule");
  assert.match(frameRule[1], /height:\s*auto;/, "mobile public page frames should not force fixed page height");
  assert.match(frameRule[1], /grid-template-rows:\s*auto minmax\(max-content,\s*1fr\) auto;/);
});

test("public tablet viewer caps reading projection height for landscape screens", () => {
  const css = readText("src/styles/qdoc/responsive.css");
  const tabletBreakpoint = css.lastIndexOf("@media (max-width: 1184px)");
  assert.ok(tabletBreakpoint >= 0, "responsive.css must define the public tablet breakpoint");

  const pageRuleStart = css.indexOf(".qdoc-public-viewer .qdoc-html-page__html .reader-page,", tabletBreakpoint);
  assert.ok(pageRuleStart > tabletBreakpoint, "tablet public viewer must use the same reading projection as mobile");

  const pageRule = css.slice(pageRuleStart, css.indexOf("\n  }", pageRuleStart));
  assert.match(pageRule, /height:\s*auto;/, "tablet public pages should grow with content instead of fixed A4 height");
  assert.match(pageRule, /overflow:\s*visible;/, "tablet public pages should not clip content");
  assert.match(pageRule, /min-height:\s*min\(/, "tablet public pages should cap visual page height");
  assert.match(pageRule, /100dvh/, "landscape tablet page height cap should use viewport height");
});

test("public desktop reading tables fill the page body width", () => {
  const css = readText("src/styles/qdoc/public-viewer.css");
  const tableRule = css.match(
    /\.qdoc-public-viewer\[data-qdoc-view-mode="reading"\] \.reader-page\.report-page table \{([\s\S]*?)\n\}/,
  )?.[1];
  assert.ok(tableRule, "public reading table rule must exist");
  assert.match(tableRule, /display:\s*table/, "desktop reading tables should keep table layout");
  assert.match(tableRule, /width:\s*100%/, "desktop reading tables should fill the page body");
  assert.doesNotMatch(tableRule, /width:\s*auto/, "desktop reading tables should not shrink to content width");
});

test("vite.config.ts wires @workspace aliases and __QDOC_*_PATH__ defines from qdoc.config.mjs", () => {
  const viteConfig = readText("vite.config.ts");
  for (const alias of ['"@workspace/content"', '"@workspace/media"', '"@workspace/components"']) {
    assert.ok(viteConfig.includes(alias), `${alias} alias must be wired in vite.config.ts`);
  }
  for (const define of ["__QDOC_CONTENT_PATH__", "__QDOC_MEDIA_PATH__", "__QDOC_COMPONENTS_PATH__"]) {
    assert.ok(viteConfig.includes(define), `${define} define must be exposed`);
  }
});

test("vite dev server exposes the React inspector comment endpoint", () => {
  const viteConfig = readText("vite.config.ts");
  assert.ok(viteConfig.includes("handleQDocCommentRequest"), "vite config must import the QDoc comment endpoint handler");
  assert.ok(viteConfig.includes('"/__qdoc/comment"'), "vite dev server must expose /__qdoc/comment");
});

test("qdoc apply-comments skill owns pending inspector marker workflow", () => {
  const skillPath = "skills/qdoc-apply-comments/SKILL.md";
  assert.ok(isFile(skillPath), "qdoc-apply-comments skill must exist");
  const skill = readText(skillPath);
  const coreSkill = readText("skills/qdoc/SKILL.md");
  assert.ok(skill.includes("@qdoc-comment"), "skill must target inspector comment markers");
  assert.ok(skill.includes('rg "@qdoc-comment" document -n'), "skill must document marker discovery");
  assert.ok(skill.includes("npm run qdoc:validate"), "skill must require validation after applying comments");
  assert.ok(coreSkill.includes("qdoc-apply-comments"), "core qdoc skill must route comment marker work to the owning skill");
  assert.ok(skill.split(/\s+/).length < 520, "apply-comments skill should stay concise");
});

test("workbench exposes a dedicated comments workspace tab", () => {
  const workbench = readText("src/qdoc/workbench.tsx");
  assert.ok(workbench.includes('view: "comments"'), "workspace switcher must include comments view");
  assert.ok(workbench.includes("QDocCommentsWorkspace"), "workbench must render a comments workspace");
  assert.ok(workbench.includes("fetchQDocInspectorComments"), "comments workspace must load pending comments from endpoint");
  assert.ok(workbench.includes("clearQDocInspectorComment"), "comments workspace must support clearing comments");
});

test("comments tab keeps the document stage and renders the comment list in the side panel", () => {
  const workbench = readText("src/qdoc/workbench.tsx");
  const stageStart = workbench.indexOf('<main className="reader-stage"');
  const asideStart = workbench.indexOf('<aside className="reader-side-nav');
  assert.ok(stageStart >= 0 && asideStart > stageStart, "workbench must render stage before side panel");
  const stage = workbench.slice(stageStart, asideStart);
  const aside = workbench.slice(asideStart);

  assert.ok(stage.includes('workspaceView !== "project"'), "document stage should stay mounted for document and comments tabs");
  assert.doesNotMatch(stage, /QDocCommentsWorkspace/, "comments list should not replace the document stage");
  assert.match(aside, /workspaceView === "comments"[\s\S]*QDocCommentsWorkspace/, "comments list belongs in the side panel");
  assert.ok(workbench.includes("qdoc-comments-workspace--panel"), "comments panel should use compact panel styling");
});

test("node-pointer-demo makes the first pointer visibly target the entry node", () => {
  const component = readText("document/components/node-pointer-demo/component.mjs");
  const css = readText("document/components/node-pointer-demo/style.css");

  assert.ok(component.includes("node-pointer-demo__item--entry"), "first node must receive an entry marker class");
  assert.match(css, /\.node-pointer-demo__canvas \{[\s\S]*?position:\s*relative;/, "canvas should anchor the pointer line");
  assert.match(css, /\.node-pointer-demo__pointer \{[\s\S]*?position:\s*absolute;/, "first pointer should overlay the first node");
  assert.match(css, /\.node-pointer-demo__item--entry \.node-pointer-demo__node/, "entry node should have a visible target treatment");
});

test("pagination treats long pre code blocks as splittable content", () => {
  const pagination = readText("src/qdoc/pagination.ts");
  assert.match(pagination, /block\.tagName === "PRE"/, "pre blocks must opt into pagination splitting");
  assert.match(pagination, /getPreLines\(block\)/, "pre splitting should be based on code lines");
  assert.match(pagination, /qdoc-pre-fragment/, "split pre pages should keep a recognizable fragment class");
  assert.match(pagination, /querySelector\(":scope > code"\)/, "pre splitting should preserve the nested code element");
});

test("reader bookmark groups do not cap expanded course outlines", () => {
  const cssFiles = [
    "src/styles/qdoc/workbench-panels.css",
    "document/theme/shell/reader-controls.css",
  ].filter(isFile);

  for (const file of cssFiles) {
    const css = readText(file);
    const openRule = css.match(/\.bookmark-group\.is-open \.bookmark-subs \{([\s\S]*?)\n\}/);
    assert.ok(openRule, `${file} must style the bookmark open state`);
    assert.doesNotMatch(openRule[1], /max-height:\s*\d+px/, `${file} must not clip long H3/H4 outlines`);
    assert.match(openRule[1], /overflow:\s*visible/, `${file} should let the outer bookmark scroller own long outlines`);
  }
});

test("editorial-monograph is a complete style pack skill", () => {
  // Style-pack detection is structural, not metadata-driven: a skill is a
  // style pack iff it has a `starter/` subdirectory. Engine/init.mjs
  // discovers packs this way (listStylePackSkills), so the test mirrors
  // that contract instead of pinning frontmatter keys.
  const skillBase = "skills/editorial-monograph";
  assert.ok(isFile(`${skillBase}/SKILL.md`), "SKILL.md must exist");
  assert.ok(isDir(`${skillBase}/starter`), "starter/ must exist");
  assert.ok(isFile(`${skillBase}/starter/document/theme/fonts.css`), "starter must include a theme font stylesheet for browser-stable typography");
  assert.ok(!isDir(`${skillBase}/starter/.qdoc`), "style pack styling belongs in theme/, not .qdoc/");
  const fontCss = readText(`${skillBase}/starter/document/theme/fonts.css`);
  assert.match(fontCss, /Noto(\+|%20| )Serif(\+|%20| )TC/, "editorial-monograph must load its serif webfont");
  assert.match(fontCss, /IBM(\+|%20| )Plex(\+|%20| )Sans/, "editorial-monograph must load its body webfont");
  for (const sub of ["chapters", "theme", "components", "media"]) {
    assert.ok(isDir(`${skillBase}/starter/document/${sub}`), `starter/document/${sub}/ must exist`);
  }
  assert.ok(
    isFile(`${skillBase}/starter/document/index.tsx`),
    "starter/document/index.tsx must exist as the React document entry",
  );
  assert.ok(
    isFile(`${skillBase}/starter/document/design.md`),
    "starter/document/design.md must exist as the single design brief that ships with the pack",
  );
  assert.ok(
    isFile(`${skillBase}/starter/qdoc.config.mjs`),
    "starter/qdoc.config.mjs must exist so init produces a workspace marker",
  );
  assert.ok(!isDir(`${skillBase}/starter/content`), "starter/content must not remain as the default authoring surface");
});

test("editorial-monograph ships exactly one design brief at starter/document/design.md", () => {
  const skillBase = "skills/editorial-monograph";
  assert.ok(!isDir(`${skillBase}/starter/design-system`), "starter should no longer ship a design-system folder");
  assert.ok(isFile(`${skillBase}/starter/document/design.md`), "starter must consolidate design rules into a single design.md");
  const design = readText(`${skillBase}/starter/document/design.md`);
  assert.match(design, /## 1\. 風格目標與使用場景/, "design.md should cover style positioning");
  assert.match(design, /## 2\. Tokens/, "design.md should cover tokens");
  assert.match(design, /## 3\. Components/, "design.md should cover components");
});

test("editorial-monograph mobile reader preserves authored page-surface backgrounds", () => {
  const css = readText("skills/editorial-monograph/starter/document/theme/shell/reader-controls.css");
  const mobileStart = css.indexOf("@media screen and (max-width: 767px)");
  assert.ok(mobileStart >= 0, "reader controls should define a mobile breakpoint");
  const mobileCss = css.slice(mobileStart);

  const readerRule = mobileCss.match(
    /\.reader-page,[\s\S]*?\.reader-page\.back-cover\.is-active \{([\s\S]*?)\n  \}/,
  );
  assert.ok(readerRule, "mobile breakpoint must size reader pages");
  assert.doesNotMatch(
    readerRule[1],
    /background:\s*var\(--qd-color-document\)/,
    "mobile reader sizing must not repaint authored cover/toc/back-cover surfaces",
  );

  const coverBackRule = mobileCss.match(/\.cover,[\s\S]*?\.back-cover \{([\s\S]*?)\n  \}/);
  if (coverBackRule) {
    assert.doesNotMatch(
      coverBackRule[1],
      /background:\s*var\(--qd-color-document\)/,
      "mobile cover/back-cover spacing rules must not repaint page surfaces",
    );
  }
});

test("style pack contributor skill documents portable font contracts", () => {
  const skill = readText("skills/qdoc-style-pack-contributor/SKILL.md");
  assert.match(skill, /theme\/fonts\.css/);
  assert.doesNotMatch(skill, /\.qdoc\/fonts/);
  assert.match(skill, /theme\/tokens\.css/);
  assert.match(skill, /--qd-font/);
  assert.match(skill, /local\(\.\.\.\)/);
});

test("qdoc init produces a workspace that passes qdoc validate", async () => {
  // The real contract for a style pack starter is "init from it, then
  // validate passes". This is the functional truth — far more durable
  // than listing every file by name.
  const target = await fsp.mkdtemp(path.join(os.tmpdir(), "qdoc-init-smoke-"));
  try {
    await fsp.rmdir(target); // init expects target to not exist or be empty
    const init = spawnSync("node", [CLI, "init", target], { cwd: ROOT, encoding: "utf8" });
    assert.equal(init.status, 0, init.stderr + init.stdout);

    const validate = spawnSync("node", [CLI, "validate", target], { cwd: ROOT, encoding: "utf8" });
    assert.equal(validate.status, 0, validate.stderr + validate.stdout);
    assert.match(validate.stdout, /QDoc validation OK/);
  } finally {
    await fsp.rm(target, { recursive: true, force: true });
  }
});
