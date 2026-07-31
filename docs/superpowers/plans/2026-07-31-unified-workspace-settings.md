# Unified Workspace Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `openpress/settings.json` the primary versioned configuration source, migrate legacy `package.json#openpress`, and persist Workspace Appearance through the workspace rather than browser storage.

**Architecture:** A focused engine module owns schema normalization, precedence, migration, atomic writes, and the safe public projection. Existing engine config consumes that module. Local Vite/static middleware exposes settings reads and trusted writes, while the React app consumes one workspace-level settings provider. Build emits only the public Appearance projection.

**Tech Stack:** Node.js ESM, TypeScript, React 19, Vite middleware, Vitest, Node test runner, Playwright.

## Global Constraints

- `openpress/settings.json` is authored source and must be tracked by Git.
- `public/openpress/settings.json` and `dist-react/openpress/settings.json` are generated output and must not be edited directly.
- Loader precedence is settings file, legacy `package.json#openpress`, then framework defaults.
- Public runtime settings contain only `version` and `appearance`.
- Zoom, panel state, panel width, reading position, inspector mode, and active directory mode remain browser-local.
- Local mutation endpoints must use the existing trusted-request guard.
- Legacy migration must not delete unknown or conflicting package fields.

---

### Task 1: Versioned settings model and config loader

**Files:**
- Create: `packages/core/engine/runtime/workspace-settings.mjs`
- Create: `packages/core/engine/runtime/workspace-settings.d.mts`
- Modify: `packages/core/engine/runtime/config.mjs`
- Modify: `packages/core/engine/runtime/config.d.mts`
- Test: `packages/core/tests/workspace-settings.test.mjs`
- Test: `packages/core/tests/openpress-engine-runtime.test.mjs`

**Interfaces:**
- Produces: `loadWorkspaceSettings(root)`, `normalizeWorkspaceSettings(input)`, `publicWorkspaceSettings(settings)`, `writeWorkspaceSettings(root, input)`, `workspaceSettingsPath(root)`.
- Produces: `ResolvedConfig.settings`, `ResolvedConfig.appearance`, and `ResolvedConfig.paths.settings`.
- Consumes: existing page geometry and config value normalization rules.

- [ ] **Step 1: Write failing loader and validation tests**

```js
test("settings file wins per field over legacy package config", async () => {
  await writeJson(path.join(root, "package.json"), {
    openpress: { pdf: { filename: "legacy.pdf" }, deploy: { projectName: "legacy" } },
  });
  await writeJson(path.join(root, "openpress/settings.json"), {
    version: 1,
    appearance: { colorMode: "light", accent: "violet" },
    pdf: { filename: "settings.pdf" },
  });
  const config = await loadConfig(root);
  assert.equal(config.pdf.filename, "settings.pdf");
  assert.equal(config.deploy.projectName, "legacy");
  assert.deepEqual(config.appearance, { colorMode: "light", accent: "violet" });
});

test("unsupported settings versions fail with the source path", async () => {
  await writeJson(path.join(root, "openpress/settings.json"), { version: 2 });
  await assert.rejects(loadConfig(root), /openpress\\/settings\\.json.*version 2/);
});

test("public projection excludes operational settings", () => {
  const publicSettings = publicWorkspaceSettings(normalizeWorkspaceSettings({
    version: 1,
    appearance: { colorMode: "dark", accent: "amber" },
    pdf: { filename: "private-name.pdf" },
    deploy: { projectName: "internal-project" },
  }));
  assert.deepEqual(Object.keys(publicSettings), ["version", "appearance"]);
});
```

- [ ] **Step 2: Run tests and confirm the missing-module failure**

Run: `node --test packages/core/tests/workspace-settings.test.mjs`

Expected: FAIL because `workspace-settings.mjs` does not exist.

- [ ] **Step 3: Implement schema, defaults, precedence, and atomic writer**

