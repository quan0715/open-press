import { replaceSourceText } from "../runtime/source-text-tools.mjs";

export async function run({ config, options }) {
  const args = replaceArgsFromOptions(options);
  if (!args) {
    console.error("Usage: node engine/cli.mjs replace [path] <from> <to> [--json] [--apply] [--scope content|all] [--include-code] [--case-sensitive]");
    return 2;
  }

  const report = await replaceSourceText({
    config,
    from: args.from,
    to: args.to,
    scope: options.scope ?? "content",
    caseSensitive: options.caseSensitive === true,
    includeCode: options.includeCode === true,
    apply: options.apply === true,
  });

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }

  console.log(`OpenPress replace ${report.applied ? "applied" : "preview"}: "${args.from}" -> "${args.to}" (${report.matchCount} matches in ${report.fileCount} files)`);
  if (!report.applied) console.log("No files written. Re-run with --apply to update sources.");
  for (const change of report.changes) {
    console.log(`${change.path}: ${change.replacements.length} replacements`);
  }
  return 0;
}

function replaceArgsFromOptions(options) {
  const positional = options.positional ?? [];
  const args = positional.length >= 3 ? positional.slice(1) : positional;
  if (args.length < 2) return null;
  return {
    from: args[0],
    to: args[1],
  };
}
