# Portable Slide Style Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement workspace-local portable slide style templates so `open-press slide add --template <name>` copies registered `slide.tsx` templates instead of generating hardcoded slide JSX.

**Architecture:** Keep the engine dumb: `slide add` reads `press/<slug>/slide-style/manifest.json`, copies a template source file, substitutes only `__SLIDE_ID__` and `__SLIDE_COMPONENT__`, and then validates through the existing slide folder contract. `@open-press/create` and `open-press create` scaffold identical `slide-style/` folders while keeping `press/<slug>/theme/default.css` as the renderer-loaded active theme copied from `slide-style/theme/default.css`.

**Tech Stack:** Node.js ESM, TypeScript scaffold packages, `node:test`, OpenPress core CLI, React TSX slide source.

---

## File Structure

- Modify `packages/core/engine/commands/_shared.mjs`: parse the new `--template <name>` flag.
- Modify `packages/core/engine/commands/slide.mjs`: add template manifest loading, safe path resolution, token substitution, and pass-through from CLI options.
- Modify `packages/core/tests/framework-slide-command.test.mjs`: cover template copy, fallback source, and path traversal rejection.
- Modify `packages/create/src/slides-template.ts`: scaffold `slide-style/`, copy the default template into `slides/intro/slide.tsx`, and remove `layouts/SlideProtocol.tsx` / `components/DeckSlide.tsx` from the default scaffold.
- Modify `packages/cli/src/slides-template.ts`: keep the package CLI scaffold identical to `packages/create/src/slides-template.ts`.
- Modify `packages/create/tests/create.test.mjs`: assert the new scaffold tree and generated intro slide source.
- Create `press/slide/slide-style/manifest.json`: dogfood registry.
- Create `press/slide/slide-style/templates/{blank,title-image,statement,split-media,card-grid}/slide.tsx`: dogfood template slides.
- Create `press/slide/slide-style/theme/default.css`: dogfood portable theme source.
- Modify `docs/slide-template-protocol.md`: supersede protocol-components with template-copy style packages.
- Modify `docs/superpowers/specs/2026-06-09-slides-folder-architecture.md`: update recommended folders.
- Modify `skills/openpress/SKILL.md`: update create/core alignment checklist.
- Modify `skills/openpress-create-slide/SKILL.md`: remove `SlideProtocol` preference and document `--template`.
- Modify `skills/openpress-create-slide/references/layout-contract.md`: replace layout protocol guidance with template source guidance.

## Task 1: Core Slide Template Copy

**Files:**
- Modify: `packages/core/engine/commands/_shared.mjs`
- Modify: `packages/core/engine/commands/slide.mjs`
- Test: `packages/core/tests/framework-slide-command.test.mjs`

- [ ] **Step 1: Write failing tests for `--template` copy and no theme mutation**

Append this test helper and test to `packages/core/tests/framework-slide-command.test.mjs` inside the existing `describe("open-press slide mutations", ...)` block:

```js
async function writeSlideStyle(workspace, slug = "deck") {
  const styleRoot = path.join(workspace, "press", slug, "slide-style");
  await fs.mkdir(path.join(styleRoot, "templates", "statement"), { recursive: true });
  await fs.mkdir(path.join(workspace, "press", slug, "theme"), { recursive: true });
  await fs.writeFile(
    path.join(styleRoot, "manifest.json"),
    JSON.stringify({
      id: "test-style",
      version: "1.0.0",
      defaultTemplate: "statement",
      templates: {
        statement: {
          source: "templates/statement/slide.tsx",
          description: "Statement test slide"
        }
      },
      theme: {
        source: "theme/default.css",
        target: "theme/default.css"
      }
    }, null, 2),
    "utf8",
  );
  await fs.writeFile(
    path.join(styleRoot, "templates", "statement", "slide.tsx"),
    `import { Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "statement",
  description: "Copied statement template for __SLIDE_ID__",
} satisfies SlideMeta;