```js
export const WORKSPACE_SETTINGS_VERSION = 1;

export async function loadWorkspaceSettings(root) {
  const settingsPath = workspaceSettingsPath(root);
  const source = await readOptionalJson(settingsPath);
  const legacy = await readLegacyOpenpress(root);
  return {
    settings: normalizeWorkspaceSettings(mergeDefined(legacy.value, source.value)),
    source: source.exists ? "settings" : legacy.exists ? "package" : "defaults",
    settingsPath,
    legacyOpenpress: legacy.value,
  };
}

export async function writeWorkspaceSettings(root, input) {
  const normalized = normalizeWorkspaceSettings(input);
  const target = workspaceSettingsPath(root);
  const temporary = `${target}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(temporary, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await fs.rename(temporary, target);
  return normalized;
}
```

`normalizeWorkspaceSettings` must validate `version`, Appearance enums, page geometry input, caption numbering, PDF filename, deploy adapter/source/project/safety values, and report invalid JSON paths.

- [ ] **Step 4: Make `loadConfig` consume the settings result**

Replace the direct package-field read with `loadWorkspaceSettings`. Keep existing normalized config fields so render/export callers do not change. Add `config.settings`, `config.appearance`, `config.settingsSource`, and `config.paths.settings`.

- [ ] **Step 5: Run focused tests**

Run: `node --test packages/core/tests/workspace-settings.test.mjs packages/core/tests/openpress-engine-runtime.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/engine/runtime/workspace-settings.mjs \
  packages/core/engine/runtime/workspace-settings.d.mts \
  packages/core/engine/runtime/config.mjs \
  packages/core/engine/runtime/config.d.mts \
  packages/core/tests/workspace-settings.test.mjs \
  packages/core/tests/openpress-engine-runtime.test.mjs
git commit -m "[core] add versioned workspace settings"
```

### Task 2: Legacy migration, doctor diagnostics, and new workspace scaffolds

**Files:**
- Modify: `packages/core/engine/commands/upgrade.mjs`
- Modify: `packages/core/engine/commands/doctor.mjs`
- Modify: `packages/core/engine/output/static-server.mjs`
- Modify: `packages/create/src/workspace.ts`
- Modify: `packages/create/tests/create.test.mjs`
- Modify: `packages/core/tests/framework-cli.test.mjs`
- Modify: `packages/core/tests/openpress-engine-runtime.test.mjs`
- Create: `openpress/settings.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: `loadWorkspaceSettings`, `writeWorkspaceSettings`, `workspaceSettingsPath`.
- Produces: `migrateLegacyOpenpressSettings(root, { dryRun })`.
- Produces: doctor report fields `settingsSource`, `legacySettings`, `settingsConflict`.

- [ ] **Step 1: Write migration and scaffold failures**

```js
test("upgrade migrates recognized package config and removes the legacy field", async () => {
  await writeJson(pkgPath, { name: "fixture", openpress: { pdf: { filename: "book.pdf" } } });
  const result = await migrateLegacyOpenpressSettings(root);
  assert.equal(result.status, "migrated");
  assert.equal((await readJson(settingsPath)).pdf.filename, "book.pdf");
  assert.equal("openpress" in await readJson(pkgPath), false);
});

test("upgrade preserves package config when an unknown field exists", async () => {
  await writeJson(pkgPath, { openpress: { customPluginConfig: true } });
  await assert.rejects(migrateLegacyOpenpressSettings(root), /customPluginConfig/);
  assert.deepEqual((await readJson(pkgPath)).openpress, { customPluginConfig: true });
});
```

Create package tests must assert that `openpress/settings.json` exists and the generated `package.json` has no `openpress` key.

- [ ] **Step 2: Run focused failures**

Run: `node --test packages/core/tests/framework-cli.test.mjs packages/core/tests/openpress-engine-runtime.test.mjs`

Run: `pnpm --filter @open-press/create test`

Expected: FAIL on absent migration and old scaffold shape.

- [ ] **Step 3: Implement migration and diagnostics**

`migrateLegacyOpenpressSettings` validates recognized keys (`page`, `captionNumbering`, `pdf`, `deploy`), detects value conflicts, atomically writes settings, then rewrites package JSON without `openpress`. Dry-run reports actions without writes. Doctor reports legacy-only and duplicate-source states even when the framework version is current.

- [ ] **Step 4: Update create scaffolding and dogfood source**

`writeWorkspaceFiles` creates `openpress/settings.json` with version 1 defaults. Remove the generated package `openpress` key. Move this repository's current `pdf` and `deploy` values into root `openpress/settings.json`, then remove `package.json#openpress`.

- [ ] **Step 5: Update workspace inference**

`inferWorkspaceRoot` accepts `openpress/settings.json` as a marker while keeping folder Press and legacy package detection.

- [ ] **Step 6: Run focused tests**

Run: `node --test packages/core/tests/framework-cli.test.mjs packages/core/tests/openpress-engine-runtime.test.mjs`

