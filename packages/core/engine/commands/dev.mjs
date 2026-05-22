import { exportDocument } from "../document-export.mjs";
import { diagnose } from "./doctor.mjs";
import { CLI_ENTRY, formatNodeScriptCommand, runCommand } from "./_shared.mjs";

export async function run({ root, options }) {
  const renderer = options.renderer ?? "react";
  if (renderer !== "react") {
    console.error(`Unknown renderer: ${renderer}`);
    return 2;
  }
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? "5173";
  const url = `http://${host}:${port}/?dev=1`;
  if (options.dryRun) {
    console.log(`OpenPress dev URL: ${url}`);
    if (!options.noBuild) {
      console.log(`Command: ${formatNodeScriptCommand(root, CLI_ENTRY)} export .`);
    }
    console.log(`Command: npx vite --config vite.config.ts --host ${host} --port ${port}`);
    return 0;
  }
  if (!options.noBuild) {
    await exportDocument(root);
  }

  // One-line update notice (24h cached, network failure is silent).
  await printDoctorNoticeIfStale(root);

  console.log(`OpenPress dev: ${url}`);
  return runCommand("npx", ["vite", "--config", "vite.config.ts", "--host", host, "--port", port], root);
}

async function printDoctorNoticeIfStale(root) {
  try {
    const report = await diagnose(root);
    if (!report.stale) return;
    const parts = [];
    if (report.coreUpdateAvailable) {
      parts.push(`@open-press/core ${report.coreVersion} → ${report.coreLatest}`);
    }
    if (report.pendingMigrations.length > 0) {
      parts.push(`${report.pendingMigrations.length} migration note(s)`);
    }
    if (parts.length === 0) return;
    console.log(`○ open-press: ${parts.join(" · ")} — run \`npx open-press doctor\` for details.`);
  } catch {
    // Doctor is informational only; never block dev.
  }
}