export const notes = "Template notes for __SLIDE_ID__.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide
      id="__SLIDE_ID__"
      className="op-slide-page bg-bg text-text"
      layout={{ mode: "stack", padding: 96, width: "fill", height: "fill" }}
    >
      <Text as="h1" className="op-display self-center">__SLIDE_ID__ copied from template</Text>
    </Slide>
  );
}
`,
    "utf8",
  );
  await fs.writeFile(path.join(styleRoot, "theme", "default.css"), "/* portable source */\n", "utf8").catch(async (error) => {
    if (error?.code !== "ENOENT") throw error;
    await fs.mkdir(path.join(styleRoot, "theme"), { recursive: true });
    await fs.writeFile(path.join(styleRoot, "theme", "default.css"), "/* portable source */\n", "utf8");
  });
  await fs.writeFile(path.join(workspace, "press", slug, "theme", "default.css"), "/* active theme */\n", "utf8");
}

it("adds a slide from the registered default template without mutating active theme", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeSlidesWorkspace(workspace);
    await writeSlideStyle(workspace);
    const themePath = path.join(workspace, "press", "deck", "theme", "default.css");
    const beforeTheme = await fs.readFile(themePath, "utf8");

    const result = spawnSync("node", [CLI, "slide", workspace, "add", "launch"], { cwd: ROOT, encoding: "utf8" });

    assert.equal(result.status, 0, result.stderr + result.stdout);
    const press = await fs.readFile(path.join(workspace, "press", "deck", "press.tsx"), "utf8");
    const slide = await fs.readFile(path.join(workspace, "press", "deck", "slides", "launch", "slide.tsx"), "utf8");
    assert.match(press, /<Slide id="launch" \/>/);
    assert.match(slide, /layout: "statement"/);
    assert.match(slide, /Copied statement template for launch/);
    assert.match(slide, /export default function LaunchSlide/);
    assert.doesNotMatch(slide, /__SLIDE_ID__|__SLIDE_COMPONENT__/);
    assert.equal(await fs.readFile(themePath, "utf8"), beforeTheme);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
pnpm --filter @open-press/core test:node -- --test-name-pattern "registered default template"
```

Expected: FAIL with `slide.tsx` still containing the current internal blank source and no copied `layout: "statement"`.

- [ ] **Step 3: Parse `--template` in shared CLI options**

In `packages/core/engine/commands/_shared.mjs`, add this branch near the other single-value flags:

```js
else if (value === "--template") options.template = argv[++i];
```

- [ ] **Step 4: Implement template manifest loading in `slide.mjs`**

In `packages/core/engine/commands/slide.mjs`, update `addSlide` and `applySlideAdd`:

```js
async function addSlide({ config, options, id }) {
  const result = await applySlideAdd({ config, slug: options.press, id, template: options.template });
  console.log(`added slide ${result.id}`);
  return 0;
}

export async function applySlideAdd({ config, slug, id, template }) {
  const press = await resolveSlidesPress(config.paths.documentRoot, slug);
  const source = await fs.readFile(press.pressPath, "utf8");
  const slideId = id ?? await nextSlideId(press, source);
  assertSlideId(slideId);
  const slideDir = path.join(press.pressDir, "slides", slideId);
  const slidePath = path.join(slideDir, "slide.tsx");
  const nextSource = appendSlideMarker(source, slideId);
  await assertPathMissing(slideDir, `Slide ${slideId} already exists`);
  const slideSource = await resolveSlideTemplateSource({ pressDir: press.pressDir, id: slideId, template });

  let created = false;
  try {
    await fs.mkdir(path.dirname(slideDir), { recursive: true });
    await fs.mkdir(slideDir, { recursive: false });
    created = true;
    await fs.writeFile(slidePath, slideSource, "utf8");
    await writeFileAtomically(press.pressPath, nextSource);
  } catch (error) {
    if (created) await fs.rm(slideDir, { recursive: true, force: true });
    throw error;
  }

  return { id: slideId, template: template ?? null };
}
```

Add these helper functions above `stubSlideSource`:

```js
async function resolveSlideTemplateSource({ pressDir, id, template }) {
  const styleRoot = path.join(pressDir, "slide-style");
  const manifestPath = path.join(styleRoot, "manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT" && !template) return stubSlideSource(id);
    if (error?.code === "ENOENT") throw new Error(`No slide style manifest found at ${manifestPath}`);
    if (error instanceof SyntaxError) throw new Error(`Malformed slide style manifest at ${manifestPath}: ${error.message}`);
    throw error;
  }

  const templateName = template ?? manifest.defaultTemplate;
  if (!isTemplateName(templateName)) throw new Error(`Invalid slide template name: ${templateName}`);
  const entry = manifest.templates?.[templateName];
  if (!entry || typeof entry.source !== "string" || !entry.source.trim()) {
    throw new Error(`Unknown slide template "${templateName}" in ${manifestPath}`);
  }

  const templatePath = resolveInside(styleRoot, entry.source, `Slide template "${templateName}"`);
  const source = await fs.readFile(templatePath, "utf8");
  return renderSlideTemplate(source, id);
}

function renderSlideTemplate(source, id) {
  return source
    .replaceAll("__SLIDE_ID__", id)
    .replaceAll("__SLIDE_COMPONENT__", `${toPascalCase(id)}Slide`);
}

function resolveInside(root, relativePath, label) {
  const normalized = String(relativePath ?? "").replaceAll("\\", "/");
  if (!normalized || path.isAbsolute(normalized)) throw new Error(`${label} path must be relative: ${relativePath}`);
  const resolved = path.resolve(root, normalized);
  const rootWithSep = path.resolve(root) + path.sep;
  if (resolved !== path.resolve(root) && !resolved.startsWith(rootWithSep)) {
    throw new Error(`${label} path escapes slide-style: ${relativePath}`);
  }
  return resolved;
}

function isTemplateName(value) {
  return /^[a-z0-9][a-z0-9-]*$/.test(value ?? "");
}
```

