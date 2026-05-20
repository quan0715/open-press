import { migrateLegacyWorkspaceToReact } from "../react/migrate-to-react.mjs";
import { validateWorkspace } from "../validation.mjs";

export async function run({ root, config, options }) {
  const result = await migrateLegacyWorkspaceToReact(root, config, {
    dryRun: options.dryRun,
    force: options.force,
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  const verb = options.dryRun ? "would create" : "created";
  console.log(`QDoc migrate-to-react ${verb} ${result.files.length} paths from ${result.sourceFiles} legacy files:`);
  for (const file of result.files) {
    console.log(`  ${file.action.padEnd(5)} ${file.path}`);
  }

  if (!options.dryRun) {
    const report = await validateWorkspace(root);
    console.log(report.ok ? `QDoc validation OK\nChecked: ${report.checked.join(", ")}` : report.format());
    return report.ok ? 0 : 1;
  }
  return 0;
}