Run: `pnpm --filter @open-press/create test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/core/engine/commands/upgrade.mjs \
  packages/core/engine/commands/doctor.mjs \
  packages/core/engine/output/static-server.mjs \
  packages/create/src/workspace.ts packages/create/tests/create.test.mjs \
  packages/core/tests/framework-cli.test.mjs \
  packages/core/tests/openpress-engine-runtime.test.mjs \
  openpress/settings.json package.json
git commit -m "[core] migrate OpenPress config to settings"
```

### Task 3: Local settings endpoint and public runtime projection

**Files:**
- Create: `packages/core/engine/runtime/workspace-settings-endpoint.mjs`
- Modify: `packages/core/vite.config.ts`
- Modify: `packages/core/engine/output/static-server.mjs`
- Modify: `packages/core/engine/react/document-export.mjs`
- Test: `packages/core/tests/workspace-settings-endpoint.test.mjs`
- Modify: `packages/core/tests/framework-react-export.test.mjs`
- Modify: `packages/core/tests/framework-cli.test.mjs`

**Interfaces:**
- Produces: `handleWorkspaceSettingsRequest(req, res, { root, writable })`.
- Consumes: loader, writer, public projection, and local mutation guard.
- Produces URLs: `/__openpress/workspace-settings` for normalized local GET/PUT and `/openpress/settings.json` for the public projection.

- [ ] **Step 1: Write endpoint and export failures**

```js
test("PUT validates then persists settings", async () => {
  const response = await callEndpoint("PUT", {
    version: 1,
    appearance: { colorMode: "light", accent: "blue" },
  });
  assert.equal(response.status, 200);
  assert.equal((await readJson(settingsPath)).appearance.accent, "blue");
});

test("render writes only the public settings projection", async () => {
  await exportReactDocument(workspace);
  assert.deepEqual(await readJson(path.join(workspace, "public/openpress/settings.json")), {
    version: 1,
    appearance: { colorMode: "dark", accent: "amber" },
  });
});
```

- [ ] **Step 2: Run failures**

Run: `node --test packages/core/tests/workspace-settings-endpoint.test.mjs packages/core/tests/framework-react-export.test.mjs`

Expected: FAIL because the endpoint and projection do not exist.

- [ ] **Step 3: Implement shared endpoint**

GET returns `{ ok: true, settings, source, writable }`. PUT rejects when `writable` is false, parses a bounded JSON body, validates the full versioned object, writes atomically, and returns the normalized value. Invalid inputs return 400 with a JSON-path message.

- [ ] **Step 4: Wire Vite and static preview**

Vite routes both settings URLs before public static middleware. `/openpress/settings.json` dynamically returns `publicWorkspaceSettings(loadWorkspaceSettings(root).settings)`. The trusted local PUT route calls `rejectUntrustedLocalMutationRequest` and tracks the source mutation. Local static preview exposes the same local behavior; deployed static output has no server-side PUT.

- [ ] **Step 5: Emit public projection during render**

After `workspace.json`, write `settings.json` beside it using `publicWorkspaceSettings(entry.config.settings)`. Vite build copies it into `dist-react/openpress/settings.json`.

- [ ] **Step 6: Run focused tests**

Run: `node --test packages/core/tests/workspace-settings-endpoint.test.mjs packages/core/tests/framework-react-export.test.mjs packages/core/tests/framework-cli.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/core/engine/runtime/workspace-settings-endpoint.mjs \
  packages/core/vite.config.ts packages/core/engine/output/static-server.mjs \
  packages/core/engine/react/document-export.mjs \
  packages/core/tests/workspace-settings-endpoint.test.mjs \
  packages/core/tests/framework-react-export.test.mjs \
  packages/core/tests/framework-cli.test.mjs
git commit -m "[core] serve persistent workspace settings"
```

### Task 4: React settings provider and Appearance persistence

**Files:**
- Create: `packages/core/src/openpress/app/workspaceSettings.tsx`
- Modify: `packages/core/src/openpress/app/workspaceAppearance.ts`
- Modify: `packages/core/src/openpress/app/OpenPressApp.tsx`
- Modify: `packages/core/src/openpress/app/WorkspaceGalleryPage.tsx`
- Modify: `packages/core/src/openpress/workbench/Workbench.tsx`
- Modify: `packages/core/tests/openpress-workspace-appearance.test.ts`
- Modify: `packages/core/tests/e2e/reader-workbench-toolbar.spec.ts`