- [ ] **Step 5: Run the template copy test**

Run:

```bash
pnpm --filter @open-press/core test:node -- --test-name-pattern "registered default template"
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add packages/core/engine/commands/_shared.mjs packages/core/engine/commands/slide.mjs packages/core/tests/framework-slide-command.test.mjs
git commit -m "[core] copy slide templates from style manifest"
```

## Task 2: Core Template Error Coverage

**Files:**
- Modify: `packages/core/tests/framework-slide-command.test.mjs`
- Modify: `packages/core/engine/commands/slide.mjs`

- [ ] **Step 1: Write failing test for explicit `--template`**

Append this test to `describe("open-press slide mutations", ...)`:

```js
it("adds a slide from an explicitly selected template", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeSlidesWorkspace(workspace);
    await writeSlideStyle(workspace);
    const result = spawnSync("node", [CLI, "slide", workspace, "add", "closing", "--template", "statement"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const slide = await fs.readFile(path.join(workspace, "press", "deck", "slides", "closing", "slide.tsx"), "utf8");
    assert.match(slide, /export default function ClosingSlide/);
    assert.match(slide, /Copied statement template for closing/);
  });
});
```

- [ ] **Step 2: Write failing test for path traversal rejection**

Append:

```js
it("rejects slide template sources that escape slide-style", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeSlidesWorkspace(workspace);
    const styleRoot = path.join(workspace, "press", "deck", "slide-style");
    await fs.mkdir(styleRoot, { recursive: true });
    await fs.writeFile(
      path.join(styleRoot, "manifest.json"),
      JSON.stringify({
        id: "bad-style",
        version: "1.0.0",
        defaultTemplate: "escape",
        templates: {
          escape: { source: "../slides/cover/slide.tsx" }
        }
      }, null, 2),
      "utf8",
    );

    const result = spawnSync("node", [CLI, "slide", workspace, "add", "bad"], { cwd: ROOT, encoding: "utf8" });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /escapes slide-style/);
    assert.equal(await exists(path.join(workspace, "press", "deck", "slides", "bad", "slide.tsx")), false);
  });
});
```

- [ ] **Step 3: Run failing tests**

Run:

```bash
pnpm --filter @open-press/core test:node -- --test-name-pattern "explicitly selected template|escape slide-style"
```

Expected: the explicit template test may already pass from Task 1; the traversal test must fail if path containment is missing or incorrect.

- [ ] **Step 4: Tighten implementation if needed**

If the traversal test fails because `resolveInside` permits `../`, replace `resolveInside` with:

```js
function resolveInside(root, relativePath, label) {
  const normalized = String(relativePath ?? "").replaceAll("\\", "/");
  if (!normalized || path.isAbsolute(normalized)) throw new Error(`${label} path must be relative: ${relativePath}`);
  const rootResolved = path.resolve(root);
  const resolved = path.resolve(rootResolved, normalized);
  const relative = path.relative(rootResolved, resolved);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} path escapes slide-style: ${relativePath}`);
  }
  return resolved;
}
```

- [ ] **Step 5: Run full core slide command test**

Run:

```bash
pnpm --filter @open-press/core test:node -- --test-name-pattern "open-press slide"
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

Run:

```bash
git add packages/core/engine/commands/slide.mjs packages/core/tests/framework-slide-command.test.mjs
git commit -m "[test] cover slide template registry errors"
```

## Task 3: Template-First Create Scaffolds

**Files:**
- Modify: `packages/create/src/slides-template.ts`
- Modify: `packages/cli/src/slides-template.ts`
- Modify: `packages/create/tests/create.test.mjs`

- [ ] **Step 1: Update create tests first**

In `packages/create/tests/create.test.mjs`, replace the file-tree assertions in `scaffolds slides workspace: file tree` with:

```js
assert.equal(existsSync(path.join(target, "press", "my-deck", "press.tsx")), true);
assert.equal(existsSync(path.join(target, "press", "my-deck", "slide-style", "manifest.json")), true);
assert.equal(existsSync(path.join(target, "press", "my-deck", "slide-style", "templates", "blank", "slide.tsx")), true);
assert.equal(existsSync(path.join(target, "press", "my-deck", "slide-style", "templates", "title-image", "slide.tsx")), true);
assert.equal(existsSync(path.join(target, "press", "my-deck", "slide-style", "templates", "statement", "slide.tsx")), true);
assert.equal(existsSync(path.join(target, "press", "my-deck", "slide-style", "templates", "split-media", "slide.tsx")), true);
assert.equal(existsSync(path.join(target, "press", "my-deck", "slide-style", "templates", "card-grid", "slide.tsx")), true);
assert.equal(existsSync(path.join(target, "press", "my-deck", "slide-style", "theme", "default.css")), true);
assert.equal(existsSync(path.join(target, "press", "my-deck", "slides", "intro", "slide.tsx")), true);
assert.equal(existsSync(path.join(target, "press", "my-deck", "theme", "default.css")), true);
assert.equal(existsSync(path.join(target, "press", "my-deck", "layouts", "SlideProtocol.tsx")), false);
assert.equal(existsSync(path.join(target, "press", "my-deck", "components", "DeckSlide.tsx")), false);
assert.equal(existsSync(path.join(target, "press", "my-deck", "themes")), false);
```

