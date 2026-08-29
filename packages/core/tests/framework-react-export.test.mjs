import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { exportDocument } from "../engine/document-export.mjs";
import { CORE_ENTRY, createReactSsrServer } from "../engine/react/document-entry.mjs";
import { exportReactDocument } from "../engine/react/document-export.mjs";
import { buildReactMeasurementCss } from "../engine/react/measurement-css.mjs";
import { normalizeConfig } from "../engine/runtime/config.mjs";
import { withTempWorkspace as withTempDirectory } from "./_temp.mjs";

async function withTempWorkspace(fn) {
  return withTempDirectory("openpress-press-tree-export-", fn);
}

async function writeFile(filePath, source) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, source, "utf8");
}

async function writeMinimalTheme(workspace) {
  await writeFile(path.join(workspace, "press/shared/theme/tokens.css"), ":root { --fixture: 1; }\n");
  await fs.mkdir(path.join(workspace, "press/shared/media"), { recursive: true });
}

async function writePageShellTokens(workspace, declarations) {
  await writeFile(
    path.join(workspace, "press/shared/theme/tokens.css"),
    [
      ":root {",
      "  --fixture: 1;",
      ...declarations.map((declaration) => `  ${declaration}`),
      "}",
    ].join("\n") + "\n",
  );
}

const PRESS_FIXTURE = `import { Frame, MdxArea, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, Toc } from "@open-press/core/manuscript";

function Cover() {
  return (
    <Frame frameKey="cover" role="manuscript.cover" chrome={false} data-page-title="Cover" id="cover">
      <h1>Fixture Press Doc</h1>
    </Frame>
  );
}

function BackCover() {
  return (
    <Frame frameKey="back-cover" role="manuscript.back-cover" chrome={false} data-page-title="Back Cover" id="back-cover">
      <p>Done</p>
    </Frame>
  );
}

function Page({ frameKey, chainId, pageIndex, totalPages, sectionSlug }) {
  return (
    <Frame
      frameKey={frameKey}
      role="manuscript.content"
      data-page-index={pageIndex}
      data-total-pages={totalPages}
      data-section-id={sectionSlug}
    >
      <div className="page-frame">
        <main className="page-body">
          <MdxArea chainId={chainId} />
        </main>
      </div>
    </Frame>
  );
}

export default function FixturePress() {
  return (
    <Press slug="report" title="Fixture Press Doc" sources={[mdxSource({ id: "story", preset: "section-folders", root: "report/chapters" })]}>
      <Cover />
      <Toc source="story" />
      <Sections source="story" page={Page} />
      <BackCover />
    </Press>
  );
}
`;

function pressFixtureWith({ pressProps = "", tocProps = "" } = {}) {
  return PRESS_FIXTURE
    .replace(
      'title="Fixture Press Doc"',
      `title="Fixture Press Doc"${pressProps}`,
    )
    .replace("<Toc source=\"story\" />", `<Toc source="story"${tocProps} />`);
}

test("exportReactDocument writes a Press tree document.json with cover/toc/sections/back frames", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "openpress/settings.json"),
      `${JSON.stringify({
        version: 1,
        appearance: { colorMode: "light", accent: "violet" },
        pdf: { filename: "private-book.pdf" },
        deploy: { projectName: "private-project" },
      }, null, 2)}\n`,
    );
    await writeFile(path.join(workspace, "press/report/press.tsx"), PRESS_FIXTURE);
    await writeFile(
      path.join(workspace, "press/report/chapters/01-intro/content/01-intro.mdx"),
      "## Introduction\n\nThis is a short fixture chapter.\n\nIt has two paragraphs.\n",
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    assert.ok(result, "export should return a result");
    assert.ok(result.pageCount > 0, "pageCount should be > 0");

    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    assert.equal(documentJson.meta.title, "Fixture Press Doc");
    assert.equal(documentJson.meta.type, "pages");
    assert.equal(documentJson.meta.workspaceLabel, "");
    assert.equal(documentJson.meta.version, "openpress-press-tree-v1");

    const workspaceManifest = JSON.parse(await fs.readFile(path.join(workspace, "public/openpress/workspace.json"), "utf8"));
    assert.equal(workspaceManifest.presses[0].type, "pages");
    assert.equal(workspaceManifest.presses[0].thumbnailUrl, "/openpress/report/thumbnail.png");
    const publicSettings = JSON.parse(
      await fs.readFile(path.join(workspace, "public/openpress/settings.json"), "utf8"),
    );
    assert.deepEqual(publicSettings, {
      version: 1,
      appearance: {
        colorMode: "light",
        accent: "violet",
      },
    });
    assert.equal(JSON.stringify(publicSettings).includes("private"), false);

    const roles = documentJson.source.frames.map((f) => f.role);
    assert.ok(roles.includes("manuscript.cover"), `expected cover role in ${JSON.stringify(roles)}`);
    assert.ok(roles.includes("manuscript.toc"), `expected toc role in ${JSON.stringify(roles)}`);
    assert.ok(roles.includes("manuscript.content"), `expected content role in ${JSON.stringify(roles)}`);
    assert.ok(roles.includes("manuscript.back-cover"), `expected back-cover role in ${JSON.stringify(roles)}`);

    assert.deepEqual(documentJson.source.chains, ["story:intro", "toc:story", "toc:story:h2"]);

    const tocFrame = documentJson.source.frames.find((f) => f.role === "manuscript.toc");
    assert.ok(tocFrame, "should have a toc frame");
    assert.equal(tocFrame.mdxAreas[0].chainId, "toc:story");
    const tocBlock = documentJson.blocks.find((block) => block.role === "manuscript.toc");
    assert.match(tocBlock.html, /Intro/);
    assert.match(tocBlock.html, /class="[^"]*\btoc-page\b/);

    const contentFrame = documentJson.source.frames.find((f) => f.role === "manuscript.content");
    assert.ok(contentFrame, "should have a content frame");
    assert.ok(contentFrame.mdxAreas.length === 1, "content frame should have 1 mdx area");
    assert.equal(contentFrame.mdxAreas[0].chainId, "story:intro");
    assert.ok(contentFrame.mdxAreas[0].blockIds.length > 0, "blocks should be allocated");

    // block IDs in blockMap point to source positions
    const blockId = contentFrame.mdxAreas[0].blockIds[0];
    const blockMeta = documentJson.source.blockMap[blockId];
    assert.ok(blockMeta, `blockMap should contain ${blockId}`);
    assert.equal(blockMeta.sectionSlug, "intro");
  });
});

