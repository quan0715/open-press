import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { pathIsEmpty } from "./path-is-empty.js";

export interface InitOptions {
  target: string;
  title: string | undefined;
  type: "pages" | "slides" | undefined;
  git: boolean;
  install: boolean;
  skills: boolean;
}

const FRAMEWORK_SKILLS_SOURCE = "quan0715/open-press";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PACKAGE_JSON = path.resolve(__dirname, "..", "package.json");

export async function init(options: InitOptions): Promise<void> {
  const target = path.resolve(process.cwd(), options.target);
  await ensureTarget(target);

  const workspaceName = path.basename(target);
  const title = options.title ?? "OpenPress Document";
  const version = await readCliVersion();

  log(`Creating open-press workspace at ${target}`);

  if (!options.type) {
    throw new Error("open-press init requires --type pages or --type slides.");
  }
  await writeWorkspacePackageJson(target, workspaceName, version);
  await writeWorkspaceGitignore(target);
  await writeTypedStarterPress(target, { pressName: workspaceName, title, type: options.type });

  if (options.skills) {
    log(`Installing framework skills via \`open-press skills add\`…`);
    try {
      await runInTarget(target, "npx", ["-y", "skills@latest", "add", FRAMEWORK_SKILLS_SOURCE]);
    } catch (err) {
      log(`(framework skills install failed; retry later: open-press skills add)`);
      log(`  reason: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    log("Skipping agent skills (--no-skills)");
  }

  if (options.install) {
    log("Installing dependencies (npm install)…");
    await runInTarget(target, "npm", ["install"]);
  } else {
    log("Skipping npm install (--no-install)");
  }

  if (options.git) {
    log("Initializing git repository…");
    try {
      await runInTarget(target, "git", ["init"]);
      await runInTarget(target, "git", ["add", "-A"]);
      await runInTarget(target, "git", ["commit", "-m", "Initial commit from open-press"], { silent: true });
    } catch {
      log("(git not available; skipping repo init)");
    }
  } else {
    log("Skipping git init (--no-git)");
  }

  printNextSteps(target, options);
}

async function ensureTarget(target: string): Promise<void> {
  if (existsSync(target)) {
    const empty = await pathIsEmpty(target, { ignoreHarmless: true });
    if (!empty) {
      throw new Error(
        `Target ${target} is not empty. Remove existing files first, or scaffold into a different directory.`,
      );
    }
    return;
  }
  await mkdir(target, { recursive: true });
}

async function readCliVersion(): Promise<string> {
  const pkg = JSON.parse(await readFile(CLI_PACKAGE_JSON, "utf8")) as { version?: string };
  return typeof pkg.version === "string" && pkg.version ? pkg.version : "latest";
}

async function writeWorkspacePackageJson(target: string, workspaceName: string, version: string): Promise<void> {
  const pkg = {
    name: workspaceName,
    version: "0.0.0",
    private: true,
    type: "module",
    description: `open-press workspace: ${workspaceName}`,
    scripts: {
      dev: "open-press dev . --renderer react",
      build: "open-press render . --renderer react",
      preview: "open-press preview . --renderer react",
      typecheck: "open-press typecheck .",
      "openpress:image": "open-press image .",
      "openpress:pdf": "open-press pdf .",
      "openpress:deploy": "open-press deploy .",
      "openpress:deploy:dry-run": "open-press deploy . --confirm --dry-run",
      "openpress:skills": "open-press skills update",
    },
    dependencies: {
      "@open-press/core": version,
    },
    devDependencies: {
      "@open-press/cli": version,
      "@types/node": "^25.8.0",
      "@types/react": "^19.2.14",
      "@types/react-dom": "^19.2.3",
      typescript: "^6.0.3",
    },
    openpress: {
      pdf: {
        filename: "document.pdf",
      },
      deploy: {
        adapter: "cloudflare-pages",
        source: ".deploy/openpress",
        projectName: null,
        commitDirty: false,
        requiresConfirmation: true,
      },
    },
  };

  await writeFile(path.join(target, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

async function writeWorkspaceGitignore(target: string): Promise<void> {
  const content = [
    "node_modules/",
    ".DS_Store",
    "*.log",
    "",
    "# OpenPress generated artifacts",
    ".openpress/",
    ".deploy/",
    ".turbo/",
    "dist/",
    "dist-react/",
    "public/openpress/",
    "output/",
    "",
  ].join("\n");
  await writeFile(path.join(target, ".gitignore"), content, "utf8");
}

async function writeTypedStarterPress(
  target: string,
  options: { pressName: string; title: string; type: "pages" | "slides" },
): Promise<void> {
  const folder = folderNameFromPressName(options.pressName);
  const title = options.title;
  const pressRoot = path.join(target, "press");
  const sharedRoot = path.join(pressRoot, "shared");
  const typedRoot = path.join(pressRoot, folder);

  await writeWorkspaceThemeSkeleton(sharedRoot);
  await mkdir(path.join(sharedRoot, "media"), { recursive: true });
  await mkdir(path.join(typedRoot, "components"), { recursive: true });
  await mkdir(path.join(typedRoot, "theme"), { recursive: true });
  await mkdir(path.join(typedRoot, "media"), { recursive: true });
  await writeFile(path.join(pressRoot, "design.md"), `# ${title}\n\nStarter OpenPress ${options.type} workspace.\n`, "utf8");
  await writeFile(path.join(sharedRoot, "media", "README.md"), "# Shared Media\n\nPlace workspace-wide media here.\n", "utf8");
  await writeFile(path.join(typedRoot, "media", "README.md"), "# Media\n\nPlace Press-specific media here.\n", "utf8");

  if (options.type === "pages") {
    await writePagesPress(typedRoot, { folder, title });
  } else {
    await writeSlidesPress(typedRoot, { folder, title });
  }
}

async function writeWorkspaceThemeSkeleton(pressRoot: string): Promise<void> {
  await mkdir(path.join(pressRoot, "theme", "base"), { recursive: true });
  await mkdir(path.join(pressRoot, "theme", "page-surfaces"), { recursive: true });
  await mkdir(path.join(pressRoot, "theme", "shell"), { recursive: true });
  await writeFile(
    path.join(pressRoot, "theme", "tokens.css"),
    `:root {
  --openpress-font-body: system-ui, sans-serif;
  --openpress-font-serif: Georgia, serif;
}
`,
    "utf8",
  );
  await writeFile(
    path.join(pressRoot, "theme", "base", "page-contract.css"),
    `* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  background: #181818;
}

body {
  color: #171717;
  font-family: var(--openpress-font-body, system-ui, sans-serif);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.reader-page {
  background: #ffffff;
}
`,
    "utf8",
  );
  await writeFile(
    path.join(pressRoot, "theme", "base", "typography.css"),
    `h1,
h2,
h3,
p {
  margin: 0;
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
`,
    "utf8",
  );
  await writeFile(
    path.join(pressRoot, "theme", "base", "print.css"),
    `@media print {
  html,
  body {
    background: #ffffff;
  }
}
`,
    "utf8",
  );
  await writeFile(path.join(pressRoot, "theme", "page-surfaces", "cover.css"), "/* Starter cover surface. */\n", "utf8");
  await writeFile(path.join(pressRoot, "theme", "page-surfaces", "back-cover.css"), "/* Starter back-cover surface. */\n", "utf8");
  await writeFile(path.join(pressRoot, "theme", "page-surfaces", "toc.css"), "/* Starter TOC surface. */\n", "utf8");
  await writeFile(path.join(pressRoot, "theme", "shell", "reader-controls.css"), "/* Starter reader controls surface. */\n", "utf8");
}

async function writePagesPress(typedRoot: string, { folder, title }: { folder: string; title: string }): Promise<void> {
  await mkdir(path.join(typedRoot, "chapters", "01-intro", "content"), { recursive: true });
  await writeFile(
    path.join(typedRoot, "press.tsx"),
    `import { Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, Toc } from "@open-press/core/manuscript";

export default function ${componentNameFromFolder(folder)}Press() {
  return (
    <Press
      slug="${escapeJsxAttribute(folder)}"
      title="${escapeJsxAttribute(title)}"
      type="pages"
      page="a4"
      componentsDir="./components"
      mediaDir="./media"
      sources={[mdxSource({ id: "${escapeJsxAttribute(folder)}", preset: "section-folders", root: "${escapeJsxAttribute(folder)}/chapters" })]}
    >
      <Toc source="${escapeJsxAttribute(folder)}" maxLevel={2} />
      <Sections source="${escapeJsxAttribute(folder)}" />
    </Press>
  );
}
`,
    "utf8",
  );
  await writeFile(
    path.join(typedRoot, "chapters", "01-intro", "content", "01-intro.mdx"),
    `# ${escapeText(title)}

Start writing this OpenPress document here.
`,
    "utf8",
  );
}

async function writeSlidesPress(typedRoot: string, { folder, title }: { folder: string; title: string }): Promise<void> {
  await mkdir(path.join(typedRoot, "ui"), { recursive: true });
  await mkdir(path.join(typedRoot, "layouts"), { recursive: true });
  await writeFile(
    path.join(typedRoot, "press.tsx"),
    `import { Press, Text } from "@open-press/core";
import { TitleSlide } from "./layouts/title-slide";
import { TitledContentSlide } from "./layouts/titled-content-slide";
import { Timeline } from "./ui/timeline";
import "./theme/slides.css";

export default function ${componentNameFromFolder(folder)}Press() {
  return (
    <Press
      slug="${escapeJsxAttribute(folder)}"
      title="${escapeJsxAttribute(title)}"
      type="slides"
      page="slide-16-9"
      componentsDir="./components"
      mediaDir="./media"
    >
      <TitleSlide id="cover">
        <TitleSlide.Title objectId="title">${escapeText(title)}</TitleSlide.Title>
        <TitleSlide.Description objectId="description">
          A concise deck authored as editable OpenPress source.
        </TitleSlide.Description>
      </TitleSlide>

      <TitledContentSlide id="problem-context">
        <TitledContentSlide.Eyebrow objectId="eyebrow">Context</TitledContentSlide.Eyebrow>
        <TitledContentSlide.Title objectId="title">Problem Context</TitledContentSlide.Title>
        <TitledContentSlide.Content>
          <Text as="p" objectId="summary">Write visible slide content directly in JSX.</Text>
        </TitledContentSlide.Content>
      </TitledContentSlide>

      <TitledContentSlide id="workflow">
        <TitledContentSlide.Eyebrow objectId="eyebrow">Process</TitledContentSlide.Eyebrow>
        <TitledContentSlide.Title objectId="title">Workflow</TitledContentSlide.Title>
        <TitledContentSlide.Content>
          <Timeline>
            <Timeline.Item id="draft" marker="01" title="Draft">Create the first structure.</Timeline.Item>
            <Timeline.Item id="review" marker="02" title="Review">Tighten content and layout.</Timeline.Item>
            <Timeline.Item id="export" marker="03" title="Export">Render PDF or images.</Timeline.Item>
          </Timeline>
        </TitledContentSlide.Content>
      </TitledContentSlide>
    </Press>
  );
}
`,
    "utf8",
  );
  await writeFile(
    path.join(typedRoot, "components", "DeckSlide.tsx"),
    `import { PageFolio, Slide } from "@open-press/core";
import type { ReactNode } from "react";

export function DeckSlide({
  id,
  variant = "default",
  children,
}: {
  id: string;
  variant?: "default" | "cover";
  children: ReactNode;
}) {
  return (
    <Slide id={id} className={\`op-slide op-slide--\${variant}\`}>
      <div className="op-slide__surface">
        <main className="op-slide__content">{children}</main>
        <footer className="op-slide__footer">
          <PageFolio variant="slash" currentFormat="2-digit" totalFormat="2-digit" />
        </footer>
      </div>
    </Slide>
  );
}
`,
    "utf8",
  );
  await writeFile(
    path.join(typedRoot, "layouts", "title-slide.tsx"),
    `import { Text, type TextProps } from "@open-press/core";
import type { ReactNode } from "react";
import { DeckSlide } from "../components/DeckSlide";

function TitleSlideRoot({ id, children }: { id: string; children: ReactNode }) {
  return (
    <DeckSlide id={id} variant="cover">
      <section className="op-title-slide">{children}</section>
    </DeckSlide>
  );
}

function TitleSlideTitle(props: Omit<TextProps, "as" | "label">) {
  return <Text as="h1" label="Title" className="op-slide-title" {...props} />;
}

function TitleSlideDescription(props: Omit<TextProps, "as" | "label">) {
  return <Text as="p" label="Description" className="op-slide-description" {...props} />;
}

export const TitleSlide = Object.assign(TitleSlideRoot, {
  Title: TitleSlideTitle,
  Description: TitleSlideDescription,
});
`,
    "utf8",
  );
  await writeFile(
    path.join(typedRoot, "layouts", "titled-content-slide.tsx"),
    `import { Text, type TextProps } from "@open-press/core";
import type { ReactNode } from "react";
import { DeckSlide } from "../components/DeckSlide";

function TitledContentSlideRoot({ id, children }: { id: string; children: ReactNode }) {
  return (
    <DeckSlide id={id}>
      <section className="op-titled-content-slide">{children}</section>
    </DeckSlide>
  );
}

function TitledContentSlideEyebrow(props: Omit<TextProps, "as" | "label">) {
  return <Text as="p" label="Eyebrow" className="op-slide-eyebrow" {...props} />;
}

function TitledContentSlideTitle(props: Omit<TextProps, "as" | "label">) {
  return <Text as="h2" label="Title" className="op-slide-heading" {...props} />;
}

function TitledContentSlideDescription(props: Omit<TextProps, "as" | "label">) {
  return <Text as="p" label="Description" className="op-slide-description" {...props} />;
}

function TitledContentSlideContent({ children }: { children: ReactNode }) {
  return <div className="op-slide-body">{children}</div>;
}

export const TitledContentSlide = Object.assign(TitledContentSlideRoot, {
  Eyebrow: TitledContentSlideEyebrow,
  Title: TitledContentSlideTitle,
  Description: TitledContentSlideDescription,
  Desc: TitledContentSlideDescription,
  Content: TitledContentSlideContent,
});
`,
    "utf8",
  );
  await writeFile(
    path.join(typedRoot, "ui", "timeline.tsx"),
    `import { Text } from "@open-press/core";
import type { ReactNode } from "react";

function TimelineRoot({ children }: { children: ReactNode }) {
  return <ol className="op-timeline">{children}</ol>;
}

function TimelineItem({
  id,
  marker,
  title,
  children,
}: {
  id: string;
  marker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="op-timeline__item">
      <Text as="span" objectId={\`\${id}-marker\`} label="Timeline marker" className="op-timeline__marker">{marker}</Text>
      <div>
        <Text as="h3" objectId={\`\${id}-title\`} label="Timeline title" className="op-timeline__title">{title}</Text>
        <Text as="p" objectId={\`\${id}-body\`} label="Timeline body" className="op-timeline__body">{children}</Text>
      </div>
    </li>
  );
}

export const Timeline = Object.assign(TimelineRoot, {
  Item: TimelineItem,
});
`,
    "utf8",
  );
  await writeFile(
    path.join(typedRoot, "ui", "text.tsx"),
    `export { Text } from "@open-press/core";
export type { TextProps } from "@open-press/core";
`,
    "utf8",
  );
  await writeFile(path.join(typedRoot, "ui", "card.tsx"), `import type { ReactNode } from "react";\n\nexport function Card({ children }: { children: ReactNode }) {\n  return <article className="op-card">{children}</article>;\n}\n`, "utf8");
  await writeFile(path.join(typedRoot, "theme", "tokens.css"), `:root {\n  --op-slide-bg: #f8fafc;\n  --op-slide-fg: #17202a;\n  --op-slide-muted: #607084;\n  --op-slide-accent: #2563eb;\n}\n`, "utf8");
  await writeFile(
    path.join(typedRoot, "theme", "slides.css"),
    `@import "./tokens.css";

.op-slide {
  background: var(--op-slide-bg);
  color: var(--op-slide-fg);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.op-slide__surface {
  width: 100%;
  height: 100%;
  padding: 92px 112px;
  display: grid;
  grid-template-rows: 1fr auto;
}

.op-slide__content {
  min-width: 0;
}

.op-slide__footer {
  color: var(--op-slide-muted);
  display: flex;
  justify-content: flex-end;
  font-size: 22px;
}

.op-title-slide,
.op-titled-content-slide {
  display: grid;
  gap: 28px;
}

.op-title-slide {
  align-content: center;
  max-width: 1180px;
}

.op-slide-title {
  font-size: 112px;
  line-height: 1;
}

.op-slide-heading {
  font-size: 72px;
  line-height: 1.08;
}

.op-slide-eyebrow {
  color: var(--op-slide-accent);
  font-size: 24px;
  font-weight: 700;
  text-transform: uppercase;
}

.op-slide-description,
.op-slide-body {
  color: var(--op-slide-muted);
  font-size: 34px;
  line-height: 1.35;
}

.op-timeline {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  padding: 0;
  margin: 24px 0 0;
  list-style: none;
}

.op-timeline__item {
  background: #ffffff;
  border: 1px solid #dbe3ef;
  display: grid;
  gap: 18px;
  padding: 28px;
}

.op-timeline__marker {
  color: var(--op-slide-accent);
  font-size: 24px;
  font-weight: 800;
}

.op-timeline__title {
  font-size: 34px;
}

.op-timeline__body {
  color: var(--op-slide-muted);
  font-size: 26px;
  line-height: 1.35;
}
`,
    "utf8",
  );
}

function folderNameFromPressName(value: string): string {
  const base = path.basename(value);
  const folder = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return folder || "press";
}

function componentNameFromFolder(folder: string): string {
  const words = folder.split(/[-_]+/).filter(Boolean);
  const name = words.map((word) => word.slice(0, 1).toUpperCase() + word.slice(1)).join("");
  return name || "OpenPress";
}

function escapeJsxAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeText(value: string): string {
  return value.replace(/{/g, "&#123;").replace(/}/g, "&#125;").replace(/</g, "&lt;");
}

async function runInTarget(
  cwd: string,
  command: string,
  args: string[],
  opts: { silent?: boolean } = {},
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: opts.silent ? ["ignore", "ignore", "ignore"] : "inherit",
      shell: process.platform === "win32",
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function log(message: string): void {
  process.stdout.write(`▸ ${message}\n`);
}

function printNextSteps(target: string, options: InitOptions): void {
  const rel = path.relative(process.cwd(), target) || ".";
  const lines = [
    "",
    "✓ Done. Your open-press workspace is ready.",
    "",
    "Next steps:",
    `  cd ${rel}`,
  ];

  if (!options.install) {
    lines.push("  npm install");
  }

  if (!options.skills) {
    lines.push("  npm run openpress:skills");
  }

  lines.push(
    "",
    "  # start the workbench:",
    "  npm run dev",
    "",
    "Then open the local URL printed by Vite (typically http://127.0.0.1:5173/workspace).",
    "",
    "Use openpress-create-pages for a page-based artifact or openpress-create-slide for a deck.",
    "",
  );

  process.stdout.write(lines.join("\n"));
}
