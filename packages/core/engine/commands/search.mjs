import { searchSourceText } from "../runtime/source-text-tools.mjs";

export async function run({ config, options }) {
  const query = searchQueryFromOptions(options);
  if (!query) {
    console.error("Usage: open-press search [path] <query> [--json] [--scope content|all] [--case-sensitive]");
    return 2;
  }

  const report = await searchSourceText({
    config,
    query,
    scope: options.scope ?? "content",
    caseSensitive: options.caseSensitive === true,
  });

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }

  console.log(`OpenPress search: "${query}" (${report.matchCount} matches)`);
  for (const match of report.matches) {
    console.log(`${match.id} ${match.path}:${match.line}:${match.column} ${match.preview}`);
  }
  return 0;
}

function searchQueryFromOptions(options) {
  const positional = options.positional ?? [];
  if (positional.length > 1) return positional.slice(1).join(" ");
  return positional[0] ?? "";
}