test("exportReactDocument emits explicit slide Press type metadata", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/report/press.tsx"),
      `import { Press, Slide } from "@open-press/core";

export default function SlidePress() {
  return (
    <Press slug="report" title="Fixture Slide Deck" type="slides" page="slide-16-9">
      <Slide id="cover" />
      <Slide id="agenda" />
    </Press>
  );
}
`,
    );
    await writeFile(
      path.join(workspace, "press/report/slides/cover/slide.tsx"),
      `import { Frame } from "@open-press/core";

export default function CoverSlide() {
  return (
    <Frame frameKey="cover" role="slides.cover" data-page-title="Cover">
      <div className="page-frame"><h1>Hello slides</h1></div>
    </Frame>
  );
}
`,
    );
    await writeFile(
      path.join(workspace, "press/report/slides/agenda/slide.tsx"),
      `import { Frame } from "@open-press/core";

export default function AgendaSlide() {
  return (
    <Frame frameKey="agenda" role="slides.slide" data-page-title="Agenda">
      <div className="page-frame"><h2>Agenda</h2></div>
    </Frame>
  );
}
`,
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const workspaceManifest = JSON.parse(await fs.readFile(path.join(workspace, "public/openpress/workspace.json"), "utf8"));

    assert.equal(documentJson.meta.type, "slides");
    assert.equal(documentJson.source.chains.length, 0);
    assert.equal(workspaceManifest.presses[0].type, "slides");
  });
});

test("exportReactDocument ignores a legacy slide template registry", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/slide/press.tsx"),
      `import { Press, Slide } from "@open-press/core";

export default function SlidePress() {
  return (
    <Press slug="slide" title="Template Fixture" type="slides" page="slide-16-9">
      <Slide id="cover" />
    </Press>
  );
}
`,
    );
    await writeFile(
      path.join(workspace, "press/slide/slides/cover/slide.tsx"),
      `import { Frame, Slide, Text } from "@open-press/core";

export default function CoverSlide() {
  return (
    <Slide id="cover">
      <Frame frameKey="cover"><Text as="h1">Cover</Text></Frame>
    </Slide>
  );
}
`,
    );
    await writeFile(
      path.join(workspace, "press/slide/slide-style/manifest.json"),
      JSON.stringify({
        id: "fixture-style",
        version: "1.0.0",
        defaultTemplate: "blank",
        templates: {
          blank: { source: "templates/blank/slide.tsx", description: "Blank starter" },
          "split-media": { source: "templates/split-media/slide.tsx", description: "Split media starter" },
        },
      }, null, 2),
    );
    await writeFile(
      path.join(workspace, "press/slide/slide-style/templates/blank/slide.tsx"),
      `import { Frame, Slide, Text } from "@open-press/core";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__">
      <Frame frameKey="__SLIDE_ID__">
        <Text as="h1">__SLIDE_ID__ blank preview</Text>
      </Frame>
    </Slide>
  );
}
`,
    );
    await writeFile(
      path.join(workspace, "press/slide/slide-style/templates/split-media/slide.tsx"),
      `import { Frame, Slide, Text } from "@open-press/core";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__">
      <Frame frameKey="__SLIDE_ID__">
        <Text as="h1">__SLIDE_ID__ split preview</Text>
      </Frame>
    </Slide>
  );
}
`,
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));

    assert.equal("slideTemplates" in documentJson.source, false);
  });
});

test("exportReactDocument renders discovered press folder entries", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/slide/press.tsx"),
      `import { Press, Slide } from "@open-press/core";

export default function SlidePress() {
  return (
    <Press slug="slide" title="Folder Slide" type="slides" page="slide-16-9">
      <Slide id="cover" />
    </Press>
  );
}
`,
    );
    await writeFile(
      path.join(workspace, "press/slide/slides/cover/slide.tsx"),
      `import { Frame } from "@open-press/core";

export default function CoverSlide() {
  return (
    <Frame frameKey="cover" role="canvas.slide">
      <div className="page-frame">Folder slide body</div>
    </Frame>
  );
}
`,
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    assert.ok(result);
    assert.equal(result.presses.length, 1);
    assert.equal(result.presses[0].slug, "slide");
    assert.equal(result.presses[0].pressType, "slides");
    assert.equal(result.presses[0].pageCount, 1);
    assert.equal(result.presses[0].readerDocument.meta.title, "Folder Slide");
    assert.equal(result.presses[0].readerDocument.theme.pagePreset, "slide-16-9");
    assert.equal(result.presses[0].readerDocument.blocks[0].title, "cover");
    assert.equal(result.presses[0].readerDocument.blocks[0].source.path, "press/slide/press.tsx");
    assert.match(result.presses[0].readerDocument.blocks[0].html, /Folder slide body/);

    const workspaceManifest = JSON.parse(await fs.readFile(path.join(workspace, "public/openpress/workspace.json"), "utf8"));
    assert.deepEqual(workspaceManifest.presses.map((press) => press.slug), ["slide"]);
    assert.equal(workspaceManifest.presses[0].documentUrl, "/openpress/slide/document.json");
    assert.equal(workspaceManifest.presses[0].thumbnailUrl, "/openpress/slide/thumbnail.png");
  });
});