In `scaffolds slides workspace: slide.tsx uses satisfies SlideMeta`, replace the SlideProtocol import assertion:

```js
assert.doesNotMatch(source, /SlideProtocol/);
assert.match(source, /from "@open-press\/core"/);
assert.match(source, /<Slide id="intro"/);
```

Add a manifest test:

```js
test("scaffolds slides workspace: slide-style manifest registers default templates", async () => {
  const dir = await tmp();
  const target = path.join(dir, "my-deck");
  try {
    await runCreate([target, "--type", "slides", "--title", "My Deck", "--no-install", "--no-git", "--no-skills"]);
    const manifest = JSON.parse(await readFile(path.join(target, "press", "my-deck", "slide-style", "manifest.json"), "utf8"));
    assert.equal(manifest.defaultTemplate, "blank");
    assert.deepEqual(Object.keys(manifest.templates).sort(), ["blank", "card-grid", "split-media", "statement", "title-image"]);
    assert.equal(manifest.theme.source, "theme/default.css");
    assert.equal(manifest.theme.target, "theme/default.css");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run failing create tests**

Run:

```bash
pnpm --filter @open-press/create test -- --test-name-pattern "scaffolds slides workspace"
```

Expected: FAIL because `slide-style/` is missing and `layouts/SlideProtocol.tsx` still exists.

- [ ] **Step 3: Replace scaffold implementation in both packages**

In both `packages/create/src/slides-template.ts` and `packages/cli/src/slides-template.ts`:

1. Remove `components` and `layouts` mkdir calls.
2. Add mkdir calls for:

```ts
await mkdir(path.join(pressRoot, "slides", "intro"), { recursive: true });
await mkdir(path.join(pressRoot, "slide-style", "templates", "blank"), { recursive: true });
await mkdir(path.join(pressRoot, "slide-style", "templates", "title-image"), { recursive: true });
await mkdir(path.join(pressRoot, "slide-style", "templates", "statement"), { recursive: true });
await mkdir(path.join(pressRoot, "slide-style", "templates", "split-media"), { recursive: true });
await mkdir(path.join(pressRoot, "slide-style", "templates", "card-grid"), { recursive: true });
await mkdir(path.join(pressRoot, "slide-style", "theme"), { recursive: true });
await mkdir(path.join(pressRoot, "theme"), { recursive: true });
await mkdir(path.join(pressRoot, "media"), { recursive: true });
```

3. Remove `componentsDir="./components"` from the generated `<Press>`.
4. Write `slide-style/manifest.json`:

```ts
await writeFile(
  path.join(pressRoot, "slide-style", "manifest.json"),
  `${JSON.stringify({
    id: "openpress-default-slide-style",
    version: "1.0.0",
    defaultTemplate: "blank",
    templates: {
      blank: { source: "templates/blank/slide.tsx", description: "Minimal starter slide" },
      "title-image": { source: "templates/title-image/slide.tsx", description: "Title slide with a media object" },
      statement: { source: "templates/statement/slide.tsx", description: "Large editorial statement slide" },
      "split-media": { source: "templates/split-media/slide.tsx", description: "Two-column text and media slide" },
      "card-grid": { source: "templates/card-grid/slide.tsx", description: "Three-card argument or feature grid" },
    },
    theme: { source: "theme/default.css", target: "theme/default.css" },
  }, null, 2)}\n`,
  "utf8",
);
```

5. Add a local `renderSlideTemplate` helper:

```ts
function renderSlideTemplate(source: string, id: string): string {
  return source
    .replaceAll("__SLIDE_ID__", id)
    .replaceAll("__SLIDE_COMPONENT__", `${componentName(id)}Slide`);
}
```

6. Replace intro source writing with:

```ts
await writeFile(
  path.join(pressRoot, "slide-style", "templates", "blank", "slide.tsx"),
  BLANK_TEMPLATE_SOURCE,
  "utf8",
);
await writeFile(
  path.join(pressRoot, "slides", "intro", "slide.tsx"),
  renderSlideTemplate(BLANK_TEMPLATE_SOURCE, "intro"),
  "utf8",
);
```

7. Add `TITLE_IMAGE_TEMPLATE_SOURCE`, `STATEMENT_TEMPLATE_SOURCE`, `SPLIT_MEDIA_TEMPLATE_SOURCE`, and `CARD_GRID_TEMPLATE_SOURCE`, then write them to their registered paths. Use the exact five template sources in [Appendix A: Template Source Files](#appendix-a-template-source-files). Keep them self-contained, prefer `Slide` layout props plus core primitives such as `Text`, `MediaObject`, `Media`, `MediaCaption`, and `BaseCallout`, and do not import `SlideProtocol` or `DeckSlide`.

8. Write style package theme and active theme:

```ts
const themeSource = `/* ${folder} slide style source */\n`;
await writeFile(path.join(pressRoot, "slide-style", "theme", "default.css"), themeSource, "utf8");
await writeFile(path.join(pressRoot, "theme", "default.css"), themeSource, "utf8");
```

- [ ] **Step 4: Run create tests**

Run:

```bash
pnpm --filter @open-press/create test -- --test-name-pattern "scaffolds slides workspace"
```

Expected: PASS.

- [ ] **Step 5: Verify package scaffold files are identical**

Run:

```bash
diff -u packages/create/src/slides-template.ts packages/cli/src/slides-template.ts
```

Expected: no output.

- [ ] **Step 6: Commit Task 3**

Run:

```bash
git add packages/create/src/slides-template.ts packages/cli/src/slides-template.ts packages/create/tests/create.test.mjs
git commit -m "[core] scaffold slide style templates"
```

## Task 4: Dogfood Slide Style Package

**Files:**
- Create: `press/slide/slide-style/manifest.json`
- Create: `press/slide/slide-style/templates/blank/slide.tsx`
- Create: `press/slide/slide-style/templates/title-image/slide.tsx`
- Create: `press/slide/slide-style/templates/statement/slide.tsx`
- Create: `press/slide/slide-style/templates/split-media/slide.tsx`
- Create: `press/slide/slide-style/templates/card-grid/slide.tsx`
- Create: `press/slide/slide-style/theme/default.css`

- [ ] **Step 1: Add dogfood manifest**

Create `press/slide/slide-style/manifest.json`:

```json
{
  "id": "openpress-dogfood-slide-style",
  "version": "1.0.0",
  "defaultTemplate": "blank",
  "templates": {
    "blank": {
      "source": "templates/blank/slide.tsx",
      "description": "Minimal starter slide"
    },
    "title-image": {
      "source": "templates/title-image/slide.tsx",
      "description": "Title slide with a media object"
    },
    "statement": {
      "source": "templates/statement/slide.tsx",
      "description": "Large editorial statement slide"
    },
    "split-media": {
      "source": "templates/split-media/slide.tsx",
      "description": "Two-column text and media slide"
    },
    "card-grid": {
      "source": "templates/card-grid/slide.tsx",
      "description": "Three-card argument or feature grid"
    }
  },
  "theme": {
    "source": "theme/default.css",
    "target": "theme/default.css"
  }
}
```

- [ ] **Step 2: Add dogfood templates**

Create the five dogfood template files using the exact source files in [Appendix A: Template Source Files](#appendix-a-template-source-files):

- `press/slide/slide-style/templates/blank/slide.tsx` uses "Blank Template".
- `press/slide/slide-style/templates/title-image/slide.tsx` uses "Title Image Template".
- `press/slide/slide-style/templates/statement/slide.tsx` uses "Statement Template".
- `press/slide/slide-style/templates/split-media/slide.tsx` uses "Split Media Template".
- `press/slide/slide-style/templates/card-grid/slide.tsx` uses "Card Grid Template".

- [ ] **Step 3: Add dogfood style source theme**

Create `press/slide/slide-style/theme/default.css`:

```css
/* Dogfood portable slide style source. The active deck theme remains press/slide/theme/*.css. */
```

- [ ] **Step 4: Use CLI to dogfood template copy**

Run:

```bash
node packages/core/engine/cli.mjs slide . add template-copy-check --press slide --template statement
```

Expected: `press/slide/slides/template-copy-check/slide.tsx` is created from the `statement` template and `press/slide/press.tsx` gets `<Slide id="template-copy-check" />`.

- [ ] **Step 5: Remove the temporary dogfood slide**

Run:

```bash
node packages/core/engine/cli.mjs slide . remove template-copy-check --press slide
```

Expected: `press/slide/slides/template-copy-check/` is removed and the marker is removed from `press/slide/press.tsx`.

- [ ] **Step 6: Commit Task 4**

Run:

```bash
git add press/slide/slide-style
git commit -m "[doc] add dogfood slide style templates"
```

## Task 5: Documentation And Skill Alignment

**Files:**
- Modify: `docs/slide-template-protocol.md`
- Modify: `docs/superpowers/specs/2026-06-09-slides-folder-architecture.md`
- Modify: `skills/openpress/SKILL.md`
- Modify: `skills/openpress-create-slide/SKILL.md`
- Modify: `skills/openpress-create-slide/references/layout-contract.md`

- [ ] **Step 1: Update slide protocol doc**

In `docs/slide-template-protocol.md`, replace the "Protocol Spec" section with a "Template Copy Contract" section containing:

```md
## Template Copy Contract

