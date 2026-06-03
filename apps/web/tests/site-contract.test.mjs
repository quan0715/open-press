import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const src = new URL("../src/", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, src), "utf8");
}

async function listFiles(dirUrl) {
  const entries = await readdir(dirUrl, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, dirUrl);
      return entry.isDirectory() ? listFiles(child) : child;
    }),
  );
  return files.flat();
}

test("homepage copy presents the 1.0 agent-made publishing positioning", async () => {
  const home = await read("data/home.ts");
  const page = await read("pages/index.astro");
  const refresh = await read("components/home/HomeRefresh.astro");

  assert.match(home, /homeVersion = "1\.0"/);
  assert.doesNotMatch(home, /AI-written documents|ready to publish|homeVersion = "0\.7"/);
  assert.doesNotMatch(home, /AutoPaging/);
  assert.doesNotMatch(page, /AutoPagingSection|DocumentCodingSection|UseCasesSection/);
  assert.doesNotMatch(refresh, /A document is a source tree|AutoPaging/);
  assert.match(home, /agent-first document package/i);
  assert.match(home, /label: "Showcase", href: "\/showcase"/);
  assert.match(refresh, /Open Press\. Code as your Press, Page, Slide, or Buzz/);
  assert.match(refresh, /Bring an idea, a brief, or a folder of sources/);
  assert.match(refresh, /One base contract/);
  assert.match(refresh, /Taste from skills\. Workspace from OpenPress/);
  assert.match(refresh, /Page \/ Slide \/ Buzz/);
});

test("showcase page uses current landing navigation", async () => {
  const page = await read("pages/showcase.astro");

  assert.match(page, /<LandingNav links=\{navLinks\} \/>/);
  assert.doesNotMatch(page, /showcaseNav/);
  assert.doesNotMatch(page, /Use cases|AutoPaging|Packages/);
});

test("landing nav displays live GitHub star count", async () => {
  const nav = await read("components/home/LandingNav.astro");

  assert.match(nav, /data-github-stars/);
  assert.match(nav, /api\.github\.com\/repos\/quan0715\/open-press/);
  assert.match(nav, /stargazers_count/);
  assert.match(nav, /Star OpenPress on GitHub, 5 stars/);
});

test("docs sidebar exposes product, skills, runtime, CLI, and API layers", async () => {
  const sidebar = await read("data/docs.ts");
  const docsIndex = await read("pages/docs/index.astro");

  for (const heading of ["Start", "Skills", "Runtime", "CLI", "API reference"]) {
    assert.match(sidebar, new RegExp(`heading: "${heading}"`));
  }

  assert.match(sidebar, /label: "Work with Agent", href: "\/docs\/product-boundary"/);
  assert.match(docsIndex, /Work with Agent/);
  assert.doesNotMatch(sidebar, /Product boundary/);
  assert.doesNotMatch(docsIndex, /Product boundary/);
  assert.match(sidebar, /label: "Overview", href: "\/docs\/skills"/);
  assert.match(sidebar, /label: "Public API", href: "\/docs\/public-api"/);
});

test("work-with-agent page documents agent workflow boundaries", async () => {
  const page = await read("pages/docs/product-boundary.astro");

  assert.match(page, /title="Work with Agent"/);
  assert.match(page, /Starting a project/);
  assert.match(page, /What the agent should edit/);
  assert.match(page, /Task routing/);
  assert.match(page, /Verification loop/);
  assert.match(page, /Hard stops/);
  assert.doesNotMatch(page, /title="Product boundary"/);
});

test("skills page documents built-in and external skill ownership", async () => {
  const skills = await read("pages/docs/skills/index.astro");

  for (const phrase of [
    "OpenPress operational skills",
    "openpress-create-pages",
    "openpress-create-slide",
    "Portable helpers",
    "Starter-bearing skills",
    "External creative skills",
    "OpenPress does not fetch starters",
  ]) {
    assert.match(skills, new RegExp(phrase, "i"));
  }

  assert.match(skills, /openpress-social-card-skill/);
});

test("quickstart offers AI-first skills setup and CLI-first setup", async () => {
  const gettingStarted = await read("pages/docs/getting-started.astro");
  const docsIndex = await read("pages/docs/index.astro");

  assert.match(gettingStarted, /Path A · AI-first/);
  assert.match(gettingStarted, /npx -y skills@latest add[\s\S]*quan0715\/open-press/);
  assert.match(gettingStarted, /npx -y skills@latest add[\s\S]*quan0715\/openpress-social-card-skill/);
  assert.match(gettingStarted, /Path B · CLI-first/);
  assert.match(gettingStarted, /npx -y @open-press\/cli@latest[\s\S]*init my-paper/);
  assert.match(gettingStarted, /npm install/);
  assert.doesNotMatch(gettingStarted, /quickstart-routes|quickstart-route/);
  assert.match(docsIndex, /install skills and ask an agent/);
});

test("1.0 API docs do not describe implemented primitives as planned", async () => {
  const press = await read("pages/docs/api/press.astro");
  const workspace = await read("pages/docs/api/workspace.astro");
  const sources = await read("pages/docs/api/sources.astro");
  const config = await read("pages/docs/config.astro");

  assert.doesNotMatch(press, /status="planned"/);
  assert.doesNotMatch(workspace, /status="planned"/);
  assert.doesNotMatch(sources, /status="planned"/);
  assert.doesNotMatch(config, /status="planned"/);
});

test("official docs do not publish roadmap-only planned contracts", async () => {
  const pageFiles = (await listFiles(new URL("pages/docs/", src))).filter((file) =>
    file.pathname.endsWith(".astro"),
  );

  for (const file of pageFiles) {
    const contents = await readFile(file, "utf8");
    assert.doesNotMatch(
      contents,
      /status="planned"|Planned:|Plan contract|draft adapter contract|Plan<\/strong>|draft contract/i,
      file.pathname,
    );
  }
});

test("page geometry docs use Press-level geometry only", async () => {
  const press = await read("pages/docs/api/press.astro");
  const frame = await read("pages/docs/api/frame.astro");
  const publicApi = await read("pages/docs/public-api.astro");
  const themes = await read("pages/docs/themes.astro");

  assert.doesNotMatch(press, /Frame[^.]+override[^.]+page/i);
  assert.match(frame, /does not include a <code>page<\/code> prop/);
  assert.doesNotMatch(publicApi, /config\.page/);
  assert.doesNotMatch(themes, /config\.page/);
  assert.match(publicApi, /<code>&lt;Press page&gt;<\/code>/);
});

test("docs layout keeps article first on mobile and contains wide tables", async () => {
  const layout = await read("layouts/DocLayout.astro");
  const propsTable = await read("components/docs/PropsTable.astro");
  const example = await read("components/docs/Example.astro");

  assert.match(layout, /order:\s*1/);
  assert.match(layout, /order:\s*2/);
  assert.match(layout, /overflow-x:\s*auto/);
  assert.match(layout, /Agent-first document package/);
  assert.match(propsTable, /min-width:\s*0/);
  assert.match(example, /min-width:\s*0/);
});