test("exportReactDocument writes per-Press CSS chunks for multi-Press workspaces", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeFile(
      path.join(workspace, "press/report/press.tsx"),
      `import { Frame, Press } from "@open-press/core";

export default function ReportPress() {
  return (
    <Press slug="report" title="Report" page="a4" componentsDir="./components">
      <Frame frameKey="report-page" role="manuscript.content" className="report-card" data-page-title="Report">
        <p>Report page</p>
      </Frame>
    </Press>
  );
}
`,
    );
    await writeFile(
      path.join(workspace, "press/report/theme/tokens.css"),
      ":root { --fixture-report-only: report; }\n",
    );
    await writeFile(
      path.join(workspace, "press/report/theme/fonts/report-sans.woff2"),
      "report-font",
    );
    await writeFile(
      path.join(workspace, "press/report/components/Card/style.css"),
      ".report-card { color: var(--fixture-report-only); }\n",
    );
    await writeFile(
      path.join(workspace, "press/slide/press.tsx"),
      `import { Press, Slide } from "@open-press/core";

export default function SlidePress() {
  return (
    <Press slug="slide" title="Slide" type="slides" page="slide-16-9" componentsDir="./components">
      <Slide id="cover" />
    </Press>
  );
}
`,
    );
    await writeFile(
      path.join(workspace, "press/slide/slides/cover/slide.tsx"),
      `import { Frame } from "@open-press/core";

export default function CoverSlide() {
  return (
    <Frame frameKey="cover" role="slides.cover" className="slide-card" data-page-title="Slide">
      <p>Slide page</p>
    </Frame>
  );
}
`,
    );
    await writeFile(
      path.join(workspace, "press/slide/theme/tokens.css"),
      ":root { --fixture-slide-only: slide; }\n",
    );
    await writeFile(
      path.join(workspace, "press/slide/theme/fonts/slide-sans.woff2"),
      "slide-font",
    );
    await writeFile(
      path.join(workspace, "press/slide/components/Card/style.css"),
      ".slide-card { color: var(--fixture-slide-only); }\n",
    );

    await exportReactDocument(workspace);

    const globalContentCss = await fs.readFile(path.join(workspace, "public/openpress/content.css"), "utf8");
    const reportContentCss = await fs.readFile(path.join(workspace, "public/openpress/report/content.css"), "utf8");
    const reportComponentsCss = await fs.readFile(path.join(workspace, "public/openpress/report/components.css"), "utf8");
    const slideContentCss = await fs.readFile(path.join(workspace, "public/openpress/slide/content.css"), "utf8");
    const slideComponentsCss = await fs.readFile(path.join(workspace, "public/openpress/slide/components.css"), "utf8");
    const reportFont = await fs.readFile(path.join(workspace, "public/openpress/fonts/report-sans.woff2"), "utf8");
    const slideFont = await fs.readFile(path.join(workspace, "public/openpress/fonts/slide-sans.woff2"), "utf8");
    const reportDocument = JSON.parse(await fs.readFile(path.join(workspace, "public/openpress/report/document.json"), "utf8"));
    const slideDocument = JSON.parse(await fs.readFile(path.join(workspace, "public/openpress/slide/document.json"), "utf8"));

    assert.match(globalContentCss, /framework\/openpress\/page-contract\.css/);
    assert.doesNotMatch(globalContentCss, /--fixture-report-only/);
    assert.doesNotMatch(globalContentCss, /--fixture-slide-only/);
    assert.match(reportContentCss, /report\/theme\/tokens\.css/);
    assert.match(reportContentCss, /--fixture-report-only/);
    assert.doesNotMatch(reportContentCss, /--fixture-slide-only/);
    assert.match(reportComponentsCss, /report\/components\/Card\/style\.css/);
    assert.doesNotMatch(reportComponentsCss, /slide-card/);
    assert.match(slideContentCss, /slide\/theme\/tokens\.css/);
    assert.match(slideContentCss, /--fixture-slide-only/);
    assert.doesNotMatch(slideContentCss, /--fixture-report-only/);
    assert.match(slideComponentsCss, /slide\/components\/Card\/style\.css/);
    assert.doesNotMatch(slideComponentsCss, /report-card/);
    assert.equal(reportFont, "report-font");
    assert.equal(slideFont, "slide-font");
    assert.deepEqual(reportDocument.source.styles.filter((style) => style.kind === "press-css").map((style) => style.href), [
      "/openpress/report/content.css",
      "/openpress/report/components.css",
    ]);
    assert.deepEqual(slideDocument.source.styles.filter((style) => style.kind === "press-css").map((style) => style.href), [
      "/openpress/slide/content.css",
      "/openpress/slide/components.css",
    ]);
  });
});

test("exportReactDocument omits skipped folder slides from presentation blocks", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/slide/press.tsx"),
      `import { Press, Slide } from "@open-press/core";

export default function SlidePress() {
  return (
    <Press slug="slide" title="Skipped Slide Deck" type="slides" page="slide-16-9">
      <Slide id="cover" />
      <Slide id="draft" skip />
    </Press>
  );
}
`,
    );
    await writeFile(
      path.join(workspace, "press/slide/slides/cover/slide.tsx"),
      `import { Frame } from "@open-press/core";

export default function CoverSlide() {
  return <Frame frameKey="cover" role="canvas.slide">Visible</Frame>;
}
`,
    );
    await writeFile(
      path.join(workspace, "press/slide/slides/draft/slide.tsx"),
      `import { Frame } from "@open-press/core";

export default function DraftSlide() {
  return <Frame frameKey="draft" role="canvas.slide">Skipped</Frame>;
}
`,
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    assert.deepEqual(documentJson.blocks.map((block) => block.frameKey), ["cover"]);
    assert.deepEqual(documentJson.source.slides, [
      { id: "cover", skip: false },
      { id: "draft", skip: true },
    ]);
  });
});

test("exportReactDocument exposes slide notes as workbench-only source metadata", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/slide/press.tsx"),
      `import { Press, Slide } from "@open-press/core";

export default function SlidePress() {
  return (
    <Press slug="slide" title="Slide Notes Deck" type="slides" page="slide-16-9">
      <Slide id="cover" />
    </Press>
  );
}
`,
    );
    await writeFile(
      path.join(workspace, "press/slide/slides/cover/slide.tsx"),
      `import { Frame } from "@open-press/core";

export const notes = \`
speaker only note
\`;

export default function CoverSlide() {
  return <Frame frameKey="cover" role="canvas.slide">Visible</Frame>;
}
`,
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    assert.deepEqual(documentJson.source.slides, [
      { id: "cover", skip: false, notes: "speaker only note" },
    ]);
    assert.doesNotMatch(documentJson.blocks[0].html, /speaker only note/);
  });
});

test("exportReactDocument resolves PageFolio placeholders after final frame order", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/report/press.tsx"),
      `import { Press, Slide } from "@open-press/core";

export default function Slides() {
  return (
    <Press slug="report" title="Folio Slides" type="slides" page="slide-16-9">
      <Slide id="slide-01" />
      <Slide id="slide-02" />
    </Press>
  );
}
`,
    );
    for (const id of ["slide-01", "slide-02"]) {
      await writeFile(
        path.join(workspace, "press/report/slides", id, "slide.tsx"),
        `import { Frame, PageFolio } from "@open-press/core";

export default function FolioSlide() {
  return (
    <Frame frameKey="${id}" role="canvas.slide" chrome={false}>
      <footer>
        <PageFolio variant="slash" currentFormat="2-digit" totalFormat="2-digit" />
        <PageFolio variant="prefix" prefix="p " />
      </footer>
    </Frame>
  );
}
`,
      );
    }

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    assert.equal(documentJson.blocks.length, 2);
    assert.match(documentJson.blocks[0].html, />01<\/span><span class="openpress-page-folio__separator"[^>]*>\/<\/span><span class="openpress-page-folio__total"[^>]*>02</);
    assert.match(documentJson.blocks[0].html, />p <\/span><span class="openpress-page-folio__current"[^>]*>1</);
    assert.match(documentJson.blocks[1].html, />02<\/span><span class="openpress-page-folio__separator"[^>]*>\/<\/span><span class="openpress-page-folio__total"[^>]*>02</);
    assert.match(documentJson.blocks[1].html, />p <\/span><span class="openpress-page-folio__current"[^>]*>2</);
  });
});