OpenPress no longer scaffolds `layouts/SlideProtocol.tsx` for new slide workspaces.
Portable slide style lives in `press/<slug>/slide-style/`.

`open-press slide add <id> --template <name>` reads `slide-style/manifest.json`,
copies the registered `slide.tsx`, substitutes `__SLIDE_ID__` and
`__SLIDE_COMPONENT__`, and appends the `<Slide id />` marker to `press.tsx`.

Template files should be complete slides built from `Slide` / `Frame` layout
props, `Text`, `MediaObject`, `Media`, and `MediaCaption`. `Slide` is the
slide-friendly `Frame` wrapper and accepts `layout` directly. Plain HTML
elements are allowed for small local wrappers, but the main template skeleton
should show OpenPress primitives first. A template may be visually opinionated,
but the engine and CLI do not understand that opinion.
```

- [ ] **Step 2: Update folder architecture spec**

In `docs/superpowers/specs/2026-06-09-slides-folder-architecture.md`, replace the recommended `layouts/` row in the tree with:

```txt
├── slide-style/
│   ├── manifest.json
│   ├── templates/
│   └── theme/
```

Add this sentence after the tree:

```md
`layouts/` may exist in older or heavily customized workspaces, but it is no longer the default scaffolded slide style boundary.
```

- [ ] **Step 3: Update `openpress` skill alignment checklist**

In `skills/openpress/SKILL.md`, replace the release check sentence that names `layouts/SlideProtocol.tsx` with:

```md
Before a framework release, verify the create surfaces still match core and the slide skill: `@open-press/create` and `open-press create` must both scaffold marker-only slide Presses, `slide-style/manifest.json`, registered `slide-style/templates/*/slide.tsx`, an active `theme/default.css` copied from `slide-style/theme/default.css`, `slides/<id>/slide.tsx`, and `theme/` (not `themes/`). Run the create and CLI package tests after any template or core slides-folder contract change.
```

- [ ] **Step 4: Update slide creation skill**

In `skills/openpress-create-slide/SKILL.md`, replace the `SlideProtocol` import guidance with:

```md
- New slide: use `open-press slide add <id> --template <name>` when a registered template fits, or `open-press slide add <id>` for the default template. Then edit `slides/<id>/slide.tsx` directly.
- Prefer copied template slides built from `Slide` / `Frame` layout props, `Text`, `MediaObject`, `Media`, and `MediaCaption` over shared protocol layout components or generic HTML layout wrappers. `Slide` accepts the `layout` prop directly, so a template does not need a wrapper element for its main grid or stack.
- Do not create or depend on `layouts/SlideProtocol.tsx` in new workspaces. Existing workspaces may keep local layouts as user source.
```

- [ ] **Step 5: Update layout contract reference**

In `skills/openpress-create-slide/references/layout-contract.md`, replace the "Slide Template Protocol" section with:

```md
## Template Slide Contract

