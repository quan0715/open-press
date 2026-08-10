import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { loadConfig } from "../engine/runtime/config.mjs";
import {
  loadWorkspaceSettings,
  normalizeWorkspaceSettings,
  publicWorkspaceSettings,
  workspaceSettingsPath,
  writeWorkspaceSettings,
} from "../engine/runtime/workspace-settings.mjs";
import { migrateLegacyOpenpressSettings } from "../engine/commands/upgrade.mjs";
import { diagnose } from "../engine/commands/doctor.mjs";
import { rmWithRetry } from "./_temp.mjs";

async function makeWorkspace() {
  return fs.mkdtemp(path.join(os.tmpdir(), "openpress-settings-"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("workspace settings default to versioned Appearance and delivery config", () => {
  const settings = normalizeWorkspaceSettings({});
  assert.deepEqual(settings, {
    version: 1,
    appearance: {
      colorMode: "dark",
      accent: "amber",
    },
    page: "a4",
    captionNumbering: {
      figure: "Figure",
      table: "Table",
      separator: " ",
    },
    pdf: {
      filename: "document.pdf",
    },
    deploy: {
      adapter: "cloudflare-pages",
      source: ".deploy/openpress",
      projectName: null,
      commitDirty: false,
      requiresConfirmation: true,
      presses: {},
    },
  });
});

test("settings file wins per field over legacy package config", async () => {
  const root = await makeWorkspace();
  try {
    await writeJson(path.join(root, "package.json"), {
      openpress: {
        captionNumbering: { figure: "Legacy Figure", table: "Legacy Table" },
        pdf: { filename: "legacy.pdf" },
        deploy: { projectName: "legacy-project" },
      },
    });
    await writeJson(workspaceSettingsPath(root), {
      version: 1,
      appearance: { colorMode: "light", accent: "violet" },
      captionNumbering: { figure: "圖" },
      pdf: { filename: "settings.pdf" },
    });

    const loaded = await loadWorkspaceSettings(root);
    const config = await loadConfig(root);

    assert.equal(loaded.source, "settings");
    assert.equal(loaded.hasLegacy, true);
    assert.equal(config.pdf.filename, "settings.pdf");
    assert.equal(config.deploy.projectName, "legacy-project");
    assert.deepEqual(config.captionNumbering, {
      figure: "圖",
      table: "Legacy Table",
      separator: " ",
    });
    assert.deepEqual(config.appearance, {
      colorMode: "light",
      accent: "violet",
    });
    assert.equal(config.paths.settings, workspaceSettingsPath(root));
  } finally {
    await rmWithRetry(root);
  }
});

test("legacy package config remains a fallback when settings are absent", async () => {
  const root = await makeWorkspace();
  try {
    await writeJson(path.join(root, "package.json"), {
      openpress: {
        page: "social-square",
        pdf: { filename: "legacy.pdf" },
      },
    });

    const loaded = await loadWorkspaceSettings(root);
    const config = await loadConfig(root);

    assert.equal(loaded.source, "package");
    assert.equal(config.pdf.filename, "legacy.pdf");
    assert.equal(config.page.id, "social-square");
  } finally {
    await rmWithRetry(root);
  }
});

test("unsupported settings versions fail with the source path", async () => {
  const root = await makeWorkspace();
  try {
    await writeJson(workspaceSettingsPath(root), { version: 2 });
    await assert.rejects(
      loadConfig(root),
      /openpress\/settings\.json.*version.*2/i,
    );
  } finally {
    await rmWithRetry(root);
  }
});

test("malformed settings report their source path", async () => {
  const root = await makeWorkspace();
  try {
    await fs.mkdir(path.dirname(workspaceSettingsPath(root)), { recursive: true });
    await fs.writeFile(workspaceSettingsPath(root), "{ nope", "utf8");
    await assert.rejects(
      loadWorkspaceSettings(root),
      /Malformed OpenPress settings.*openpress\/settings\.json/i,
    );
  } finally {
    await rmWithRetry(root);
  }
});

test("invalid Appearance values report their JSON path", () => {
  assert.throws(
    () => normalizeWorkspaceSettings({
      version: 1,
      appearance: { colorMode: "sepia", accent: "amber" },
    }),
    /appearance\.colorMode.*system.*dark.*light/i,
  );
  assert.throws(
    () => normalizeWorkspaceSettings({
      version: 1,
      appearance: { colorMode: "dark", accent: "orange" },
    }),
    /appearance\.accent.*amber.*blue.*emerald.*violet.*rose/i,
  );
});

test("public projection excludes operational settings", () => {
  const publicSettings = publicWorkspaceSettings(normalizeWorkspaceSettings({
    version: 1,
    appearance: { colorMode: "light", accent: "blue" },
    pdf: { filename: "private-name.pdf" },
    deploy: { projectName: "internal-project" },
  }));

  assert.deepEqual(publicSettings, {
    version: 1,
    appearance: {
      colorMode: "light",
      accent: "blue",
    },
  });
});

test("atomic writer creates a normalized settings source", async () => {
  const root = await makeWorkspace();
  try {
    const written = await writeWorkspaceSettings(root, {
      version: 1,
      appearance: { colorMode: "system", accent: "rose" },
      pdf: { filename: "book.pdf" },
    });
    const stored = JSON.parse(await fs.readFile(workspaceSettingsPath(root), "utf8"));

    assert.deepEqual(stored, written);
    assert.equal(stored.appearance.colorMode, "system");
    assert.equal(stored.pdf.filename, "book.pdf");
    assert.equal(stored.deploy.requiresConfirmation, true);
  } finally {
    await rmWithRetry(root);
  }
});

test("atomic writer serializes same-process concurrent writes", async () => {
  const root = await makeWorkspace();
  const originalNow = Date.now;
  Date.now = () => 1_234_567_890;
  try {
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, (_, index) => writeWorkspaceSettings(root, {
        version: 1,
        appearance: {
          colorMode: index % 2 === 0 ? "dark" : "light",
          accent: "amber",
        },
        pdf: { filename: `document-${index}.pdf` },
      })),
    );

    assert.equal(results.every((result) => result.status === "fulfilled"), true);
    const stored = await loadWorkspaceSettings(root);
    assert.match(stored.settings.pdf.filename, /^document-\d+\.pdf$/);
  } finally {
    Date.now = originalNow;
    await rmWithRetry(root);
  }
});

test("legacy migration writes settings and removes the package field", async () => {
  const root = await makeWorkspace();
  try {
    await writeJson(path.join(root, "package.json"), {
      name: "legacy-workspace",
      private: true,
      openpress: {
        captionNumbering: { figure: "圖", table: "表" },
        pdf: { filename: "book.pdf" },
      },
    });

    const result = await migrateLegacyOpenpressSettings(root);
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
    const settings = JSON.parse(await fs.readFile(workspaceSettingsPath(root), "utf8"));

    assert.equal(result.status, "migrated");
    assert.equal("openpress" in pkg, false);
    assert.equal(settings.pdf.filename, "book.pdf");
    assert.equal(settings.captionNumbering.figure, "圖");
    assert.equal(settings.captionNumbering.table, "表");
  } finally {
    await rmWithRetry(root);
  }
});

test("legacy migration dry-run reports without writing", async () => {
  const root = await makeWorkspace();
  try {
    await writeJson(path.join(root, "package.json"), {
      name: "legacy-workspace",
      openpress: { pdf: { filename: "book.pdf" } },
    });

    const result = await migrateLegacyOpenpressSettings(root, { dryRun: true });
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));

    assert.equal(result.status, "would-migrate");
    assert.equal(pkg.openpress.pdf.filename, "book.pdf");
    await assert.rejects(fs.access(workspaceSettingsPath(root)));
  } finally {
    await rmWithRetry(root);
  }
});