test("default Sections footers use global document folios instead of section-local page indexes", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/report/press.tsx"),
      `import { Frame, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections } from "@open-press/core/manuscript";

export default function Report() {
  return (
    <Press slug="report" title="Global Folio Report" sources={[mdxSource({ id: "story", preset: "section-folders", root: "report/chapters" })]}>
      <Frame frameKey="cover" role="manuscript.cover">Cover</Frame>
      <Sections source="story" />
    </Press>
  );
}
`,
    );
    await writeFile(
      path.join(workspace, "press/report/chapters/01-first/content/01-first.mdx"),
      "## First section\n\nFirst section body.\n",
    );
    await writeFile(
      path.join(workspace, "press/report/chapters/02-second/content/01-second.mdx"),
      "## Second section\n\nSecond section body.\n",
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const contentBlocks = documentJson.blocks.filter((block) => block.role === "manuscript.content");

    assert.equal(contentBlocks.length, 2);
    for (const block of contentBlocks) {
      assert.match(
        block.html,
        new RegExp(`data-openpress-page-folio-current="true"[^>]*>${block.pageNumber}<\\/span>`),
      );
      assert.match(
        block.html,
        new RegExp(`data-openpress-page-folio-total="true"[^>]*>${documentJson.blocks.length}<\\/span>`),
      );
    }
  });
});

test("exportReactDocument emits configured page geometry in document theme", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/report/press.tsx"),
      pressFixtureWith({ pressProps: ' page="slide-16-9"' }),
    );
    await writeFile(
      path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx"),
      "## Intro\n\nSlide geometry.\n",
    );

    const result = await exportReactDocument(workspace);

    assert.equal(result.document.theme.pagePreset, "slide-16-9");
    assert.equal(result.document.theme.pageLabel, "Slide 16:9");
    assert.equal(result.document.theme.pageWidth, "1920px");
    assert.equal(result.document.theme.pageHeight, "1080px");
    assert.equal(result.document.theme.pageAspectRatio, "1920 / 1080");
    assert.equal(result.document.theme.pageHeightRatio, "0.5625");
  });
});

test("exportReactDocument emits inline document theme from Press theme object", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/report/press.tsx"),
      `import { Frame, Press } from "@open-press/core";
import { defineDocumentTheme } from "@open-press/core/theme";

const documentTheme = defineDocumentTheme({
  name: "Report Theme",
  colors: {
    accent: "#004e89",
  },
  typography: {
    body: { font: "sans", size: 16, lineHeight: 1.7, color: "ink" },
  },
});

export default function Report() {
  return (
    <Press slug="report" title="Inline Theme" page="a4" theme={documentTheme}>
      <Frame frameKey="cover">Cover</Frame>
    </Press>
  );
}
`,
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));

    assert.equal(documentJson.theme.name, "Report Theme");
    assert.equal(documentJson.theme.profile, "document");
    assert.equal(documentJson.theme.pagePreset, "a4");
    assert.equal(documentJson.theme.cssVars["--op-theme-color-accent"], "#004e89");
    assert.equal(documentJson.theme.cssVars["--op-theme-type-body-font-size"], "16px");
  });
});

test("exportReactDocument preserves inline slide theme through marker-only slide generation", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/slide/press.tsx"),
      `import { Press, Slide } from "@open-press/core";
import { defineSlideTheme } from "@open-press/core/theme";

const slideTheme = defineSlideTheme({
  name: "Deck Theme",
  colors: {
    bg: "#101014",
    accent: "#ff3300",
  },
});

export default function Deck() {
  return (
    <Press slug="slide" title="Inline Slide Theme" type="slides" page="slide-16-9" theme={slideTheme}>
      <Slide id="cover" />
    </Press>
  );
}
`,
    );
    await writeFile(
      path.join(workspace, "press/slide/slides/cover/slide.tsx"),
      `import { Slide } from "@open-press/core";

export default function CoverSlide() {
  return <Slide id="cover"><h1>Cover</h1></Slide>;
}
`,
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));

    assert.equal(documentJson.meta.type, "slides");
    assert.equal(documentJson.theme.name, "Deck Theme");
    assert.equal(documentJson.theme.profile, "slide");
    assert.equal(documentJson.theme.pagePreset, "slide-16-9");
    assert.equal(documentJson.theme.cssVars["--op-theme-color-bg"], "#101014");
    assert.equal(documentJson.theme.cssVars["--op-theme-color-accent"], "#ff3300");
  });
});

test("exportReactDocument rejects inline theme profile mismatches", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/slide/press.tsx"),
      `import { Press, Slide } from "@open-press/core";
import { defineDocumentTheme } from "@open-press/core/theme";

const documentTheme = defineDocumentTheme({ name: "Wrong Theme" });

export default function Deck() {
  return (
    <Press slug="slide" title="Wrong Theme" type="slides" page="slide-16-9" theme={documentTheme}>
      <Slide id="cover" />
    </Press>
  );
}
`,
    );
    await writeFile(
      path.join(workspace, "press/slide/slides/cover/slide.tsx"),
      `import { Slide } from "@open-press/core";

export default function CoverSlide() {
  return <Slide id="cover"><h1>Cover</h1></Slide>;
}
`,
    );

    await assert.rejects(
      () => exportReactDocument(workspace, { syncAssets: false }),
      /received a document theme/i,
    );
  });
});

test("measurement css uses configured page geometry after theme tokens", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    const config = normalizeConfig(workspace, {
      page: "slide-16-9",
    });

    const css = await buildReactMeasurementCss(workspace, config, {});
    const tokenIndex = css.indexOf("/* === theme/tokens.css === */");
    const geometryIndex = css.indexOf("/* === openpress page geometry === */");

    assert.ok(tokenIndex >= 0, "expected theme tokens in measurement css");
    assert.ok(geometryIndex > tokenIndex, "configured geometry should override token defaults");
    assert.match(css, /--openpress-page-width:\s*1920px;/);
    assert.match(css, /--openpress-page-height:\s*1080px;/);
    assert.match(css, /--openpress-page-height-ratio:\s*0\.5625;/);
  });
});