A template slide is a complete `slide.tsx` source file registered in
`press/<slug>/slide-style/manifest.json`.

The CLI copies it into `press/<slug>/slides/<id>/slide.tsx`, substitutes
`__SLIDE_ID__` and `__SLIDE_COMPONENT__`, and leaves theme files untouched.
Templates should import core primitives directly from `@open-press/core`.
```

- [ ] **Step 6: Search for stale mandatory `SlideProtocol` scaffold guidance**

Run:

```bash
rg "SlideProtocol|layouts/SlideProtocol|protocol compound|TitleSlide\\.Title|TwoColumnSlide" docs skills packages/create packages/cli packages/core/tests
```

Expected: remaining matches either describe legacy compatibility, existing dogfood source not yet migrated, or the explicit removal from the new scaffold. Update any match that still says new workspaces should scaffold or prefer `SlideProtocol`.

- [ ] **Step 7: Commit Task 5**

Run:

```bash
git add docs/slide-template-protocol.md docs/superpowers/specs/2026-06-09-slides-folder-architecture.md skills/openpress/SKILL.md skills/openpress-create-slide/SKILL.md skills/openpress-create-slide/references/layout-contract.md
git commit -m "[skill] align slide authoring with style templates"
```

## Task 6: Verification And Release Readiness

**Files:**
- Review only unless tests require small fixes in files already touched above.

- [ ] **Step 1: Run core node tests**

Run:

```bash
pnpm --filter @open-press/core test:node
```

Expected: PASS.

- [ ] **Step 2: Run create package tests**

Run:

```bash
pnpm --filter @open-press/create test
```

Expected: PASS.

- [ ] **Step 3: Run CLI package tests**

Run:

```bash
pnpm --filter @open-press/cli test
```

Expected: PASS. If no CLI create tests exist yet, add one in the package's test directory that invokes `open-press create demo --type slides` from `packages/cli/dist/cli.js` and asserts the same `slide-style/` file tree as the create package test.

- [ ] **Step 4: Run typecheck**

Run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Run dogfood build**

Run:

```bash
npm run build
```

Expected: PASS and `press/slide` remains renderable.

- [ ] **Step 6: Inspect final diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only intended files are modified or untracked. Do not revert pre-existing unrelated dirty files; identify them in the final handoff if they remain.

- [ ] **Step 7: Commit verification fixes if any**

If verification required small fixes, commit only those touched files:

```bash
git add <verified-files>
git commit -m "[test] verify portable slide style templates"
```

## Self-Review

- Spec coverage: Tasks cover manifest copy, `--template`, token substitution, theme non-mutation, create scaffolds, dogfood style source, docs, skills, and verification.
- Scope control: npm installers, marketplaces, remote fetching, generalized variables, and automatic existing-slide rewrites are excluded.
- Type consistency: The plan uses `template` for CLI option, `defaultTemplate` for manifest default, and `slide-style/manifest.json` for registry source throughout.

## Appendix A: Template Source Files

Use these exact files for the first scaffold and dogfood style package. When embedding them as TypeScript string constants in `packages/create/src/slides-template.ts` and `packages/cli/src/slides-template.ts`, preserve the source text and escape only the outer string delimiters required by TypeScript.

### Blank Template

Path when scaffolded:

```txt
slide-style/templates/blank/slide.tsx
```

Contents:

```tsx
import { Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "blank",
  description: "Minimal starter slide.",
  keypoints: ["Replace the title", "Replace the body"],
} satisfies SlideMeta;

