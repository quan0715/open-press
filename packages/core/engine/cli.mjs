#!/usr/bin/env node

import * as deployCmd from "./commands/deploy.mjs";
import * as devCmd from "./commands/dev.mjs";
import * as doctorCmd from "./commands/doctor.mjs";
import * as exportCmd from "./commands/export.mjs";
import * as initCmd from "./commands/init.mjs";
import * as inspectCmd from "./commands/inspect.mjs";
import * as pdfCmd from "./commands/pdf.mjs";
import * as previewCmd from "./commands/preview.mjs";
import * as replaceCmd from "./commands/replace.mjs";
import * as renderCmd from "./commands/render.mjs";
import * as searchCmd from "./commands/search.mjs";
import * as typecheckCmd from "./commands/typecheck.mjs";
import * as upgradeCmd from "./commands/upgrade.mjs";
import * as validateCmd from "./commands/validate.mjs";
import { parseOptions } from "./commands/_shared.mjs";
import { loadConfig } from "./config.mjs";
import { listStylePackSkills } from "./init.mjs";
import { discoverWorkspace } from "./validation.mjs";

const COMMANDS = {
  init: initCmd,
  validate: validateCmd,
  inspect: inspectCmd,
  search: searchCmd,
  replace: replaceCmd,
  export: exportCmd,
  render: renderCmd,
  dev: devCmd,
  preview: previewCmd,
  typecheck: typecheckCmd,
  pdf: pdfCmd,
  deploy: deployCmd,
  doctor: doctorCmd,
  upgrade: upgradeCmd,
};

const args = process.argv.slice(2);
const command = args.shift();

try {
  const code = await main(command, args);
  process.exitCode = code;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

async function main(commandName, argv) {
  if (!commandName || ["-h", "--help"].includes(commandName)) {
    await printHelp();
    return commandName ? 0 : 2;
  }

  const handler = COMMANDS[commandName];
  if (!handler) {
    console.error(`Unknown command: ${commandName}`);
    await printHelp();
    return 2;
  }

  if (handler.needsWorkspace === false) {
    return handler.run({ argv });
  }

  const options = parseOptions(argv);
  const root = await discoverWorkspace(options.path ?? ".");
  const config = await loadConfig(root);
  return handler.run({ root, config, options, recurse: main });
}

async function printHelp() {
  const packs = await listStylePackSkills();
  const skillList = packs.length ? packs.join(" | ") : "(none installed)";
  console.log(`Usage: node engine/cli.mjs <command> [path] [options]

Commands:
  init <target> [--skill <name>] [--force]
  validate
  inspect [--json] [--no-build] [--dry-run]
  search [path] <query> [--json] [--scope content|all]
  replace [path] <from> <to> [--json] [--apply] [--scope content|all]
  export
  render --renderer react [--dry-run]
  preview --renderer react [--host 127.0.0.1] [--port 5173] [--no-build] [--dry-run]
  dev --renderer react [--host 127.0.0.1] [--port 5173] [--no-build] [--dry-run]
  typecheck
  pdf [--output <outputDir>/<pdf.filename>] [--no-build] [--dry-run]
  deploy --confirm [--dry-run]
  doctor [--json] [--no-cache]                          # version + skill staleness check
  upgrade [--dry-run] [--no-deps] [--no-skills] [--json] # apply updates; agent-driven

Style packs available for \`init --skill\`: ${skillList}
`);
}