test("measurement css includes inline Press theme before page geometry", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    const config = normalizeConfig(workspace, {
      page: "slide-16-9",
    });

    const css = await buildReactMeasurementCss(workspace, config, {}, {
      theme: {
        cssVars: {
          "--op-theme-type-body-font-size": "24px",
        },
      },
    });
    const themeIndex = css.indexOf("/* === openpress defined theme === */");
    const geometryIndex = css.indexOf("/* === openpress page geometry === */");

    assert.ok(themeIndex >= 0, "expected inline theme vars in measurement css");
    assert.ok(geometryIndex > themeIndex, "page geometry should remain after inline theme vars");
    assert.match(css, /--op-theme-type-body-font-size:\s*24px;/);
  });
});

test("exportReactDocument numbers table and figure captions with English defaults", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(path.join(workspace, "press/report/press.tsx"), PRESS_FIXTURE);
    await writeFile(
      path.join(workspace, "press/report/components/FigureDemo/index.tsx"),
      [
        "export default function FigureDemo() {",
        "  return <figure><div>Diagram</div><figcaption>Workflow overview</figcaption></figure>;",
        "}",
      ].join("\n"),
    );
    await writeFile(
      path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx"),
      [
        "## Introduction",
        "",
        "<FigureDemo />",
        "",
        "<TableCaption>Supported targets</TableCaption>",
        "",
        "| Target | Kind |",
        "| --- | --- |",
        "| Reader | Web |",
      ].join("\n"),
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const contentHtml = documentJson.blocks
      .filter((block) => block.role === "manuscript.content")
      .map((block) => block.html)
      .join("\n");

    assert.match(contentHtml, /<figcaption><span[^>]+data-openpress-caption-label="figure"[^>]*>Figure 1<\/span> Workflow overview<\/figcaption>/);
    assert.match(contentHtml, /<caption[^>]*data-openpress-block-id="b-intro-01-start-2-caption"[^>]*><span[^>]+data-openpress-caption-label="table"[^>]*>Table 1<\/span> Supported targets<\/caption>/);
    assert.deepEqual(documentJson.indexes.captions, [
      {
        id: "figure-1",
        kind: "figure",
        number: 1,
        label: "Figure 1",
        title: "Workflow overview",
        pageIndex: 2,
      },
      {
        id: "table-1",
        kind: "table",
        number: 1,
        label: "Table 1",
        title: "Supported targets",
        pageIndex: 2,
      },
    ]);
  });
});

test("exportReactDocument retains table captions and directory entries after a table continuation", async (t) => {
  await withTempWorkspace(async (workspace) => {
    await writePageShellTokens(workspace, [
      "--page-margin-top: 0px;",
      "--page-margin-right: 0px;",
      "--page-margin-bottom: 0px;",
      "--page-margin-left: 0px;",
      "--page-header-height: 0px;",
      "--page-footer-height: 0px;",
      "--page-frame-gap: 0px;",
    ]);
    await writeFile(
      path.join(workspace, "openpress/settings.json"),
      JSON.stringify({ version: 1, page: { id: "caption-pagination", width: "794px", height: "500px" } }),
    );
    await writeFile(path.join(workspace, "press/report/press.tsx"), `
import { Frame, MdxArea, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections } from "@open-press/core/manuscript";
function Page({ frameKey, chainId }) {
  return <Frame frameKey={frameKey} role="manuscript.content" chrome={false}>
    <MdxArea chainId={chainId} style={{ height: "400px", width: "700px" }} />
  </Frame>;
}
export default function CaptionPagination() {
  return <Press slug="report" title="Caption pagination" sources={[mdxSource({ id: "story", preset: "section-folders", root: "report/chapters" })]}>
    <Sections source="story" page={Page} />
  </Press>;
}
`);
    await writeFile(path.join(workspace, "press/report/theme/pagination-fixture.css"), [
      "[data-openpress-block-id], table, tr, td, th, caption { box-sizing: border-box; margin: 0 !important; padding: 0 !important; font-size: 14px !important; line-height: 20px !important; }",
      "table { border-collapse: collapse; }",
      "tbody tr { height: 80px !important; }",
      "thead tr { height: 40px !important; }",
      "caption, p { height: 20px !important; }",
    ].join("\n"));
    const sourcePath = "report/chapters/01-intro/content/01-start.mdx";
    await writeFile(path.join(workspace, "press", sourcePath), "Caption pagination fixture.\n");

    for (const scenario of [
      { name: "both tables fit on one page", rows: 1, columns: 2, pageBreak: false, pages: 1, secondPage: 0 },
      { name: "same columns after a continuation", rows: 5, columns: 2, pageBreak: false, pages: 2, secondPage: 1 },
      { name: "different columns after a continuation", rows: 5, columns: 3, pageBreak: false, pages: 2, secondPage: 1 },
      { name: "explicit break before the second table", rows: 5, columns: 2, pageBreak: true, pages: 3, secondPage: 2 },
    ]) {
      await t.test(scenario.name, async () => {
        const source = [
          "<TableCaption>Scale table</TableCaption>", "",
          "| A | B |", "| --- | --- |",
          ...Array.from({ length: scenario.rows }, (_, i) => `| ${i + 1} | value |`),
          "", "A paragraph between the tables.", "",
          ...(scenario.pageBreak ? ["<PageBreak />", ""] : []),
          "<TableCaption>Question examples</TableCaption>", "",
          scenario.columns === 2 ? "| C | D |" : "| C | D | E |",
          scenario.columns === 2 ? "| --- | --- |" : "| --- | --- | --- |",
          scenario.columns === 2 ? "| question | answer |" : "| question | answer | extra |",
        ].join("\n");
        const { document } = await exportReactDocument(workspace, {
          syncAssets: false,
          writeOutput: false,
          sourceTextOverrides: { [sourcePath]: source },
        });
        assert.equal(document.blocks.length, scenario.pages);
        if (scenario.rows === 5 && !scenario.pageBreak) {
          const tables = [...document.blocks[1].html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/g)].map(([html]) => html);
          assert.equal(tables.length, 2, "the continuation and second table must share a page");
          assert.doesNotMatch(tables[0], /<caption\b/, "the continuation must have no caption");
          assert.match(tables[1], /<caption\b[^>]*>[\s\S]*?Question examples<\/caption>/);
        }
        assert.deepEqual(document.indexes.captions, [
          { id: "table-1", kind: "table", number: 1, label: "Table 1", title: "Scale table", pageIndex: 0 },
          { id: "table-2", kind: "table", number: 2, label: "Table 2", title: "Question examples", pageIndex: scenario.secondPage },
        ]);
      });
    }
  });
});