export const notes = "Replace these notes before presenting.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide
      id="__SLIDE_ID__"
      className="op-slide-page bg-bg text-center text-text [font-family:var(--font-body)]"
      layout={{
        mode: "stack",
        direction: "vertical",
        gap: 24,
        padding: 96,
        width: "fill",
        height: "fill",
        clip: true,
      }}
    >
      <div className="m-auto max-w-[920px]">
        <Text as="p" className="op-kicker mb-op-sm">
          New slide
        </Text>
        <Text as="h1" className="op-display">
          __SLIDE_ID__
        </Text>
        <Text as="p" className="op-lead mt-op-sm">
          Replace this starter copy with the slide's message.
        </Text>
      </div>
    </Slide>
  );
}
```

### Title Image Template

Path when scaffolded:

```txt
slide-style/templates/title-image/slide.tsx
```

Contents:

```tsx
import { Media, MediaCaption, MediaObject, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "title-image",
  description: "Title slide with a strong media object.",
  keypoints: ["Replace the headline", "Replace the image"],
  visuals: ["openpress-hero-art.png"],
} satisfies SlideMeta;

export const notes = "Open with the main argument, then use the image as visual context.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide
      id="__SLIDE_ID__"
      className="op-slide-page bg-bg text-text [font-family:var(--font-body)]"
      layout={{
        mode: "grid",
        columns: "minmax(0,1fr) 520px",
        gap: 64,
        padding: 96,
        width: "fill",
        height: "fill",
        clip: true,
      }}
    >
      <div className="grid content-center border-l-[6px] border-accent pl-op-md">
        <Text as="p" className="op-kicker mb-op-sm">
          Template
        </Text>
        <Text as="h1" className="op-display max-w-[920px]">
          Replace this title.
        </Text>
        <Text as="p" className="op-lead mt-op-sm max-w-[820px] text-text-muted">
          Replace this supporting line with one clear promise.
        </Text>
      </div>
      <MediaObject className="relative min-h-[660px] overflow-hidden rounded-op-card border border-border bg-surface-muted shadow-op-card">
        <Media src="openpress-hero-art.png" alt="Template media" fit="cover" />
        <MediaCaption className="absolute bottom-op-sm left-op-sm rounded-op-pill bg-surface-inverse px-op-sm py-op-xs text-op-caption text-text-inverse">
          Replace caption
        </MediaCaption>
      </MediaObject>
    </Slide>
  );
}
```

### Statement Template

Path when scaffolded:

```txt
slide-style/templates/statement/slide.tsx
```

Contents:

```tsx
import { BaseCallout, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "statement",
  description: "Large editorial statement slide.",
  keypoints: ["Make one claim", "Support it with two short lines"],
} satisfies SlideMeta;