**Interfaces:**
- Produces: `<WorkspaceSettingsProvider>`, `useWorkspaceSettings()`, `updateAppearance(next)`.
- `useWorkspaceAppearance()` becomes a compatibility wrapper over the provider.
- Provider consumes `/openpress/settings.json` and writes `/__openpress/workspace-settings` only on local hosts.

- [ ] **Step 1: Write provider behavior failures**

```tsx
it("loads the shared appearance instead of localStorage", async () => {
  server.use(settingsResponse({ colorMode: "light", accent: "violet" }));
  render(<WorkspaceSettingsProvider><Harness /></WorkspaceSettingsProvider>);
  expect(await screen.findByTestId("appearance")).toHaveTextContent("light:violet");
});

it("rolls back an optimistic appearance when PUT fails", async () => {
  server.use(failingSettingsPut());
  const user = userEvent.setup();
  render(<WorkspaceSettingsProvider><Harness /></WorkspaceSettingsProvider>);
  await user.click(screen.getByRole("button", { name: "Blue" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to save");
  expect(screen.getByTestId("appearance")).toHaveTextContent("dark:amber");
});
```

- [ ] **Step 2: Run unit failures**

Run: `pnpm --filter @open-press/core test:unit -- openpress-workspace-appearance.test.ts`

Expected: FAIL because the provider does not exist.

- [ ] **Step 3: Implement provider and remove Appearance storage writes**

Provider fetches public settings, applies Appearance to document root, exposes pending/error/writable state, and performs optimistic PUT with rollback. `workspaceAppearance.ts` retains enums and `resolveWorkspaceColorMode`, but removes Appearance localStorage keys and persistence functions.

- [ ] **Step 4: Update Settings UI**

Appearance controls consume provider values. Disable controls when `writable` is false, expose pending state, and render an inline status message for save errors. Workbench and gallery share the same provider instance under `OpenPressApp`.

- [ ] **Step 5: Add two-context E2E**

Create two Playwright contexts against the same dev workspace. Change accent in context A, reload context B, and assert both document roots expose the same workspace accent. Assert seeded legacy localStorage cannot override source settings.

- [ ] **Step 6: Run focused tests**

Run: `pnpm --filter @open-press/core test:unit -- openpress-workspace-appearance.test.ts`

Run: `pnpm --dir packages/core test:e2e:reader -- reader-workbench-toolbar.spec.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/openpress/app/workspaceSettings.tsx \
  packages/core/src/openpress/app/workspaceAppearance.ts \
  packages/core/src/openpress/app/OpenPressApp.tsx \
  packages/core/src/openpress/app/WorkspaceGalleryPage.tsx \
  packages/core/src/openpress/workbench/Workbench.tsx \
  packages/core/tests/openpress-workspace-appearance.test.ts \
  packages/core/tests/e2e/reader-workbench-toolbar.spec.ts
git commit -m "[core] persist workspace appearance in settings"
```

### Task 5: Source-boundary documentation and full settings verification

**Files:**
- Modify: `AGENTS.md`
- Modify: `skills/openpress/SKILL.md`
- Modify: `docs/cli.md`
- Modify: `docs/press-tree.md`
- Create: `.changeset/steady-workspaces-share.md`

**Interfaces:**
- Documents `openpress/settings.json` as authored source and package config as legacy.
- Produces a patch Changeset for `@open-press/core`, `@open-press/create`, and `@open-press/cli` only if CLI package behavior changes.

- [ ] **Step 1: Update source-boundary and CLI docs**

Replace package-only config guidance with the settings source, precedence, migration command, and generated public projection. Keep `.openpress/` documented as generated/cache; it is unrelated to the authored `openpress/` directory.

- [ ] **Step 2: Add Changeset**

```md
---
"@open-press/core": patch
"@open-press/create": patch
---

Persist workspace settings in a versioned source file with legacy package migration.
```

- [ ] **Step 3: Run full verification**

Run: `npm run typecheck`

Run: `npm test`

Run: `npm run build`

Run: `pnpm --dir packages/core test:e2e:reader`

Expected: all commands exit 0. Existing bundle-size warnings are non-blocking.

- [ ] **Step 4: Confirm source and generated boundaries**

Run: `git status --short`

Expected: no `public/openpress`, `dist-react`, `.openpress`, or `.deploy` paths staged.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md skills/openpress/SKILL.md docs/cli.md docs/press-tree.md .changeset
git commit -m "[spec] document unified workspace settings"
```