test("exportReactDocument supports localized caption labels from config", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/report/press.tsx"),
      pressFixtureWith({ pressProps: ' captionNumbering={{ figure: "圖", table: "表" }}' }),
    );
    await writeFile(
      path.join(workspace, "press/report/components/FigureDemo/index.tsx"),
      [
        "export default function FigureDemo() {",
        "  return <figure><div>Diagram</div><figcaption>流程總覽</figcaption></figure>;",
        "}",
      ].join("\n"),
    );
    await writeFile(
      path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx"),
      [
        "## Introduction",
        "",
        "<FigureDemo />",
        "",
        "<TableCaption>支援輸出</TableCaption>",
        "",
        "| 輸出 | 類型 |",
        "| --- | --- |",
        "| Reader | Web |",
      ].join("\n"),
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const contentHtml = documentJson.blocks
      .filter((block) => block.role === "manuscript.content")
      .map((block) => block.html)
      .join("\n");

    assert.match(contentHtml, /<figcaption><span[^>]+data-openpress-caption-label="figure"[^>]*>圖 1<\/span> 流程總覽<\/figcaption>/);
    assert.match(contentHtml, /<caption[^>]*data-openpress-block-id="b-intro-01-start-2-caption"[^>]*><span[^>]+data-openpress-caption-label="table"[^>]*>表 1<\/span> 支援輸出<\/caption>/);
    assert.deepEqual(documentJson.indexes.captions.map(({ label, title }) => ({ label, title })), [
      { label: "圖 1", title: "流程總覽" },
      { label: "表 1", title: "支援輸出" },
    ]);
  });
});

test("exportReactDocument resolves semantic figure and table references before delivery", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/report/press.tsx"),
      pressFixtureWith({ pressProps: ' captionNumbering={{ figure: "圖", table: "表" }}' }),
    );
    await writeFile(
      path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx"),
      [
        "## Introduction",
        "",
        "@fig-workflow 顯示流程，結果整理於 @tbl-targets；下一章另見 @fig-summary 與 @tbl-metrics。",
        "",
        '<figure id="fig-workflow">',
        "  <div>Diagram</div>",
        "  <figcaption>流程總覽</figcaption>",
        "</figure>",
        "",
        '<TableCaption id="tbl-targets">支援輸出</TableCaption>',
        "",
        "| 輸出 | 類型 |",
        "| --- | --- |",
        "| Reader | Web |",
      ].join("\n"),
    );
    await writeFile(
      path.join(workspace, "press/report/chapters/02-results/content/01-summary.mdx"),
      [
        "## Results",
        "",
        '<figure id="fig-summary">',
        "  <div>Summary</div>",
        "  <figcaption>結果摘要</figcaption>",
        "</figure>",
        "",
        '<TableCaption id="tbl-metrics">品質指標</TableCaption>',
        "",
        "| 指標 | 數值 |",
        "| --- | --- |",
        "| Quality | 98 |",
        "",
        "回看 @tbl-targets 與 @fig-workflow；再次引用 @fig-workflow。",
      ].join("\n"),
    );

    const { document } = await exportReactDocument(workspace, { syncAssets: false, writeOutput: false });
    const contentHtml = document.blocks
      .filter((block) => block.role === "manuscript.content")
      .map((block) => block.html)
      .join("\n");

    assert.match(contentHtml, /<a href="#fig-workflow" class="openpress-cross-reference" data-openpress-cross-reference="fig-workflow">圖 1<\/a>/);
    assert.match(contentHtml, /<a href="#tbl-targets" class="openpress-cross-reference" data-openpress-cross-reference="tbl-targets">表 1<\/a>/);
    assert.match(contentHtml, /<a href="#fig-summary" class="openpress-cross-reference" data-openpress-cross-reference="fig-summary">圖 2<\/a>/);
    assert.match(contentHtml, /<a href="#tbl-metrics" class="openpress-cross-reference" data-openpress-cross-reference="tbl-metrics">表 2<\/a>/);
    assert.equal(contentHtml.match(/data-openpress-cross-reference="fig-workflow">圖 1<\/a>/g)?.length, 3);
    assert.equal(contentHtml.match(/data-openpress-cross-reference="tbl-targets">表 1<\/a>/g)?.length, 2);
    assert.match(contentHtml, /<figure id="fig-workflow"/);
    assert.match(contentHtml, /<figure id="fig-summary"/);
    assert.match(contentHtml, /<table id="tbl-targets"/);
    assert.match(contentHtml, /<table id="tbl-metrics"/);
    assert.doesNotMatch(contentHtml, /@(?:fig|tbl)-/);
  });
});

test("exportReactDocument keeps short TOC chains in one Toc frame", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(path.join(workspace, "press/report/press.tsx"), PRESS_FIXTURE);
    for (const [dir, title] of [
      ["01-intro", "Introduction"],
      ["02-method", "Method"],
      ["03-results", "Results"],
    ]) {
      await writeFile(
        path.join(workspace, `press/report/chapters/${dir}/content/01-start.mdx`),
        `## ${title}\n\nShort section.\n`,
      );
    }

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const tocFrames = documentJson.source.frames.filter((f) => f.role === "manuscript.toc");

    assert.equal(tocFrames.length, 1);
    assert.deepEqual(tocFrames[0].mdxAreas[0].blockIds, [
      "toc-story-intro",
      "toc-story-method",
      "toc-story-results",
    ]);
  });
});

test("exportReactDocument can render a TOC without h3 entries", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(path.join(workspace, "press/report/press.tsx"), pressFixtureWith({ tocProps: " maxLevel={2}" }));
    await writeFile(
      path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx"),
      [
        "## Real Introduction",
        "",
        "Opening paragraph.",
        "",
        "### Hidden Topic",
        "",
        "Topic paragraph.",
      ].join("\n"),
    );
    await writeFile(
      path.join(workspace, "press/report/chapters/02-method/content/01-start.mdx"),
      "## Methodology\n\nShort section.\n",
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const tocFrame = documentJson.source.frames.find((f) => f.role === "manuscript.toc");
    const tocBlock = documentJson.blocks.find((block) => block.role === "manuscript.toc");

    assert.equal(tocFrame.mdxAreas[0].chainId, "toc:story:h2");
    assert.deepEqual(tocFrame.mdxAreas[0].blockIds, ["toc-story-intro", "toc-story-method"]);
    assert.match(tocBlock.html, /Real Introduction/);
    assert.doesNotMatch(tocBlock.html, /Hidden Topic/);
    assert.doesNotMatch(tocBlock.html, /data-toc-index="1\.1"/);
  });
});