export const notes = "Use this slide when the deck needs one clear claim.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide
      id="__SLIDE_ID__"
      className="op-slide-page bg-bg text-text [font-family:var(--font-body)]"
      layout={{
        mode: "grid",
        columns: "minmax(0,1fr) 520px",
        gap: 96,
        padding: 96,
        width: "fill",
        height: "fill",
        clip: true,
      }}
    >
      <div className="self-center">
        <Text as="p" className="op-kicker mb-op-sm">
          Statement
        </Text>
        <Text as="h2" className="op-section max-w-[880px]">
          Replace this with the one sentence the audience should remember.
        </Text>
      </div>
      <BaseCallout kind="info" className="op-card-muted grid self-center gap-op-sm">
        <Text as="p" className="op-body font-bold">
          First supporting point.
        </Text>
        <Text as="p" className="op-body font-bold">
          Second supporting point.
        </Text>
      </BaseCallout>
    </Slide>
  );
}
```

### Split Media Template

Path when scaffolded:

```txt
slide-style/templates/split-media/slide.tsx
```

Contents:

```tsx
import { Media, MediaCaption, MediaObject, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "split-media",
  description: "Two-column text and media slide.",
  keypoints: ["Explain the point on the left", "Show visual evidence on the right"],
  visuals: ["openpress-hero-art.png"],
} satisfies SlideMeta;

export const notes = "Use the visual as evidence, not decoration.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide
      id="__SLIDE_ID__"
      className="op-slide-page bg-bg text-text [font-family:var(--font-body)]"
      layout={{
        mode: "grid",
        columns: "500px minmax(0,1fr)",
        gap: 96,
        padding: 96,
        width: "fill",
        height: "fill",
        clip: true,
      }}
    >
      <div className="min-w-0 self-center">
        <Text as="p" className="op-kicker mb-op-sm">
          Split media
        </Text>
        <Text as="h2" className="op-section">
          Replace this section title.
        </Text>
        <Text as="p" className="op-body mt-op-sm text-text-muted">
          Replace this paragraph with a concise explanation of what the visual proves.
        </Text>
      </div>
      <MediaObject className="relative h-[680px] overflow-hidden rounded-op-panel border border-border bg-surface-muted shadow-op-card">
        <Media src="openpress-hero-art.png" alt="Template media" fit="cover" />
        <MediaCaption className="absolute bottom-op-sm left-op-sm rounded-op-pill bg-surface-inverse px-op-sm py-op-xs text-op-caption text-text-inverse">
          Replace caption
        </MediaCaption>
      </MediaObject>
    </Slide>
  );
}
```

### Card Grid Template

Path when scaffolded:

```txt
slide-style/templates/card-grid/slide.tsx
```

Contents:

```tsx
import { BaseCallout, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "card-grid",
  description: "Three-card argument or feature grid.",
  keypoints: ["Replace the heading", "Replace all three cards"],
} satisfies SlideMeta;

export const notes = "Use this slide for three parallel points with comparable weight.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide
      id="__SLIDE_ID__"
      className="op-slide-page bg-bg text-text [font-family:var(--font-body)]"
      layout={{
        mode: "stack",
        direction: "vertical",
        gap: 64,
        padding: 96,
        width: "fill",
        height: "fill",
        clip: true,
      }}
    >
      <div>
        <div className="max-w-[1120px]">
          <Text as="p" className="op-kicker mb-op-sm">
            Card grid
          </Text>
          <Text as="h2" className="op-section">
            Replace this heading with the grouping idea.
          </Text>
        </div>
        <div className="mt-op-lg grid grid-cols-3 gap-op-sm">
          <BaseCallout kind="info" className="op-card-muted min-h-[230px] border-t-4 border-t-text">
            <Text as="span" className="op-kicker mb-op-sm block">
              01
            </Text>
            <Text as="h3" className="op-lead font-bold text-text">
              First card
            </Text>
            <Text as="p" className="op-body mt-op-xs">
              Replace this card body.
            </Text>
          </BaseCallout>
          <BaseCallout kind="info" className="op-card-muted min-h-[230px] border-t-4 border-t-text">
            <Text as="span" className="op-kicker mb-op-sm block">
              02
            </Text>
            <Text as="h3" className="op-lead font-bold text-text">
              Second card
            </Text>
            <Text as="p" className="op-body mt-op-xs">
              Replace this card body.
            </Text>
          </BaseCallout>
          <BaseCallout kind="info" className="op-card-muted min-h-[230px] border-t-4 border-t-text">
            <Text as="span" className="op-kicker mb-op-sm block">
              03
            </Text>
            <Text as="h3" className="op-lead font-bold text-text">
              Third card
            </Text>
            <Text as="p" className="op-body mt-op-xs">
              Replace this card body.
            </Text>
          </BaseCallout>
        </div>
      </div>
    </Slide>
  );
}
```