test("legacy migration preserves package config when an unknown field exists", async () => {
  const root = await makeWorkspace();
  try {
    await writeJson(path.join(root, "package.json"), {
      name: "legacy-workspace",
      openpress: {
        pdf: { filename: "book.pdf" },
        customPluginConfig: true,
      },
    });

    await assert.rejects(
      migrateLegacyOpenpressSettings(root),
      /customPluginConfig/,
    );
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
    assert.deepEqual(pkg.openpress, {
      pdf: { filename: "book.pdf" },
      customPluginConfig: true,
    });
    await assert.rejects(fs.access(workspaceSettingsPath(root)));
  } finally {
    await rmWithRetry(root);
  }
});

test("legacy migration stops when settings and package values conflict", async () => {
  const root = await makeWorkspace();
  try {
    await writeJson(path.join(root, "package.json"), {
      name: "legacy-workspace",
      openpress: { pdf: { filename: "legacy.pdf" } },
    });
    await writeJson(workspaceSettingsPath(root), {
      version: 1,
      pdf: { filename: "settings.pdf" },
    });

    await assert.rejects(
      migrateLegacyOpenpressSettings(root),
      /pdf\.filename.*conflict/i,
    );
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
    assert.equal(pkg.openpress.pdf.filename, "legacy.pdf");
  } finally {
    await rmWithRetry(root);
  }
});

test("doctor ignores cache entries written before workspace settings diagnostics", async () => {
  const root = await makeWorkspace();
  const originalFetch = globalThis.fetch;
  try {
    await writeJson(path.join(root, "package.json"), {
      name: "legacy-workspace",
      openpress: { pdf: { filename: "book.pdf" } },
    });
    await writeJson(path.join(root, ".openpress/cache/doctor.json"), {
      coreVersion: null,
      coreLatest: null,
      coreUpdateAvailable: false,
      skillsInstalled: [],
      skillsLockSource: null,
      stale: false,
      cachedAt: "2026-07-31T00:00:00.000Z",
    });
    globalThis.fetch = async () => ({
      ok: true,
      async json() {
        return { version: "3.1.0" };
      },
    });

    const report = await diagnose(root);
    assert.equal(report.settingsMigrationRequired, true);
    assert.equal(report.settingsSource, "package");
    assert.equal(report.stale, true);
  } finally {
    globalThis.fetch = originalFetch;
    await rmWithRetry(root);
  }
});