test("exportReactDocument builds TOC titles and heading numbers from MDX headings", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(path.join(workspace, "press/report/press.tsx"), PRESS_FIXTURE);
    await writeFile(
      path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx"),
      [
        "## Real Introduction",
        "",
        "Opening paragraph.",
        "",
        "### First Topic",
        "",
        "Topic paragraph.",
      ].join("\n"),
    );
    await writeFile(
      path.join(workspace, "press/report/chapters/02-method/content/01-start.mdx"),
      "## Methodology\n\nShort section.\n",
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const tocBlock = documentJson.blocks.find((block) => block.role === "manuscript.toc");
    const introHtml = documentJson.blocks
      .filter((block) => block.role === "manuscript.content" && block.frameKey.startsWith("story:intro:content:"))
      .map((block) => block.html)
      .join("\n");

    assert.ok(tocBlock, "should render a TOC frame");
    assert.match(tocBlock.html, /Real Introduction/);
    assert.match(tocBlock.html, /First Topic/);
    assert.match(tocBlock.html, /data-toc-index="01"/);
    assert.match(tocBlock.html, /data-toc-index="1\.1"/);
    assert.doesNotMatch(tocBlock.html, />Intro</);

    assert.ok(introHtml, "should render the intro content frames");
    assert.match(introHtml, /<h2[^>]+id="section-intro"[^>]+data-chapter="01"[^>]*>Real Introduction<\/h2>/);
    assert.match(introHtml, /<h3[^>]+data-section="1\.1"[^>]*>First Topic<\/h3>/);
  });
});

test("exportReactDocument paginates TOC entries with workspace-owned list margin and gap", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/report/theme/toc-pagination-fixture.css"),
      [
        ".reader-page { height: 600px; }",
        ".reader-page--toc .toc-header { display: none; }",
        ".reader-page--toc .openpress-toc-area { height: 552px; }",
        ".toc-list { display: flex; flex-direction: column; gap: 20px; margin: 100px 0 0; padding: 0; list-style: none; }",
        ".toc-list a { display: grid; grid-template-columns: 24px 1fr 32px; }",
        ".toc-list li { box-sizing: border-box; height: 100px; padding: 0; }",
      ].join("\n"),
    );
    await writeFile(path.join(workspace, "press/report/press.tsx"), PRESS_FIXTURE);
    for (const [dir, title] of [
      ["01-one", "One"],
      ["02-two", "Two"],
      ["03-three", "Three"],
      ["04-four", "Four"],
      ["05-five", "Five"],
      ["06-six", "Six"],
    ]) {
      await writeFile(
        path.join(workspace, `press/report/chapters/${dir}/content/01-start.mdx`),
        `## ${title}\n\nShort section.\n`,
      );
    }

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const tocFrames = documentJson.source.frames.filter((f) => f.role === "manuscript.toc");

    assert.equal(tocFrames.length, 2);
    assert.deepEqual(tocFrames.map((frame) => frame.mdxAreas[0].blockIds.length), [3, 3]);
  });
});

test("exportReactDocument uses a 4 percent capacity safety inset", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/report/theme/pagination-fixture.css"),
      [
        "[data-openpress-block-id] { box-sizing: border-box; margin: 0 !important; padding: 0 !important; }",
        "h2[data-openpress-block-id] { height: 100px !important; min-height: 100px !important; }",
        "p[data-openpress-block-id] { height: 880px !important; min-height: 880px !important; }",
      ].join("\n"),
    );
    await writeFile(path.join(workspace, "press/report/press.tsx"), PRESS_FIXTURE);
    await writeFile(
      path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx"),
      "## Intro\n\nThis paragraph should fit with a 4 percent safety inset.\n",
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const contentFrames = documentJson.source.frames.filter((f) => f.frameKey.startsWith("story:intro:content:"));

    assert.equal(contentFrames.length, 1);
    assert.deepEqual(contentFrames[0].mdxAreas[0].blockIds, [
      "b-intro-01-start-0",
      "b-intro-01-start-1",
    ]);
  });
});

test("exportReactDocument keeps headings with the following block when paginating", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/report/theme/pagination-fixture.css"),
      [
        "[data-openpress-block-id] { box-sizing: border-box; margin: 0 !important; padding: 0 !important; }",
        "h2[data-openpress-block-id] { height: 100px !important; min-height: 100px !important; }",
        "h3[data-openpress-block-id] { height: 60px !important; min-height: 60px !important; }",
        "p[data-openpress-block-id] { height: 120px !important; min-height: 120px !important; }",
        'p[data-openpress-block-id="b-intro-01-start-1"] { height: 830px !important; min-height: 830px !important; }',
      ].join("\n"),
    );
    await writeFile(path.join(workspace, "press/report/press.tsx"), PRESS_FIXTURE);
    await writeFile(
      path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx"),
      [
        "## Intro",
        "",
        "Opening paragraph.",
        "",
        "### Must Not Be Isolated",
        "",
        "This paragraph should stay with its heading.",
      ].join("\n"),
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const contentFrames = documentJson.source.frames.filter((f) => f.frameKey.startsWith("story:intro:content:"));

    assert.equal(contentFrames.length, 2);
    assert.deepEqual(contentFrames[0].mdxAreas[0].blockIds, [
      "b-intro-01-start-0",
      "b-intro-01-start-1",
    ]);
    assert.deepEqual(contentFrames[1].mdxAreas[0].blockIds, [
      "b-intro-01-start-2",
      "b-intro-01-start-3",
    ]);
  });
});

test("exportReactDocument starts content after PageBreak on a new frame", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/report/theme/pagination-fixture.css"),
      [
        "[data-openpress-block-id] { box-sizing: border-box; height: 40px !important; margin: 0 !important; padding: 0 !important; }",
      ].join("\n"),
    );
    await writeFile(path.join(workspace, "press/report/press.tsx"), PRESS_FIXTURE);
    await writeFile(
      path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx"),
      [
        "## Before",
        "",
        "This content ends the first page.",
        "",
        "<PageBreak />",
        "",
        "## After",
        "",
        "This content starts the second page.",
      ].join("\n"),
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const contentFrames = documentJson.source.frames.filter((f) => f.frameKey.startsWith("story:intro:content:"));
    const contentHtml = documentJson.blocks
      .filter((block) => block.frameKey?.startsWith("story:intro:content:"))
      .map((block) => block.html)
      .join("\n");

    assert.equal(contentFrames.length, 2);
    assert.deepEqual(contentFrames[0].mdxAreas[0].blockIds, [
      "b-intro-01-start-0",
      "b-intro-01-start-1",
    ]);
    assert.deepEqual(contentFrames[1].mdxAreas[0].blockIds, [
      "b-intro-01-start-2",
      "b-intro-01-start-3",
    ]);
    assert.doesNotMatch(contentHtml, /PageBreak|openpress-page-break/);
  });
});

test("exportReactDocument splits markdown tables by row across content frames", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writePageShellTokens(workspace, [
      "--page-margin-top: 0px;",
      "--page-margin-right: 0px;",
      "--page-margin-bottom: 0px;",
      "--page-margin-left: 0px;",
    ]);
    await writeFile(
      path.join(workspace, "openpress/settings.json"),
      JSON.stringify({ version: 1, page: { id: "fixture-table", width: "794px", height: "650px" } }, null, 2),
    );
    await writeFile(path.join(workspace, "press/report/press.tsx"), PRESS_FIXTURE);
    await writeFile(
      path.join(workspace, "press/report/theme/pagination-fixture.css"),
      [
        "[data-openpress-block-id], table, tr { box-sizing: border-box; margin: 0 !important; padding: 0 !important; }",
        "h2[data-openpress-block-id] { height: 60px !important; min-height: 60px !important; }",
        "thead { height: 40px !important; min-height: 40px !important; }",
        "tr { height: 120px !important; min-height: 120px !important; }",
      ].join("\n"),
    );
    await writeFile(
      path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx"),
      [
        "## Table",
        "",
        "| Name | Value |",
        "| --- | --- |",
        "| Row 1 | A |",
        "| Row 2 | B |",
        "| Row 3 | C |",
        "| Row 4 | D |",
        "| Row 5 | E |",
      ].join("\n"),
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const contentFrames = documentJson.source.frames.filter((f) => f.frameKey.startsWith("story:intro:content:"));
    const pageHtml = documentJson.blocks
      .filter((block) => block.frameKey?.startsWith("story:intro:content:"))
      .map((block) => block.html);

    assert.equal(contentFrames.length, 3);
    assert.deepEqual(contentFrames[0].mdxAreas[0].blockIds, [
      "b-intro-01-start-0",
    ]);
    assert.deepEqual(contentFrames[1].mdxAreas[0].blockIds, [
      "b-intro-01-start-1-r0",
      "b-intro-01-start-1-r1",
      "b-intro-01-start-1-r2",
    ]);
    assert.deepEqual(contentFrames[2].mdxAreas[0].blockIds, [
      "b-intro-01-start-1-r3",
      "b-intro-01-start-1-r4",
    ]);
    assert.doesNotMatch(pageHtml[0], /Row 1/);
    assert.match(pageHtml[1], /<thead>/);
    assert.match(pageHtml[1], /Row 1/);
    assert.match(pageHtml[1], /Row 2/);
    assert.match(pageHtml[1], /Row 3/);
    assert.doesNotMatch(pageHtml[2], /<thead>/);
    assert.match(pageHtml[2], /Row 4/);
    assert.match(pageHtml[2], /Row 5/);
  });
});

test("exportReactDocument avoids starting a table when the first rows would be orphaned", async () => {
  await withTempWorkspace(async (workspace) => {
    await writePageShellTokens(workspace, [
      "--page-margin-top: 0px;",
      "--page-margin-right: 0px;",
      "--page-margin-bottom: 0px;",
      "--page-margin-left: 0px;",
      "--page-header-height: 0px;",
      "--page-footer-height: 0px;",
      "--page-frame-gap: 0px;",
    ]);
    await writeFile(
      path.join(workspace, "openpress/settings.json"),
      JSON.stringify({ version: 1, page: { id: "fixture-table-start", width: "794px", height: "300px" } }, null, 2),
    );
    await writeFile(path.join(workspace, "press/report/press.tsx"), PRESS_FIXTURE);
    await writeFile(
      path.join(workspace, "press/report/theme/pagination-fixture.css"),
      [
        "[data-openpress-block-id], table, tr { box-sizing: border-box; margin: 0 !important; padding: 0 !important; }",
        "p[data-openpress-block-id] { height: 140px !important; min-height: 140px !important; }",
        "thead { height: 60px !important; min-height: 60px !important; }",
        "tr { height: 40px !important; min-height: 40px !important; }",
      ].join("\n"),
    );
    await writeFile(
      path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx"),
      [
        "Lead paragraph before the table.",
        "",
        "| Name | Value |",
        "| --- | --- |",
        "| Row 1 | A |",
        "| Row 2 | B |",
        "| Row 3 | C |",
      ].join("\n"),
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const contentFrames = documentJson.source.frames.filter((f) => f.frameKey.startsWith("story:intro:content:"));

    assert.equal(contentFrames.length, 2);
    assert.deepEqual(contentFrames[0].mdxAreas[0].blockIds, [
      "b-intro-01-start-0",
    ]);
    assert.deepEqual(contentFrames[1].mdxAreas[0].blockIds, [
      "b-intro-01-start-1-r0",
      "b-intro-01-start-1-r1",
      "b-intro-01-start-1-r2",
    ]);
  });
});

test("exportDocument delegates to React export when press/report/press.tsx is present", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(path.join(workspace, "press/report/press.tsx"), PRESS_FIXTURE);
    await writeFile(
      path.join(workspace, "press/report/chapters/01-intro/content/01-intro.mdx"),
      "## Intro\n\nFirst paragraph.\n",
    );

    const result = await exportDocument(workspace);
    assert.ok(result);
    assert.ok(result.documentPath.endsWith("document.json"));
  });
});

test("exportReactDocument rejects source roots that escape document root", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/report/press.tsx"),
      `import { Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";

export default function EscapingPress() {
  return (
    <Press
      slug="report"
      title="Escaping Source"
      sources={[mdxSource({ id: "story", preset: "section-files", root: "../outside" })]}
    />
  );
}
`,
    );
    await writeFile(path.join(workspace, "outside/01-leak.mdx"), "## Outside\n");

    await assert.rejects(
      () => exportReactDocument(workspace, { syncAssets: false }),
      /document root|contains "\.\."/i,
    );
  });
});

test("exportReactDocument rejects Frames without frameKey", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "press/report/press.tsx"),
      `import { Frame, Press } from "@open-press/core";

export const config = {
  title: "Missing Frame Key",
  publicDir: "public/openpress",
  outputDir: "dist",
};

export default function MissingFrameKeyPress() {
  return (
    <Press slug="report" title="Missing Frame Key">
      <Frame role="manuscript.cover">Cover</Frame>
    </Press>
  );
}
`,
    );

    await assert.rejects(
      () => exportReactDocument(workspace, { syncAssets: false }),
      /frameKey/i,
    );
  });
});

test("core exports Slide marker runtime", async () => {
  await withTempWorkspace(async (workspace) => {
    const server = await createReactSsrServer(workspace);
    try {
      const core = await server.ssrLoadModule(CORE_ENTRY);
      assert.equal(typeof core.Slide, "function");
      assert.equal(core.Slide.openpressMarker, core.SLIDE_MARKER);
    } finally {
      await server.close();
    }
  });
});
